import { DGet } from './dom.js'
import { erreur } from './lib/Message.js'

export function px(nombre){
  return `${nombre}px`
}

export function unpx(valeur){
  return Number(valeur.substring(0, valeur.length - 2))
}

/** Pour afficher un message discret dans le footer **/
export function tooltip(msg){
  window.__tooltipField || (window.__tooltipField = DGet('#tooltip'))
  window.__tooltipField.innerHTML = msg
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
