/**
 * ScoreAnalyse — processus principal Electron.
 *
 * Lancement :  npm start [-- <dossier analyse>]
 *
 * Analyse ouverte au démarrage (ordre de précédence) :
 *   1. le dossier d'analyse passé en argument,
 *   2. la dernière analyse ouverte,
 *   3. aucune (utiliser le menu Analyse).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, protocol, screen, shell, WebContentsView } from 'electron'
import { Analyse } from './Analyse.js'
import { AppPrefs } from './AppPrefs.js'
import { createAnalyse, newAnalyseError } from './createAnalyse.js'
import { exportToHtml } from './exportHtml.js'
import { exportToPdf, exportToSvg } from './exportPdfSvg.js'
import { buildImageFromCode } from './scoreImage.js'
import { runCutter } from './cutter/runCutter.js'
import { Partage } from './Partage.js'
import { loadYAML } from './yaml.js'
import { APP_FOLDER, ASSETS_FOLDER, RENDERER_FOLDER } from './paths.js'
import { locale, t, LANGUAGES, currentLang } from './i18n.js'

const SMOKE = !!process.env.SA_SMOKE // lancement de contrôle, sans fenêtre visible

const APP_VERSION = (() => {
  try { return fs.readFileSync(path.join(APP_FOLDER, 'VERSION'), 'utf8').trim() } catch(err) { return '' }
})()

const MIME_TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css'
  , '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png'
  , '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp'
  , '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2'
}

// Nom de l'application (sinon « Electron » en développement). Le
// dossier des données utilisateur (prefs.json) est conservé.
// Lancement de contrôle : dossier temporaire, pour ne jamais toucher aux
// données de l'application (dernière analyse ouverte, etc.)
const USER_DATA_FOLDER = SMOKE
  ? fs.mkdtempSync(path.join(os.tmpdir(), 'score-analyse-smoke-'))
  : path.join(app.getPath('appData'), 'ScoreAnalyse')
app.setPath('userData', USER_DATA_FOLDER)
app.setName(t('ui.app.name'))
app.setAboutPanelOptions({applicationName: t('ui.app.name'), applicationVersion: APP_VERSION})

let mainWindow  = null
let current     = null    // {Analyse} analyse courante
let closeAllowed = false
let closeTimer = null
let justCut     = false   // la partition vient d'être découpée (message au rechargement)
let formShown   = false   // menu « Forme > Voir la forme » coché
let variableNames = {general: [], motifs: []} // menu « Outils > Variable »
let dynamicMenus = []     // menus « Options », « Marque »… décrits par le renderer (MenusBar.js)
let split       = null    // fenêtre scindée : {view, bar, ratio, dragging} (cf. openSplit)
let titlebarHeight = 29   // hauteur (px de la page) de la bande supérieure de la page (cf. layoutSplit)
let fitZoom     = 1       // zoom qui fait tenir les systèmes dans la fenêtre (cf. window:fitWidth)
let userZoom    = 1       // zoom choisi (menu « Fenêtre > Zoom », cf. changeZoom)

protocol.registerSchemesAsPrivileged([{
  scheme: 'sa',
  privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true}
}])

/* --- Analyse courante --- */

function setCurrent(folder){
  current = folder ? new Analyse(folder) : null
  if ( current ) AppPrefs.set({last_analyse_path: current.path})
  Partage.onCurrentChanged(current && current.path)
  updateMenu()
}

// Fichier de l'analyse courante écrit : envoyé aux spectateurs (partage)
function written(){
  current && Partage.changed(current.path)
}

function findStartAnalyse(){
  const args = process.argv.slice(app.isPackaged ? 1 : 2)
  for ( const arg of args ) {
    if ( arg.startsWith('-') ) continue
    const folder = path.resolve(arg)
    if ( Analyse.isConform(folder) ) return folder
  }
  const last = AppPrefs.get('last_analyse_path')
  if ( AppPrefs.get('load_last_analyse') && last && Analyse.isConform(last) ) return last
  return null
}

function requireCurrent(){
  if ( !current ) throw new Error(t('errors.no_analyse_open'))
  return current
}

/* --- Protocole sa:// ---
 *   sa://app/analyse/<chemin>  → fichier dans le dossier de l'analyse courante
 *   sa://app/assets/<chemin>   → fichier dans le dossier assets
 *   sa://app/<chemin>          → fichier du renderer
 */
function resolveRequestPath(url){
  const pathname = decodeURIComponent(new URL(url).pathname)
  let root, rel
  if ( pathname.startsWith('/analyse/') ) {
    if ( !current ) return null
    root = current.path ; rel = pathname.substring('/analyse/'.length)
  } else if ( pathname.startsWith('/assets/') ) {
    root = ASSETS_FOLDER ; rel = pathname.substring('/assets/'.length)
  } else {
    root = RENDERER_FOLDER ; rel = pathname.substring(1)
  }
  const full = path.resolve(root, rel)
  return full.startsWith(path.resolve(root) + path.sep) ? full : null
}

function registerProtocol(){
  protocol.handle('sa', async (request) => {
    const file = resolveRequestPath(request.url)
    if ( !file ) return new Response('Forbidden', {status: 403})
    try {
      const buffer = await fs.promises.readFile(file)
      const type = MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'
      return new Response(buffer, {headers: {'content-type': type, 'cache-control': 'no-store'}})
    } catch(err) {
      return new Response('Not found', {status: 404})
    }
  })
}

/* --- Fenêtre --- */

