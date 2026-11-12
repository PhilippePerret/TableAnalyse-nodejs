import { DGet } from './dom.js'
import { erreur, message } from './lib/Message.js'

export function px(nombre){
  return `${nombre}px`
}

export function unpx(valeur){
  return Number(valeur.substring(0, valeur.length - 2))
}

/** Message discret (boite des messages, cf. lib/Message.js) **/
export function tooltip(msg){
  message(msg)
}

/** Pour écrire les coordonnées de la souris en bas à gauche de l'écran **/
export function coordonnate(x, y){
  window.__xyfield || (window.__xyfield = DGet('#coordonnates'))
  window.__xyfield.innerHTML = `x: ${x} y: ${y}`
}

export function raise(msg){
  erreur(msg)
  throw new Error(msg)
}
