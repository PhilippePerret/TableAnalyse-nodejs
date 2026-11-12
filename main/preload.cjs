/**
 * Pont entre le renderer et le processus principal.
 *
 *   await window.api.invoke('<canal>', {données})
 *     → {ok: true, data} ou {ok: false, error}
 *   window.api.on('<canal>', callback)
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Textes localisés (cf. main/i18n.js)
  locale: ipcRenderer.sendSync('app:locale'),
  invoke(channel, data){
    // Sérialisation JSON (même sémantique que l'ancien échange WAA)
    return ipcRenderer.invoke(channel, data === undefined ? undefined : JSON.parse(JSON.stringify(data)))
  },
  on(channel, callback){
    ipcRenderer.on(channel, (e, ...args) => callback(...args))
  }
})
