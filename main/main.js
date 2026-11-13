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
import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, shell } from 'electron'
import { Analyse } from './Analyse.js'
import { AppPrefs } from './AppPrefs.js'
import { createAnalyse } from './createAnalyse.js'
import { exportToHtml } from './exportHtml.js'
import { exportToPdf, exportToSvg } from './exportPdfSvg.js'
import { buildImageFromCode } from './scoreImage.js'
import { runCutter } from './cutter/runCutter.js'
import { loadYAML } from './yaml.js'
import { APP_FOLDER, ASSETS_FOLDER, RENDERER_FOLDER } from './paths.js'
import { locale, t } from './i18n.js'

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
const USER_DATA_FOLDER = path.join(app.getPath('appData'), 'ScoreAnalyse')
app.setPath('userData', USER_DATA_FOLDER)
app.setName(t('ui.app.name'))
app.setAboutPanelOptions({applicationName: t('ui.app.name'), applicationVersion: APP_VERSION})

let mainWindow  = null
let current     = null    // {Analyse} analyse courante
let closeAllowed = false
let justCut     = false   // la partition vient d'être découpée (message au rechargement)
let dynamicMenus = []     // menus « Options », « Marque »… décrits par le renderer (MenusBar.js)

protocol.registerSchemesAsPrivileged([{
  scheme: 'sa',
  privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true}
}])

/* --- Analyse courante --- */

function setCurrent(folder){
  current = folder ? new Analyse(folder) : null
  if ( current ) AppPrefs.set({last_analyse_path: current.path})
  updateMenu()
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
    , show:   !SMOKE
    , title:  ''
    // Bande supérieure dessinée par la page (#titlebar), avec les
    // boutons de la fenêtre du système
    , titleBarStyle:   process.platform == 'darwin' ? 'hiddenInset' : 'hidden'
    , titleBarOverlay: process.platform == 'darwin' ? false : {color: '#ececec', symbolColor: '#333333', height: 28}
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
    setTimeout(() => { closeAllowed = true ; mainWindow && mainWindow.close() }, 5000)
  })
  mainWindow.on('closed', () => { mainWindow = null })

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
    setTimeout(() => app.exit(0), Number(process.env.SA_SMOKE) * 1000 || 6000)
  }
}

function sendMenuCommand(command){
  mainWindow && mainWindow.webContents.send('menu', command)
}

// Pas d'ouverture du Finder en lancement de contrôle
function showInFinder(p, reveal){
  if ( SMOKE ) return
  reveal ? shell.showItemInFolder(p) : shell.openPath(p)
}

function reloadWindow(){
  mainWindow && mainWindow.webContents.reload()
}

