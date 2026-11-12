/**
 * Lance la découpe (ou la seule numérotation) dans une fenêtre cachée
 * (cutter.html / cutter.js). Utilisé par la commande en ligne (cli.js)
 * et par le menu Fichier de l'application.
 *
 *   opts.mode : 'decoupe' (défaut, depuis opts.pdf) ou 'numerotation'
 *               (depuis les images opts.images du dossier opts.folder)
 *
 * @return {Promise} résolue avec les lignes du journal
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BrowserWindow } from 'electron'
import { t } from '../i18n.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))

export function runCutter(opts, onLog){
  return new Promise((resolve, reject) => {
    const logs = []
    const win = new BrowserWindow({
        show: false
      , webPreferences: {nodeIntegration: true, contextIsolation: false, sandbox: false}
    })
    const finish = (err) => {
      if ( !win.isDestroyed() ) win.destroy()
      err ? reject(err) : resolve(logs)
    }
    win.webContents.ipc.on('cutter:log', (e, msg) => {
      logs.push(msg)
      onLog && onLog(msg)
    })
    const errors = []
    win.webContents.ipc.on('cutter:error', (e, msg) => errors.push(msg))
    win.webContents.ipc.on('cutter:done', (e, code) => {
      if ( code === 0 ) return finish()
      finish(new Error(errors.length ? errors.join('\n') : t('errors.cutting_failed')))
    })
    win.webContents.on('render-process-gone', (e, details) => {
      finish(new Error(t('errors.render_process_gone', {reason: details.reason})))
    })
    win.webContents.on('console-message', (e) => {
      if ( e.level === 'error' ) onLog && onLog(e.message)
    })
    // Textes du journal (cf. locales/<lang>/messages.yaml)
    opts = Object.assign({}, opts, {texts: t('messages.cutter')})
    win.loadFile(path.join(HERE, 'cutter.html'), {query: {opts: JSON.stringify(opts)}})
  })
}
