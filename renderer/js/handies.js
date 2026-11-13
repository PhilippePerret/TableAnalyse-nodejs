import { DGet, DGetAll } from './dom.js'
import { erreur, message } from './lib/Message.js'

// Zoom des éléments d'interface (cf. main.css, --ui-zoom)
export function uiZoom(){
  return Number(getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom')) || 1
}

/**
 * Ramène la boite +el+ entièrement dans la fenêtre, à +margin+ px des
 * bords : jamais de débordement à droite, à gauche, en haut ni en bas.
 * Plus haute (ou large) que la fenêtre : taille limitée, contenu défilant.
 */
export function keepInView(el, margin = 8){
  let r = el.getBoundingClientRect()
  if ( !r.width && !r.height ) return // boite fermée
  const z = el.currentCSSZoom || 1
  const W = window.innerWidth, H = window.innerHeight
  if ( r.height > H - 2 * margin ) { el.style.maxHeight = px((H - 2 * margin) / z) ; el.style.overflowY = 'auto' }
  if ( r.width  > W - 2 * margin ) { el.style.maxWidth  = px((W - 2 * margin) / z) ; el.style.overflowX = 'auto' }
  r = el.getBoundingClientRect()
  let dx = 0, dy = 0
  if ( r.right  > W - margin ) dx = W - margin - r.right
  if ( r.left + dx < margin ) dx = margin - r.left
  if ( r.bottom > H - margin ) dy = H - margin - r.bottom
  if ( r.top + dy < margin ) dy = margin - r.top
  if ( !dx && !dy ) return
  const cs = getComputedStyle(el)
  if ( cs.position == 'fixed' ) {
    // Position ramenée à left/top (sans right, bottom ni transform)
    Object.assign(el.style, {left: px((r.left + dx) / z), top: px((r.top + dy) / z), right: 'auto', bottom: 'auto', transform: 'none'})
  } else {
    el.style.left = px(parseFloat(cs.left) + dx / z)
    el.style.top  = px(parseFloat(cs.top)  + dy / z)
  }
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