function createWindow(){
  mainWindow = new BrowserWindow({
      width:  1400
    , height: 1000
    , show:   !SMOKE || !!process.env.SA_SMOKE_SHOW
    , title:  t('ui.app.untitled')   // nom de la fenêtre (listes de capture : OBS…)
    // macOS : bande supérieure dessinée par la page (#titlebar), avec les
    // boutons de la fenêtre du système. Windows, Linux : barre de titre
    // du système, sans laquelle la barre des menus n'est pas affichée
    , ...(process.platform == 'darwin' ? {titleBarStyle: 'hiddenInset'} : {})
    , icon:   path.join(ASSETS_FOLDER, 'icons', 'icon.png')
    , webPreferences: {
          preload:          path.join(APP_FOLDER, 'main', 'preload.cjs')
        , contextIsolation: true
        , nodeIntegration:  false
        , sandbox:          true
      }
  })
  mainWindow.loadURL('sa://app/index.html')
  // Barre de titre sans titre (le <title> de la page ne s'y affiche pas)
  mainWindow.on('page-title-updated', (e) => e.preventDefault())

  mainWindow.on('close', (e) => {
    if ( closeAllowed || SMOKE ) return
    e.preventDefault()
    mainWindow.webContents.send('app:will-close')
    // Sécurité : si le renderer ne répond pas, on ferme quand même
    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => { closeAllowed = true ; mainWindow && mainWindow.close() }, 5000)
  })
  mainWindow.on('closed', () => { mainWindow = null ; split = null })
  // Fenêtre scindée : vues replacées ; refermée au rechargement de la
  // page (autre analyse, rechargement…)
  mainWindow.on('resize', layoutSplit)
  // Spectateur d'un partage : même partie de l'analyse que l'analyste
  mainWindow.on('resize', () => Partage.applyView())
  mainWindow.webContents.on('did-start-loading', () => split && closeSplit())

  if ( SMOKE ) {
    mainWindow.webContents.on('console-message', (e) => {
      console.log(`[renderer:${e.level}] ${e.message}  (${e.sourceId}:${e.lineNumber})`)
    })
    // Script de contrôle éventuel, joué dans le renderer après chargement
    if ( process.env.SA_SMOKE_JS ) {
      mainWindow.webContents.on('did-finish-load', () => {
        setTimeout(() => {
          mainWindow.webContents.executeJavaScript(fs.readFileSync(process.env.SA_SMOKE_JS, 'utf8'))
            .catch(err => console.log('[smoke] ERREUR', err.message))
        }, 1500)
      })
    }
    const duree = Number(process.env.SA_SMOKE) * 1000 || 6000
    // Capture de la fenêtre (PNG) juste avant l'arrêt
    process.env.SA_SMOKE_SHOT && setTimeout(() => {
      mainWindow.webContents.capturePage()
        .then(img => fs.writeFileSync(process.env.SA_SMOKE_SHOT, img.toPNG()))
        .catch(err => console.log('[smoke] ERREUR capture', err.message))
      // Fenêtre scindée : vue du bas dans <capture>-bas.png
      split && split.view.webContents.capturePage()
        .then(img => fs.writeFileSync(process.env.SA_SMOKE_SHOT.replace(/(\.png)?$/, '-bas.png'), img.toPNG()))
        .catch(err => console.log('[smoke] ERREUR capture', err.message))
    }, duree - 800)
    setTimeout(() => app.exit(0), duree)
  }
}

/* --- Zoom --- */

/**
 * Zoom de l'affichage de l'analyse (vue d'édition) : zoom qui fait
 * tenir les systèmes dans la fenêtre × zoom choisi (menu « Fenêtre >
 * Zoom »). La page garde la taille de ses éléments d'interface
 * (--ui-zoom, cf. renderer App.js). La vue de visualisation de la
 * fenêtre scindée garde son propre zoom (VIEWER_ZOOM).
 */
const ZOOM_STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2]
function applyZoom(){
  if ( !mainWindow ) return 1
  if ( Partage.spectator ) return mainWindow.webContents.getZoomFactor()
  const zoom = fitZoom * userZoom
  mainWindow.webContents.setZoomFactor(zoom)
  split && split.view.webContents.setZoomFactor(fitZoom * VIEWER_ZOOM)
  mainWindow.webContents.send('window:zoom', {zoom, userZoom})
  layoutSplit()
  return zoom
}
// +sens+ : 1 (augmenter) ou -1 (diminuer)
function changeZoom(sens){
  const i = ZOOM_STEPS.findIndex(z => Math.abs(z - userZoom) < 0.001)
  const next = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, (i < 0 ? ZOOM_STEPS.indexOf(1) : i) + sens))]
  if ( next == userZoom ) return
  userZoom = next
  applyZoom()
  // Gardé avec l'analyse
  current && current.saveZoom(userZoom)
}

/* --- Fenêtre scindée --- */

/**
 * « Scinder la fenêtre » : au-dessus de la page de l'application (vue
 * d'édition, en bas), une vue de visualisation de l'analyse enregistrée
 * (index.html?mirror=1&measure=N, cf. renderer Split.js), séparée par
 * une barre que l'on déplace (splitter.html). Aucune synchronisation :
 * la vue de visualisation se recharge par son bouton « Actualiser ».
 */
