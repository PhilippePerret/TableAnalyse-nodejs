/**
 * Vue de visualisation de la fenêtre scindée (index.html?mirror=1, cf.
 * Split.js) : ni menus, ni taille de fenêtre, ni historique, ni
 * enregistrement, ni opérations de l'ouverture de l'analyse
 */
export const IS_MIRROR = new URLSearchParams(location.search).has('mirror')
const MIRROR_IGNORED = [
    'menu:setDynamic', 'menu:formShown', 'menu:variables', 'split:titlebar'
  , 'window:setSize', 'window:setTitle', 'analyse:saveWindowSize'
  , 'history:load', 'history:append'
  , 'analyse:saveTags', 'analyse:saveInfos', 'analyse:savePreferences'
  , 'app:confirmClose', 'app:closeReady'
]
const MIRROR_CHANNELS = {'analyse:getCurrent': 'split:getCurrent', 'window:fitWidth': 'split:zoom'}

/**
 * Spectateur d'un partage (cf. Partage.js) : lecture seule, rien
 * d'enregistré
 */
let spectator = false
// (historique lu, fermeture de la fenêtre)
const SPECTATOR_ALLOWED = ['history:load', 'app:confirmClose', 'app:closeReady']
export function setSpectator(on){ spectator = !!on }
export function isSpectator(){ return spectator }

/**
 * Communication avec le processus principal (remplace WAA).
 *
 *    const data = await invoke('<canal>', {données})
 *
 * En cas d'erreur côté processus principal, une exception est levée
 * avec le message d'erreur.
 */
export async function invoke(channel, data){
  if ( IS_MIRROR ) {
    if ( MIRROR_IGNORED.includes(channel) ) return null
    channel = MIRROR_CHANNELS[channel] || channel
  } else if ( spectator && MIRROR_IGNORED.includes(channel) && !SPECTATOR_ALLOWED.includes(channel) ) {
    return null
  }
  const res = await window.api.invoke(channel, data)
  if ( !res.ok ) throw new Error(res.error)
  return res.data
}

export function onMain(channel, callback){
  window.api.on(channel, callback)
}

/**
 * @return l'URL d'un fichier du dossier de l'analyse courante
 * (+rel+ est le chemin relatif, par exemple 'systems/system-1.jpg')
 */
export function analyseUrl(rel){
  return `sa://${location.host}/analyse/` + String(rel).split('/').map(encodeURIComponent).join('/')
}
