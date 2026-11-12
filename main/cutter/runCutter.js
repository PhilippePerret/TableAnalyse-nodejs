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
    win.webContents.ipc.on('cutter:done', (e, code) => {
      if ( code === 0 ) return finish()
      const errors = logs.filter(l => l.startsWith('ERREUR'))
      finish(new Error(errors.length ? errors.join('\n') : 'La découpe a échoué.'))
    })
    win.webContents.on('render-process-gone', (e, details) => {
      finish(new Error(`Processus de rendu interrompu : ${details.reason}`))
    })
    win.webContents.on('console-message', (e) => {
      if ( e.level === 'error' ) onLog && onLog(e.message)
    })
    win.loadFile(path.join(HERE, 'cutter.html'), {query: {opts: JSON.stringify(opts)}})
  })
}
