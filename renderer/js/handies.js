import { DGet, DGetAll } from './dom.js'
import { erreur, message } from './lib/Message.js'

// Zoom des éléments d'interface (cf. main.css, --ui-zoom)
export function uiZoom(){
  return Number(getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom')) || 1
}

/**
 * Ramène la boite +el+ (positionnée par left) dans la largeur de la
 * fenêtre, à +margin+ px des bords : jamais de débordement à droite ni
 * à gauche
 */
export function keepInView(el, margin = 8){
  const r = el.getBoundingClientRect()
  const z = el.currentCSSZoom || 1
  let dx = 0
  if ( r.right > window.innerWidth - margin ) dx = window.innerWidth - margin - r.right
  if ( r.left + dx < margin ) dx = margin - r.left
  if ( dx ) el.style.left = px(parseFloat(getComputedStyle(el).left) + dx / z)
}

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
    option.dataset.checked = on ? 'true' : 'false'
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