const SPLIT_BAR = 6
// Zoom de la vue de visualisation par rapport à la vue d'édition (dézoomée)
const VIEWER_ZOOM = 0.75
// Ouverture (+measure+ : numéro de la mesure à afficher en haut) ou
// fermeture
function toggleSplit(measure){
  split ? closeSplit() : openSplit(measure)
}
// Menu « Fenêtre > Scinder la fenêtre » : l'ouverture passe par la page
// (demande du numéro de mesure, cf. Split.toggle)
function menuToggleSplit(){
  split ? closeSplit() : (mainWindow && mainWindow.webContents.send('menu', 'toggleSplit'))
}
function openSplit(measure){
  if ( !current || !mainWindow ) return
  const webPreferences = {
      preload:          path.join(APP_FOLDER, 'main', 'preload.cjs')
    , contextIsolation: true
    , nodeIntegration:  false
    , sandbox:          true
  }
  const view = new WebContentsView({webPreferences})
  const bar  = new WebContentsView({webPreferences})
  bar.setBackgroundColor('#00000000')
  mainWindow.contentView.addChildView(view)
  mainWindow.contentView.addChildView(bar)
  // Le focus reste à la vue d'édition (p.e. pour refermer aussitôt
  // avec le même raccourci)
  const keepFocus = () => mainWindow && mainWindow.webContents.focus()
  ;[view, bar].forEach(v => ['focus', 'did-finish-load'].forEach(ev => v.webContents.on(ev, keepFocus)))
  SMOKE && view.webContents.on('console-message', (e) => console.log(`[mirror:${e.level}] ${e.message}  (${e.sourceId}:${e.lineNumber})`))
  // Lancement de contrôle : script joué dans la vue de visualisation
  SMOKE && process.env.SA_SMOKE_MIRROR_JS && view.webContents.on('did-finish-load', () => {
    setTimeout(() => view.webContents.executeJavaScript(fs.readFileSync(process.env.SA_SMOKE_MIRROR_JS, 'utf8')).catch(err => console.log('[smoke] ERREUR', err.message)), 1500)
  })
  view.webContents.setZoomFactor(fitZoom * VIEWER_ZOOM)
  // (autre hôte que la vue d'édition : zoom propre, cf. VIEWER_ZOOM)
  view.webContents.loadURL('sa://viewer/index.html?mirror=1' + (measure ? `&measure=${Number(measure)}` : ''))
  bar.webContents.loadURL('sa://app/splitter.html')
  // Vue d'édition plus grande
  split = {view, bar, ratio: 0.48, dragging: false}
  layoutSplit()
  sendSplitState()
  keepFocus()
}
function closeSplit(){
  if ( !split ) return
  const {view, bar} = split
  split = null
  if ( mainWindow ) {
    mainWindow.contentView.removeChildView(view)
    mainWindow.contentView.removeChildView(bar)
  }
  view.webContents.close()
  bar.webContents.close()
  mainWindow && mainWindow.webContents.send('split:inset', {inset: 0, zoom: 1})
  sendSplitState()
}
// Vue de visualisation (sous la bande supérieure de la page) et barre
// placées selon split.ratio ; la page réserve en haut la place cachée
function layoutSplit(){
  if ( !split || !mainWindow ) return
  const {width, height} = mainWindow.getContentBounds()
  const zoom = mainWindow.webContents.getZoomFactor()
  const band = Math.round(titlebarHeight * zoom)
  const top = Math.round(Math.min(height - 120, Math.max(band + 60, height * split.ratio)))
  split.view.setBounds({x: 0, y: band, width, height: Math.max(0, top - band)})
  split.bar.setBounds(split.dragging ? {x: 0, y: 0, width, height} : {x: 0, y: top, width, height: SPLIT_BAR})
  mainWindow.webContents.send('split:inset', {inset: top + SPLIT_BAR - band, zoom})
}
function sendSplitState(){
  mainWindow && mainWindow.webContents.send('split:state', {on: !!split})
  buildMenu()
}

// Raccourci géré par le renderer (registerAccelerator: false) : sur
// macOS, le menu y répond quand même, y compris dans un champ de saisie
// (Maj + O tapé dans un champ ouvrait la boite à outils). Clic seul.
function byClick(fn){
  return (item, win, event) => (event && event.triggeredByAccelerator) || fn()
}

function sendMenuCommand(command){
  mainWindow && mainWindow.webContents.send('menu', command)
}

// Pas d'ouverture du Finder en lancement de contrôle
function showInFinder(p, reveal){
  if ( SMOKE ) return
  reveal ? shell.showItemInFolder(p) : shell.openPath(p)
}

// Manuel d'utilisation (HTML ou ePub), ouvert par l'application du système
function openManual(ext){
  const file = path.join(APP_FOLDER, 'Manuels', 'Manuel', `Manuel.${ext}`)
  if ( !fs.existsSync(file) ) return dialog.showErrorBox(t('ui.menu.help'), t('errors.manual_not_found', {path: file}))
  showInFinder(file)
}

// Manuel HTML ouvert dans une fenêtre de l'application, à la section +anchor+
function openManualAt(anchor){
  const file = path.join(APP_FOLDER, 'Manuels', 'Manuel', 'Manuel.html')
  if ( !fs.existsSync(file) ) throw new Error(t('errors.manual_not_found', {path: file}))
  const win = new BrowserWindow({width: 1000, height: 900, title: t('ui.menu.help'), icon: path.join(ASSETS_FOLDER, 'icons', 'icon.png')})
  win.loadFile(file, {hash: anchor})
}

function reloadWindow(){
  mainWindow && mainWindow.webContents.reload()
}

/* --- Menu de l'application --- */

/**
 * Choix de la langue (menu « Langue ») : enregistrée, puis l'application
 * est relancée (l'analyse modifiée est enregistrée à la fermeture)
 */
function chooseLanguage(code){
  if ( code == currentLang() ) return
  AppPrefs.set({lang: code})
  app.relaunch()
  app.quit()
}