/* --- Menu de l'application --- */

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
        , {type: 'separator'}
        , {label: t('ui.menu.save'),            accelerator: 'CmdOrCtrl+S', click: () => sendMenuCommand('save')}
        , {type: 'separator'}
        , {label: t('ui.menu.infos'),           click: () => sendMenuCommand('infosAnalyse')}
        , {type: 'separator'}
        , {label: t('ui.menu.export'), submenu: [
              {label: t('ui.menu.export_html'), click: () => sendMenuCommand('exportToHTML')}
            , {label: t('ui.menu.export_pdf'),  click: () => sendMenuCommand('exportToPDF')}
            , {label: t('ui.menu.export_svg'),  click: () => sendMenuCommand('exportToSVG')}
          ]}
        , {label: t('ui.menu.show_in_finder'),  click: () => current && showInFinder(current.path)}
        , {type: 'separator'}
        , {label: t('ui.menu.manual'),          click: () => sendMenuCommand('manual')}
        , {type: 'separator'}
        , {label: t('ui.menu.prefs'),           click: () => sendMenuCommand('prefs')}
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
      label: t('ui.menu.tools_menu'),
      submenu: [
          {label: t('ui.menu.tools'),           click: () => sendMenuCommand('toolsPanel')}
        , {label: t('ui.menu.form'),            click: () => sendMenuCommand('formPanel')}
        , {type: 'separator'}
        , {label: t('ui.menu.cut_score'),       id: 'cutScore',    click: () => sendMenuCommand('cutScore')}
        , {label: t('ui.menu.number_score'),    id: 'numberScore', click: () => sendMenuCommand('numberScore')}
      ]
    },
    {
        role:  'windowMenu'
      , label: t('ui.menu.window')
      , submenu: [
            {role: 'minimize', label: t('ui.menu.minimize')}
          , {role: 'zoom',     label: t('ui.menu.zoom')}
          , ...(isMac ? [{type: 'separator'}, {role: 'front', label: t('ui.menu.front')}] : [{role: 'close', label: t('ui.menu.close_window')}])
        ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
  updateMenu()
}

// Éléments d'un menu décrit par le renderer (cf. MenusBar.js)
function dynamicItems(m){
  return m.items.map(item => item.type ? item : {
      label:   item.label
    , enabled: item.enabled
    , click:   () => mainWindow && mainWindow.webContents.send('menu:dynamic', {id: m.id, index: item.index})
  })
}

// Menus du renderer placés en sous-menus de +parent+ (après un séparateur)
function dynamicSubmenus(parent){
  const subs = dynamicMenus.filter(m => m.parent == parent)
  if ( !subs.length ) return []
  return [{type: 'separator'}, ...subs.map(m => ({label: m.label, submenu: dynamicItems(m)}))]
}

// Menus inaccessibles sans analyse courante
function updateMenu(){
  const menu = Menu.getApplicationMenu()
  if ( !menu ) return
  ;['cutScore', 'numberScore'].forEach(id => {
    const item = menu.getMenuItemById(id)
    if ( item ) item.enabled = !!current
  })
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

  handle('analyse:getCurrent', () => {
    if ( !current ) return null
    // Instance vierge pour relire les fichiers (rechargement de la page)
    current = new Analyse(current.path)
    current.makeBackup()
    current.importMeasures()
    const data = Object.assign(current.allDataForClient(), {just_cut: justCut})
    justCut = false
    return data
  })

  handle('analyse:saveInfos', ({infos}) => {
    const analyse = requireCurrent()
    analyse.infos = Object.assign({}, infos, {updated_at: Math.round(Date.now() / 1000)})
    analyse.saveInfos()
  })

  handle('analyse:savePreferences', ({preferences}) => {
    const analyse = requireCurrent()
    analyse.preferences = preferences
    analyse.savePreferences()
  })

  handle('analyse:saveWindowSize', ({width, height}) => {
    requireCurrent().saveWindowSize(Math.round(width), Math.round(height))
  })

  handle('analyse:saveTags', ({tags}) => {
    const analyse = requireCurrent()
    analyse.tags = tags
    analyse.saveTags()
  })

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

  handle('analyse:reload', () => {
    setTimeout(reloadWindow, 10)
  })

  handle('analyse:create', (data) => {
    const analyse = createAnalyse(data, APP_VERSION)
    setCurrent(analyse.path)
    showInFinder(analyse.path)
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

  handle('analyse:cutScore', async ({pdf}) => {
    const analyse = requireCurrent()
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'decoupe-'))
    try {
      await runCutter({pdf, out, dpi: 300, quality: 90})
      analyse.replaceSystems(out)
      justCut = true
    } finally {
      fs.rmSync(out, {recursive: true, force: true})
    }
    setTimeout(reloadWindow, 10)
  })

  handle('analyse:numberScore', async () => {
    const analyse = requireCurrent()
    const images = analyse.systemsInFolder
    if ( !images.length ) throw new Error(t('errors.no_systems_to_number'))
    await runCutter({mode: 'numerotation', folder: analyse.systemsFolder, images, out: analyse.systemsFolder})
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

  handle('menu:setDynamic', ({menus}) => {
    dynamicMenus = menus || []
    buildMenu()
  })

  handle('window:setSize', ({width, height}) => {
    if ( mainWindow && width && height ) mainWindow.setSize(Math.round(width), Math.round(height))
  })

  handle('app:closeReady', () => {
    closeAllowed = true
    setTimeout(() => mainWindow && mainWindow.close(), 10)
  })
}

/* --- Démarrage --- */

app.whenReady().then(() => {
  if ( app.dock ) app.dock.setIcon(path.join(ASSETS_FOLDER, 'icons', 'icon.png'))
  registerProtocol()
  registerIpc()
  buildMenu()
  setCurrent(findStartAnalyse())
  createWindow()
})

app.on('window-all-closed', () => app.quit())
