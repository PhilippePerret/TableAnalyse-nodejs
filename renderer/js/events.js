/**
 * Petit bus d'évènements de l'application, pour que les objets
 * d'analyse puissent informer l'interface (menus, table) sans en
 * dépendre.
 *
 *    emit('selection:changed', {selection})
 *    on('selection:changed', detail => {...})
 */
const bus = new EventTarget()

export function emit(name, detail){
  bus.dispatchEvent(new CustomEvent(name, {detail}))
}

export function on(name, callback){
  bus.addEventListener(name, e => callback(e.detail))
}