function buildMenu(){
  const isMac = process.platform == 'darwin'
  const template = [
    // Menus du système avec libellés localisés (sinon, langue d'Electron)
    ...(isMac ? [{
        label: app.name
      , submenu: [
            {role: 'about',      label: t('ui.menu.about', {name: app.name})}
          , {type: 'separator'}
          , {role: 'hide',       label: t('ui.menu.hide', {name: app.name})}
          , {role: 'hideOthers', label: t('ui.menu.hide_others')}
          , {role: 'unhide',     label: t('ui.menu.unhide')}
          , {type: 'separator'}
          , {role: 'quit',       label: t('ui.menu.quit', {name: app.name})}
        ]
    }] : []),
    {
      label: t('ui.menu.file'),
      submenu: [
          {label: t('ui.menu.new_analyse'),     accelerator: 'CmdOrCtrl+N', click: () => sendMenuCommand('newAnalyse')}
        , {label: t('ui.menu.open_analyse'),    accelerator: 'CmdOrCtrl+O', click: () => sendMenuCommand('openAnalyse')}
        , {label: t('ui.menu.reload_analyse'),  accelerator: 'CmdOrCtrl+R', click: () => sendMenuCommand('reloadAnalyse')}
        , {label: t('ui.menu.close_analyse'),   id: 'closeAnalyse', click: () => sendMenuCommand('closeAnalyse')}
        , {type: 'separator'}
        , {label: t('ui.menu.save'),            accelerator: 'CmdOrCtrl+S', click: () => sendMenuCommand('save')}
        , {type: 'separator'}
        , {label: t('ui.menu.infos'),           accelerator: 'CmdOrCtrl+Shift+I', click: () => sendMenuCommand('infosAnalyse')}
        , {label: t('ui.menu.history'),         click: () => sendMenuCommand('history')}
        , {type: 'separator'}
        , {label: t('ui.menu.export'),          accelerator: 'CmdOrCtrl+E', click: () => sendMenuCommand('export')}
        , {label: t('ui.menu.show_in_finder'),  click: () => current && showInFinder(current.path, true)}
        , {type: 'separator'}
        , {label: t('ui.menu.help'), submenu: [
              {label: t('ui.menu.help_html'),   click: () => openManual('html')}
            , {label: t('ui.menu.help_epub'),   click: () => openManual('epub')}
          ]}
        , {type: 'separator'}
        , {label: t('ui.menu.prefs'),           accelerator: 'CmdOrCtrl+,', click: () => sendMenuCommand('prefs')}
        , {label: t('ui.menu.language'),        submenu: Object.entries(LANGUAGES).map(([code, name]) => ({
              label: name, type: 'radio', checked: code == currentLang(), click: () => chooseLanguage(code)
          }))}
        , ...(isMac ? [] : [{type: 'separator'}, {role: 'quit', label: t('ui.menu.quit', {name: app.name})}])
      ]
    },
    {
      // Pas de rôle undo/redo : ⌘Z est géré par l'application
      label: t('ui.menu.edit'),
      submenu: [
          {role: 'cut',       label: t('ui.menu.cut')}
        , {role: 'copy',      label: t('ui.menu.copy')}
        , {role: 'paste',     label: t('ui.menu.paste')}
        , {role: 'selectAll', label: t('ui.menu.select_all')}
        , ...dynamicSubmenus('edit')
      ]
    },
    ...dynamicMenus.filter(m => !m.parent).map(m => ({
        label:   m.label
      , submenu: [...dynamicItems(m), ...dynamicSubmenus(m.id)]
    })),
    {
      label: t('ui.menu.form_menu'),
      submenu: [
          {label: t('ui.menu.goto_measure'),    accelerator: 'Alt+G', click: () => sendMenuCommand('gotoMeasure')}
        , {label: t('ui.menu.show_form'),       type: 'checkbox', checked: formShown, click: (item) => {
              formShown = item.checked
              sendMenuCommand(formShown ? 'showForm' : 'hideForm')
          }}
        , {type: 'separator'}
        , {label: t('ui.menu.build_form'),      click: () => sendMenuCommand('buildForm')}
      ]
    },
    {
      label: t('ui.menu.tools_menu'),
      submenu: [
          {label: t('ui.menu.tools'),           accelerator: 'Shift+O', registerAccelerator: false, click: byClick(() => sendMenuCommand('toolsPanel'))}
        , {label: t('ui.menu.animate'),         click: () => sendMenuCommand('animate')}
        , {label: t('ui.menu.variable'),        submenu: variablesSubmenu()}
        , {label: t('ui.menu.partage'),         submenu: [
              {label: t('ui.menu.partage_invite'), id: 'partageInvite', enabled: !!current && !Partage.spectator, click: () => sendMenuCommand('partageInvite')}
            , {label: t('ui.menu.partage_stop'),   enabled: !!Partage.sharing, click: () => Partage.stop()}
            , {type: 'separator'}
            , {label: t('ui.menu.partage_join'),   click: () => sendMenuCommand('partageJoin')}
          ]}
        , {type: 'separator'}
        , {label: t('ui.menu.cut_score'),       id: 'cutScore',    click: () => sendMenuCommand('cutScore')}
        , {label: t('ui.menu.renumber_measures'), id: 'renumberMeasures', click: () => sendMenuCommand('renumberMeasures')}
        , {label: t('ui.menu.number_score'),    id: 'numberScore', click: () => sendMenuCommand('numberScore')}
        , {type: 'separator'}
        , {label: t('ui.menu.remove_blanks'),   id: 'removeBlanks', click: () => sendMenuCommand('removeBlanks')}
      ]
    },
    {
        role:  'windowMenu'
      , label: t('ui.menu.window')
      , submenu: [
            {role: 'minimize', label: t('ui.menu.minimize')}
          , {role: 'zoom',     label: t('ui.menu.zoom')}
          , {role: 'togglefullscreen', label: t('ui.menu.fullscreen')}
          , {type: 'separator'}
          , {label: t('ui.menu.zoom_menu'), submenu: [
                {label: t('ui.menu.zoom_in'),  id: 'zoomIn', enabled: !!current, accelerator: 'CmdOrCtrl+Plus', click: () => changeZoom(1)}
              , {label: t('ui.menu.zoom_out'), id: 'zoomOut', enabled: !!current, accelerator: 'CmdOrCtrl+-',    click: () => changeZoom(-1)}
                // (claviers où « + » demande Maj)
              , {label: t('ui.menu.zoom_in'),  id: 'zoomIn2', enabled: !!current, accelerator: 'CmdOrCtrl+=', visible: false, click: () => changeZoom(1)}
            ]}
          , {type: 'separator'}
          , {label: t('ui.menu.split_window'), id: 'splitWindow', type: 'checkbox', checked: !!split, enabled: !!current, accelerator: 'CmdOrCtrl+/', registerAccelerator: false, click: byClick(menuToggleSplit)}
          , {label: t('ui.menu.refresh_view'), enabled: !!split, click: () => split && split.view.webContents.send('split:refresh')}
          , ...(isMac ? [{type: 'separator'}, {role: 'front', label: t('ui.menu.front')}] : [{role: 'close', label: t('ui.menu.close_window')}])
        ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  updateMenu()
}

/**
 * Sous-menu « Outils > Variable » : variables des infos de l'analyse,
 * puis celles des motifs. Choisie : `{<variable>}` copié dans le
 * presse-papier (par le renderer, cf. Variables.copy)
 */
function variablesSubmenu(){
  const item = name => ({label: name, click: () => mainWindow && mainWindow.webContents.send('menu:variable', name)})
  const {general, motifs} = variableNames
  if ( !general.length && !motifs.length ) return [{label: t('ui.menu.no_variable'), enabled: false}]
  return [...general.map(item), ...(motifs.length ? [{type: 'separator'}, ...motifs.map(item)] : [])]
}

// Éléments d'un menu décrit par le renderer (cf. MenusBar.js)
function dynamicItems(m){
  return m.items.map(item => {
    // Sous-menu placé à cet endroit (et non à la fin, cf. dynamicSubmenus)
    if ( item.submenu ) {
      const sub = dynamicMenus.find(d => d.id == item.submenu)
      return sub && {label: sub.label, submenu: dynamicItems(sub)}
    }
    return item.type ? item : {
        label:   item.label
      , enabled: item.enabled
      // Raccourci affiché à droite, géré par le renderer
      , ...(item.accelerator ? {accelerator: item.accelerator, registerAccelerator: false} : {})
      , ...(item.checkbox ? {type: 'checkbox', checked: item.checked} : {})
      , click:   byClick(() => mainWindow && mainWindow.webContents.send('menu:dynamic', {id: m.id, index: item.index}))
      }
  }).filter(item => item)
}

// Menus du renderer placés en sous-menus de +parent+ (après un séparateur)
function dynamicSubmenus(parent){
  const placed = new Set(dynamicMenus.flatMap(m => m.items.filter(i => i.submenu).map(i => i.submenu)))
  const subs = dynamicMenus.filter(m => m.parent == parent && !placed.has(m.id))
  if ( !subs.length ) return []
  return [{type: 'separator'}, ...subs.map(m => ({label: m.label, submenu: dynamicItems(m)}))]
}

// Menus inaccessibles sans analyse courante
function updateMenu(){
  const menu = Menu.getApplicationMenu()
  if ( !menu ) return
  ;['closeAnalyse', 'cutScore', 'renumberMeasures', 'numberScore', 'removeBlanks', 'splitWindow', 'zoomIn', 'zoomOut', 'zoomIn2'].forEach(id => {
    const item = menu.getMenuItemById(id)
    if ( item ) item.enabled = !!current
  })
  const invite = menu.getMenuItemById('partageInvite')
  if ( invite ) invite.enabled = !!current && !Partage.spectator
}

/* --- Fenêtres de choix (dernier dossier mémorisé) --- */

async function showOpenDialog(options){
  const last = AppPrefs.get('last_dialog_folder')
  if ( !options.defaultPath && last && fs.existsSync(last) ) options.defaultPath = last
  const res = await dialog.showOpenDialog(mainWindow, options)
  if ( !res.canceled && res.filePaths.length ) {
    AppPrefs.set({last_dialog_folder: path.dirname(res.filePaths[0])})
  }
  return res
}

/* --- IPC --- */

/**
 * Enregistre un handler qui renvoie toujours {ok, data|error} pour que
 * le renderer puisse afficher l'erreur.
 */
function handle(channel, method){
  ipcMain.handle(channel, async (e, args) => {
    try {
      return {ok: true, data: await method(args || {})}
    } catch(err) {
      console.error(`[${channel}]`, err)
      return {ok: false, error: err.message}
    }
  })
}

function registerIpc(){

  // Textes localisés, demandés de façon synchrone par preload.cjs
  ipcMain.on('app:locale', (e) => { e.returnValue = locale() })

  /*
   * Fenêtre scindée (cf. openSplit). Ces canaux ont besoin de la vue
   * émettrice.
   */
  const splitHandle = (channel, method) => ipcMain.handle(channel, (e, args) => {
    try { return {ok: true, data: method(e.sender, args || {})} }
    catch(err) { return {ok: false, error: err.message} }
  })
  splitHandle('split:toggle', (wc, {measure}) => toggleSplit(measure))
  // Vue de visualisation : zoom de la vue d'édition (cf. window:fitWidth)
  splitHandle('split:zoom', (wc) => { const z = fitZoom * VIEWER_ZOOM ; wc.setZoomFactor(z) ; return z })
  // Vue de visualisation : données enregistrées de l'analyse, sans les
  // opérations de l'ouverture (copie de sauvegarde, numéros de mesure
  // importés)
  splitHandle('split:getCurrent', () => current ? new Analyse(current.path).allDataForClient() : null)
  // Hauteur (px de la page) de la bande supérieure de la vue d'édition
  splitHandle('split:titlebar', (wc, {height}) => { titlebarHeight = Number(height) || titlebarHeight ; layoutSplit() })
  splitHandle('split:dragStart', () => { if ( split ) { split.dragging = true ; layoutSplit() } })
  splitHandle('split:drag', (wc, {y}) => {
    if ( !split || !mainWindow ) return
    split.ratio = y / mainWindow.getContentBounds().height
    layoutSplit()
  })
  splitHandle('split:dragEnd', () => { if ( split ) { split.dragging = false ; layoutSplit() } })

  handle('analyse:getCurrent', () => {
    if ( !current ) return null
    // Instance vierge pour relire les fichiers (rechargement de la page)
    current = new Analyse(current.path)
    current.makeBackup()
    current.importMeasures()
    const data = Object.assign(current.allDataForClient(), {just_cut: justCut})
    justCut = false
    // Analyse suivie (spectateur d'un partage) : lecture seule
    data.partage = Partage.spectator ? {pseudo: Partage.following.pseudo, titre: Partage.following.titre} : null
    written()
    return data
  })

  handle('analyse:saveInfos', ({infos}) => {
    const analyse = requireCurrent()
    if ( Partage.spectator ) return
    analyse.infos = Object.assign({}, infos, {updated_at: Math.round(Date.now() / 1000)})
    analyse.saveInfos()
    written()
  })

  handle('analyse:savePreferences', ({preferences}) => {
    const analyse = requireCurrent()
    if ( Partage.spectator ) return
    analyse.preferences = preferences
    analyse.savePreferences()
    written()
  })

  handle('analyse:saveWindowSize', ({width, height}) => {
    if ( Partage.spectator ) return
    requireCurrent().saveWindowSize(Math.round(width), Math.round(height))
  })

  handle('analyse:saveTags', ({tags}) => {
    const analyse = requireCurrent()
    if ( Partage.spectator ) return
    analyse.tags = tags
    analyse.saveTags()
    written()
  })

  handle('history:load',   () => requireCurrent().loadHistory())
  handle('history:append', ({step}) => requireCurrent().appendHistory(step))

  handle('analyse:refresh', () => {
    return requireCurrent().updateSystems()
  })

  handle('analyse:open', async () => {
    const res = await showOpenDialog({
        title: t('ui.dialogs.choose_analyse_folder')
      , properties: ['openDirectory']
    })
    if ( res.canceled || !res.filePaths.length ) return false
    const folder = res.filePaths[0]
    if ( !Analyse.isConform(folder) ) {
      throw new Error(t('errors.not_an_analyse_folder', {folder}))
    }
    setCurrent(folder)
    setTimeout(reloadWindow, 10)
    return true
  })

  // Fermeture de l'analyse courante dans l'application (aucun fichier
  // touché) : retour à la table vide
  handle('analyse:close', () => {
    setCurrent(null)
    // Pas de réouverture au prochain lancement
    AppPrefs.set({last_analyse_path: null})
    setTimeout(reloadWindow, 10)
  })

  handle('analyse:reload', () => {
    setTimeout(reloadWindow, 10)
  })

  // Nom du dossier d'une nouvelle analyse : message d'erreur ou null
  handle('analyse:checkNew', ({folder, id}) => newAnalyseError(folder, id))

  /*
   * Partition d'une nouvelle analyse : null (donnée plus tard) ou {pdf,
   * cut, countFirst} (découpe tout de suite ou non ; première mesure
   * comptée)
   */
  handle('dialog:newAnalyseScore', async () => {
    const ask = await dialog.showMessageBox(mainWindow, {
        type:      'question'
      , message:   t('ui.dialogs.new_score')
      , detail:    t('ui.dialogs.new_score_detail')
      , buttons:   [t('ui.dialogs.later'), t('ui.dialogs.new_score_choose')]
      , defaultId: 1
      , cancelId:  0
    })
    if ( ask.response !== 1 ) return null
    const res = await showOpenDialog({
        title:      t('ui.dialogs.choose_pdf')
      , properties: ['openFile']
      , filters:    [{name: t('ui.dialogs.pdf_filter'), extensions: ['pdf']}]
    })
    if ( res.canceled || !res.filePaths.length ) return null
    const cut = await dialog.showMessageBox(mainWindow, {
        type:      'question'
      , message:   t('ui.dialogs.cut_now')
      , detail:    t('ui.dialogs.cut_now_detail')
      , buttons:   [t('ui.dialogs.later'), t('ui.dialogs.cut_now_yes')]
      , defaultId: 1
      , cancelId:  0
    })
    if ( cut.response !== 1 ) return {pdf: res.filePaths[0], cut: false}
    const countFirst = await askCountFirstMeasure()
    return {pdf: res.filePaths[0], cut: null !== countFirst, countFirst: !!countFirst}
  })

  /*
   * Création d'une analyse : dossier, partition (copiée dans le dossier
   * de l'analyse) et, si demandé, découpe de la partition
   */
  handle('analyse:create', async (data) => {
    const analyse = createAnalyse(data, APP_VERSION)
    setCurrent(analyse.path)
    if ( data.score && data.cut ) {
      const out = fs.mkdtempSync(path.join(os.tmpdir(), 'decoupe-'))
      try {
        await runCutter({pdf: data.score, out, dpi: 300, quality: 90, countFirst: data.countFirst})
        analyse.replaceSystems(out)
        justCut = true
      } finally {
        fs.rmSync(out, {recursive: true, force: true})
      }
    }
    setTimeout(reloadWindow, 10)
    return analyse.path
  })

  /*
   * Découpe de la partition : choix du PDF (null si annulé), puis
   * découpe, qui remplace les systèmes et leurs numéros de mesure.
   */
  handle('analyse:chooseScorePdf', async () => {
    const analyse = requireCurrent()
    const res = await dialog.showOpenDialog(mainWindow, {
        title:       t('ui.dialogs.choose_pdf')
      , defaultPath: analyse.path
      , properties:  ['openFile']
      , filters:     [{name: t('ui.dialogs.pdf_filter'), extensions: ['pdf']}]
    })
    if ( res.canceled || !res.filePaths.length ) return null
    if ( analyse.systemsInFolder.length ) {
      const {response} = await dialog.showMessageBox(mainWindow, {
          type:      'warning'
        , message:   t('ui.dialogs.replace_systems')
        , detail:    t('ui.dialogs.replace_systems_detail', {count: analyse.systemsInFolder.length})
        , buttons:   [t('ui.buttons.cancel'), t('ui.buttons.replace')]
        , defaultId: 1
        , cancelId:  0
      })
      if ( response !== 1 ) return null
    }
    return res.filePaths[0]
  })

  // Compter et numéroter la première mesure (non : anacrouse) ?
  // @return true, false ou null (annulation)
  handle('dialog:countFirstMeasure', askCountFirstMeasure)

  handle('analyse:cutScore', async ({pdf, countFirst}) => {
    const analyse = requireCurrent()
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'decoupe-'))
    try {
      await runCutter({pdf, out, dpi: 300, quality: 90, countFirst})
      analyse.replaceSystems(out)
      justCut = true
    } finally {
      fs.rmSync(out, {recursive: true, force: true})
    }
    setTimeout(reloadWindow, 10)
  })

  handle('analyse:numberScore', async ({countFirst}) => {
    const analyse = requireCurrent()
    const images = analyse.systemsInFolder
    if ( !images.length ) throw new Error(t('errors.no_systems_to_number'))
    await runCutter({mode: 'numerotation', folder: analyse.systemsFolder, images, out: analyse.systemsFolder, countFirst})
    setTimeout(reloadWindow, 10)
  })

  handle('dialog:chooseFolder', async ({title}) => {
    const res = await showOpenDialog({
        title: title || t('ui.dialogs.choose_folder')
      , properties: ['openDirectory', 'createDirectory']
    })
    return res.canceled ? null : res.filePaths[0]
  })

  handle('analyse:exportHtml', ({code_html}) => {
    const htmlPath = exportToHtml(requireCurrent(), code_html)
    showInFinder(htmlPath, true)
    return htmlPath
  })

  handle('analyse:exportPdf', async (data) => {
    const pdfPath = await exportToPdf(requireCurrent(), data)
    showInFinder(pdfPath, true)
    return pdfPath
  })

  handle('analyse:exportSvg', ({pages}) => {
    const folder = exportToSvg(requireCurrent(), pages)
    showInFinder(folder, true)
    return folder
  })

  // Types de liaison (cf. renderer/js/LiaisonEditor.js), communs à
  // toutes les analyses
  handle('liaisons:getTypes', () => AppPrefs.get('link_types') || {})
  handle('liaisons:saveTypes', ({types}) => AppPrefs.set({link_types: types}))
  handle('liaisons:confirmReplace', async ({name}) => {
    const {response} = await dialog.showMessageBox(mainWindow, {
        type:      'question'
      , message:   t('ui.dialogs.replace_liaison', {name})
      , buttons:   [t('ui.dialogs.replace'), t('ui.buttons.cancel')]
      , defaultId: 0
      , cancelId:  1
    })
    return response == 0
  })

  // Épaisseur de bord par défaut changée (cf. PreferencesPanel#applyBorder) :
  // l'appliquer aussi aux marques qui ont la leur ? « Non » par défaut
  handle('prefs:confirmBorderOwn', async () => {
    const {response} = await dialog.showMessageBox(mainWindow, {
        type:      'question'
      , message:   t('ui.dialogs.border_own')
      , buttons:   [t('ui.buttons.answer_no'), t('ui.buttons.answer_yes')]
      , defaultId: 0
      , cancelId:  0
    })
    return response == 1
  })

  handle('app:themes', () => {
    const folder = path.join(ASSETS_FOLDER, 'themes')
    if ( !fs.existsSync(folder) ) return []
    return fs.readdirSync(folder).filter(n => n.endsWith('.yaml')).sort().map(n => {
      return Object.assign(loadYAML(path.join(folder, n), {}) || {}, {name: path.basename(n, '.yaml')})
    })
  })

  handle('tools:buildImage', ({code}) => {
    return buildImageFromCode(requireCurrent(), code)
  })

  /*
   * Menu contextuel d'un système. Renvoie la commande à exécuter par le
   * renderer (null si aucune).
   */
  handle('menu:systemContext', ({image, locked}) => {
    const file = path.join(requireCurrent().systemsFolder, path.basename(image))
    return new Promise(resolve => {
      const menu = Menu.buildFromTemplate([
          {label: t(locked ? 'ui.system_menu.unlock' : 'ui.system_menu.lock'), click: () => resolve('toggleLock')}
        , {type: 'separator'}
        , {label: t('ui.system_menu.open_image'),  click: () => showInFinder(file)}
        , {label: t('ui.system_menu.show_image'),  click: () => showInFinder(file, true)}
      ])
      // La fermeture du menu peut précéder le clic sur un de ses items
      menu.popup({window: mainWindow, callback: () => setTimeout(() => resolve(null), 200)})
    })
  })

  // Image d'un extrait de partition (PNG) enregistrée dans le dossier
  // images de l'analyse ; retourne son nom
  handle('extract:save', ({id, data}) => {
    const analyse = requireCurrent()
    fs.mkdirSync(analyse.imagesFolder, {recursive: true})
    const name = `extrait-${Number(id)}.png`
    fs.writeFileSync(path.join(analyse.imagesFolder, name), Buffer.from(String(data).replace(/^data:image\/png;base64,/, ''), 'base64'))
    written()
    return name
  })

  // « Ouvrir l'image » d'un extrait : ouverte par l'application du système
  handle('extract:open', ({file}) => {
    showInFinder(path.join(requireCurrent().imagesFolder, path.basename(file)))
  })

  // Menu contextuel natif décrit par le renderer : +items+ = [{label,
  // value, enabled}] ou {type: 'separator'} ; retourne la valeur choisie
  handle('menu:popup', ({items}) => {
    return new Promise(resolve => {
      const menu = Menu.buildFromTemplate(items.map(item => item.type == 'separator' ? item : {
          label: item.label, enabled: item.enabled !== false, click: () => resolve(item.value)
      }))
      // La fermeture du menu peut précéder le clic sur un de ses items
      menu.popup({window: mainWindow, callback: () => setTimeout(() => resolve(null), 200)})
    })
  })

  // Coche de « Forme > Voir la forme » (état de l'analyse)
  handle('menu:formShown', ({shown}) => {
    if ( formShown == !!shown ) return
    formShown = !!shown
    buildMenu()
  })

  // Variables des textes (cf. renderer Variables.updateMenus)
  handle('menu:variables', ({general, motifs}) => {
    variableNames = {general: general || [], motifs: motifs || []}
    buildMenu()
  })

  handle('clipboard:write', ({text}) => clipboard.writeText(String(text)))

  handle('menu:setDynamic', ({menus}) => {
    dynamicMenus = menus || []
    buildMenu()
  })

  handle('window:setSize', ({width, height}) => {
    if ( Partage.spectator ) return
    if ( mainWindow && width && height ) mainWindow.setSize(Math.round(width), Math.round(height))
  })

  /**
   * Fenêtre assez large pour +width+ (px de la page) : elle est élargie
   * si elle est plus étroite (jamais réduite). Si l'écran est trop
   * étroit, la fenêtre prend toute sa largeur et l'affichage est réduit.
   * @return le zoom de l'affichage
   */
  handle('window:fitWidth', ({width, zoom: chosen}) => {
    if ( !mainWindow ) return 1
    // Spectateur : zoom réglé sur la fenêtre de l'analyste (cf. Partage.applyView)
    if ( Partage.spectator ) return mainWindow.webContents.getZoomFactor()
    // Zoom choisi enregistré avec l'analyse
    if ( chosen ) userZoom = Number(chosen) || 1
    const bounds = mainWindow.getBounds()
    const [contentW] = mainWindow.getContentSize()
    const chrome = bounds.width - contentW
    const area = screen.getDisplayMatching(bounds).workArea
    let zoom = 1
    if ( contentW < width ) {
      const outer = Math.min(width + chrome, area.width)
      const x = Math.max(area.x, Math.min(bounds.x, area.x + area.width - outer))
      mainWindow.setBounds({x, y: bounds.y, width: outer, height: bounds.height})
      if ( outer - chrome < width ) zoom = (outer - chrome) / width
    }
    fitZoom = zoom
    return applyZoom()
  })

  // Fermeture avec une analyse non enregistrée : 'save', 'discard' ou
  // 'cancel' (la fermeture est alors abandonnée)
  handle('app:openManual', ({anchor}) => openManualAt(anchor))

  handle('app:confirmClose', async () => {
    clearTimeout(closeTimer)
    const {response} = await dialog.showMessageBox(mainWindow, {
        type:      'warning'
      , message:   t('ui.dialogs.unsaved')
      , detail:    t('ui.dialogs.unsaved_detail')
      , buttons:   [t('ui.dialogs.unsaved_save'), t('ui.dialogs.unsaved_discard'), t('ui.buttons.cancel')]
      , defaultId: 0
      , cancelId:  2
    })
    return ['save', 'discard', 'cancel'][response]
  })

  /* Partage à distance (cf. Partage.js) */
  handle('partage:state',    () => Partage.state())
  // Page chargée : fin de partage à annoncer
  handle('partage:ended',    () => Partage.takeEnded())
  handle('partage:identify', (data) => Partage.identify(data))
  handle('partage:validate', (data) => Partage.validate(data))
  handle('partage:setPseudo', ({pseudo}) => Partage.setPseudo(String(pseudo || '').trim()))
  handle('partage:book',     () => Partage.book)
  handle('partage:saveBook', (data) => Partage.saveBook(data))
  handle('partage:start',    ({invites}) => Partage.start({invites: invites || []}))
  handle('partage:stop',     () => Partage.stop())
  handle('partage:list',     () => Partage.list())
  handle('partage:accept',   ({id}) => Partage.accept({id}))
  handle('partage:refuse',   ({id}) => Partage.refuse({id}))
  handle('partage:leave',    () => Partage.leave())
  handle('partage:view',     (v) => Partage.view(v))
  // Page du spectateur chargée : partie visible de l'analyste
  handle('partage:ready',    () => Partage.applyView())
  // Analyse d'un partage terminé enregistrée dans un dossier choisi
  handle('partage:saveAs', async () => {
    const analyse = requireCurrent()
    const res = await showOpenDialog({
        title: t('ui.dialogs.partage_save_as')
      , properties: ['openDirectory', 'createDirectory']
    })
    if ( res.canceled || !res.filePaths.length ) return null
    const base = String((analyse.infos && (analyse.infos.title || analyse.infos.titre)) || 'Analyse').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'Analyse'
    let dest = path.join(res.filePaths[0], base), n = 1
    while ( fs.existsSync(dest) ) dest = path.join(res.filePaths[0], `${base} ${++n}`)
    fs.cpSync(analyse.path, dest, {recursive: true})
    setCurrent(dest)
    setTimeout(reloadWindow, 10)
    return dest
  })

  handle('app:closeReady', () => {
    closeAllowed = true
    setTimeout(() => mainWindow && mainWindow.close(), 10)
  })
}

// Compter et numéroter la première mesure (non : anacrouse) ?
// @return true, false ou null (annulation)
async function askCountFirstMeasure(){
  const {response} = await dialog.showMessageBox(mainWindow, {
      type:      'question'
    , message:   t('ui.dialogs.count_first')
    , detail:    t('ui.dialogs.count_first_detail')
    , buttons:   [t('ui.buttons.cancel'), t('ui.dialogs.count_first_no'), t('ui.dialogs.count_first_yes')]
    , defaultId: 2
    , cancelId:  0
  })
  return response == 0 ? null : response == 2
}

/* --- Démarrage --- */

app.whenReady().then(() => {
  if ( app.dock ) app.dock.setIcon(path.join(ASSETS_FOLDER, 'icons', 'icon.png'))
  registerProtocol()
  registerIpc()
  buildMenu()
  setCurrent(findStartAnalyse())
  createWindow()
  Partage.init({
      window:     () => mainWindow
    , current:    () => current
    , openFolder: (folder) => { setCurrent(folder) ; setTimeout(reloadWindow, 10) }
    , reload:     () => setTimeout(reloadWindow, 10)
    , menu:       () => buildMenu()
  })
})

app.on('window-all-closed', () => app.quit())
