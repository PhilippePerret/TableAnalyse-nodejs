import { DGet, DGetAll } from './dom.js'
import { t } from './i18n.js'
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

/**
 * Affichage (ou non) des coordonnées de la souris en bas à gauche de
 * l'écran (menus « Options » et « Marque »). Masquées par défaut.
 */
export function toggleCoordinates(on){
  if ( undefined === on ) on = !document.body.classList.contains('show-coordinates')
  document.body.classList.toggle('show-coordinates', on)
  DGetAll('option[value="toggleCoordinates"]').forEach(option => {
    option.textContent = `${on ? '☒' : '☐'} ${t('ui.options_menu.coordinates')}`
  })
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
