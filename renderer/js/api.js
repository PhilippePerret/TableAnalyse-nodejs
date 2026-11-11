/**
 * Communication avec le processus principal (remplace WAA).
 *
 *    const data = await invoke('<canal>', {données})
 *
 * En cas d'erreur côté processus principal, une exception est levée
 * avec le message d'erreur.
 */
export async function invoke(channel, data){
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
  return 'sa://app/analyse/' + String(rel).split('/').map(encodeURIComponent).join('/')
}
