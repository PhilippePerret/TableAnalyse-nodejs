/**
 * ScoreAnalyse — processus principal Electron.
 *
 * Lancement :  npm start [-- <dossier analyse>]
 *
 * Analyse ouverte au démarrage (ordre de précédence) :
 *   1. le dossier d'analyse passé en argument,
 *   2. la dernière analyse ouverte,
 *   3. aucune (utiliser le menu Fichier).
 */
import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, shell } from 'electron'
import { Analyse } from './Analyse.js'
import { AppPrefs } from './AppPrefs.js'
import { createAnalyse } from './createAnalyse.js'
import { exportToHtml } from './exportHtml.js'
import { buildImageFromCode } from './scoreImage.js'
import { loadYAML } from './yaml.js'
import { APP_FOLDER, APP_NAME, ASSETS_FOLDER, RENDERER_FOLDER } from './paths.js'

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
app.setName(APP_NAME)
app.setPath('userData', USER_DATA_FOLDER)
app.setAboutPanelOptions({applicationName: APP_NAME, applicationVersion: APP_VERSION})

let mainWindow  = null
let current     = null    // {Analyse} analyse courante
let closeAllowed = false

protocol.registerSchemesAsPrivileged([{
  scheme: 'sa',
  privileges: {standard: true, secure: true, supportFetchAPI: true, corsEnabled: true}
}])

/* --- Analyse courante --- */

function setCurrent(folder){
  current = folder ? new Analyse(folder) : null
  if ( current ) AppPrefs.set({last_analyse_path: current.path})
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
  if ( !current ) throw new Error("Aucune analyse n'est ouverte.")
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
    , title:  APP_NAME
    , webPreferences: {
          preload:          path.join(APP_FOLDER, 'main', 'preload.cjs')
        , contextIsolation: true
        , nodeIntegration:  false
        , sandbox:          true
      }
  })
  mainWindow.loadURL('sa://app/index.html')

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
    ...(isMac ? [{role: 'appMenu'}] : []),
    {
      label: 'Fichier',
      submenu: [
          {label: 'Nouvelle analyse…',      accelerator: 'CmdOrCtrl+N', click: () => sendMenuCommand('newAnalyse')}
        , {label: 'Ouvrir une analyse…',    accelerator: 'CmdOrCtrl+O', click: () => sendMenuCommand('openAnalyse')}
        , {label: "Recharger l'analyse",    accelerator: 'CmdOrCtrl+R', click: () => sendMenuCommand('reloadAnalyse')}
        , {type: 'separator'}
        , {label: 'Enregistrer',            accelerator: 'CmdOrCtrl+S', click: () => sendMenuCommand('save')}
        , {type: 'separator'}
        , {label: 'Informations…',          click: () => sendMenuCommand('infosAnalyse')}
        , {label: 'Exporter en HTML',       click: () => sendMenuCommand('exportToHTML')}
        , {label: 'Afficher dans le Finder', click: () => current && showInFinder(current.path)}
        , ...(isMac ? [] : [{type: 'separator'}, {role: 'quit'}])
      ]
    },
    {
      // Pas de rôle undo/redo : ⌘Z est géré par l'application
      label: 'Édition',
      submenu: [{role: 'cut'}, {role: 'copy'}, {role: 'paste'}, {role: 'selectAll'}]
    },
    {
      label: 'Affichage',
      submenu: [
          {label: 'Boite à outils… ⇧O',  click: () => sendMenuCommand('toolsPanel')}
        , {label: 'Préférences… ⇧P',     click: () => sendMenuCommand('prefs')}
        , {label: 'Manuel… ⇧M',          click: () => sendMenuCommand('manual')}
        , {type: 'separator'}
        , {role: 'toggleDevTools'}
        , {role: 'togglefullscreen'}
      ]
    },
    {role: 'windowMenu'}
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
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

  handle('analyse:getCurrent', () => {
    if ( !current ) return null
    // Instance vierge pour relire les fichiers (rechargement de la page)
    current = new Analyse(current.path)
    current.makeBackup()
    return current.allDataForClient()
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

  handle('analyse:saveTags', ({tags}) => {
    const analyse = requireCurrent()
    analyse.tags = tags
    analyse.saveTags()
  })

  handle('analyse:refresh', () => {
    return requireCurrent().updateSystems()
  })

  handle('analyse:open', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
        title: "Choisir le dossier de l'analyse"
      , properties: ['openDirectory']
    })
    if ( res.canceled || !res.filePaths.length ) return false
    const folder = res.filePaths[0]
    if ( !Analyse.isConform(folder) ) {
      throw new Error(`Le dossier « ${folder} » n'est pas un dossier d'analyse (il doit contenir un fichier 'infos.yaml' et un dossier 'systems').`)
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

  handle('dialog:chooseFolder', async ({title}) => {
    const res = await dialog.showOpenDialog(mainWindow, {
        title: title || 'Choisir un dossier'
      , properties: ['openDirectory', 'createDirectory']
    })
    return res.canceled ? null : res.filePaths[0]
  })

  handle('analyse:exportHtml', ({code_html}) => {
    const htmlPath = exportToHtml(requireCurrent(), code_html)
    showInFinder(htmlPath, true)
    return htmlPath
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
  registerProtocol()
  registerIpc()
  buildMenu()
  setCurrent(findStartAnalyse())
  createWindow()
})

app.on('window-all-closed', () => app.quit())
