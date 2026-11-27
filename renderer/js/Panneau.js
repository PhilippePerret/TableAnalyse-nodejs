import { DCreate, DGet, listen } from './dom.js'
import { onRelease } from './KeyRelease.js'
import { draggable } from './lib/interact.js'
import { raise, keepInView, moveBox, splitInset } from './handies.js'
import { UI } from './UI.js'
import { t } from './i18n.js'

export class Panneau {

  constructor(owner){
    this.owner = owner
    this.id = owner.panneauId || raise(t('errors.panel_id_required', {owner: this.constructor.name}))
  }

  toggle(){
    if ( this.isOpened ) {
      this.hide()
    } else {
      this.show()
    }
  }
  togglePanel(){
    return this.toggle()
  }

  show(){
    UI.desactiveCurrentShortcuts()
    if ( 'function' == typeof this.owner.onKeyPress) { window.onkeypress = this.owner.onKeyPress.bind(this)}
    this.obj || this.owner.build()
    const fixed = !!this.owner.panneauFixedPosition
    if ( !this.head ) {
      this.head = addPanelHead(this.obj, {
          title:    this.owner.panneauTitle
        , onClose:  this.hide.bind(this)
        , place:    !fixed
      })
      fixed && listen(this.head, 'mouseup', () => this.savePosition())
    }
    this.observeDoubleClick()
    this.obj.classList.remove('hidden')
    fixed && this.restorePosition()
    requestAnimationFrame(() => { fixed || placePanel(this.obj, this.owner.panelTarget) ; keepInView(this.obj) })
    this.isOpened = true
    'function' == typeof this.owner.onOpen  && this.owner.onOpen()
  }
  hide(){
    this.owner.panneauFixedPosition && this.savePosition()
    this.obj.classList.add('hidden')
    UI.reactiveCurrentShortcuts()
    this.isOpened = false
    'function' == typeof this.owner.onClose && this.owner.onClose()
  }

  /**
   * Panneau à position fixe (owner.panneauFixedPosition) : position
   * mémorisée (navigateur de l'application), retrouvée à chaque ouverture,
   * sans placement près du clic.
   */
  get positionKey(){ return `panneau-position-${this.id}` }
  savePosition(){
    const r = this.obj.getBoundingClientRect(), z = this.obj.currentCSSZoom || 1
    if ( !r.width && !r.height ) return
    try { localStorage.setItem(this.positionKey, JSON.stringify({left: r.left / z, top: r.top / z})) } catch(err) {}
  }
  restorePosition(){
    let pos = null
    try { pos = JSON.parse(localStorage.getItem(this.positionKey)) } catch(err) {}
    if ( !pos || !Number.isFinite(pos.left) || !Number.isFinite(pos.top) ) return
    Object.assign(this.obj.style, {left: `${pos.left}px`, top: `${pos.top}px`, right: 'auto', bottom: 'auto', transform: 'none'})
  }

  observe(){
    listen(this.obj, 'click', (e)=>{e.stopPropagation();return true})
  }

  /**
   * Un double-clic dans le panneau (par exemple pour sélectionner un
   * mot) ne doit pas remonter jusqu'à la table (création de marque).
   */
  observeDoubleClick(){
    if ( this.dblClickObserved ) return
    listen(this.obj, 'dblclick', (e)=>{e.stopPropagation()})
    this.dblClickObserved = true
  }

  get obj(){
    return this._obj || (this._obj = DGet('#'+this.id))
  }
  set obj(v){ this._obj = v }
  
}

/**
 * En-tête commun des panneaux (cf. thèmes, css/themes.css) : croix de
 * fermeture à gauche et titre centré. Les boutons du bas forment un
 * pied de page (filet) ; un bouton « Fermer » y est ajouté si le panneau
 * n'en a pas : à droite s'il est seul, à gauche sinon.
 * Le panneau est déplaçable par sa bande supérieure. Son bouton par défaut (classe btn-default)
 * répond à la touche Entrée.
 * À l'ouverture, placé près du clic qui l'a ouvert, à côté de +target+
 * (élément(s) concerné(s)) sans le masquer (cf. placePanel) ; +place+
 * false : le panneau se place lui-même.
 */
export function addPanelHead(obj, {title, onClose, target, place = true}){
  obj.classList.add('panneau-ui')
  // Jamais hors de la fenêtre : à l'ouverture et à chaque changement de
  // taille (contenu, fenêtre)
  keepPanelInView(obj, place && {target})
  const close = DCreate('SPAN', {class: 'panneau-close', title: t('ui.buttons.close'), text: '×'})
  const head = DCreate('DIV', {class: 'panneau-head', inner: [
      close
    , DCreate('SPAN', {class: 'panneau-title',    text: title || ''})
    , DCreate('SPAN', {class: 'panneau-spacer'}) // pour centrer le titre
  ]})
  obj.insertBefore(head, obj.firstChild)
  // Aucun clic ne sort du panneau (création de marque sur la table)
  listen(obj, 'click', (e) => e.stopPropagation())
  listen(obj, 'dblclick', (e) => e.stopPropagation())
  listen(close, 'click', (e) => { e.stopPropagation() ; onClose() })
  // Position ramenée à left/top (sans right, bottom ni transform) avant
  // un déplacement
  listen(head, 'mousedown', (e) => {
    // Bouton de l'entête (p.e. « Sous-type… ») : pas un déplacement (#275)
    if ( e.target instanceof Element && e.target.closest('button, input, select, textarea, span.panneau-close') ) return
    const r = obj.getBoundingClientRect(), z = obj.currentCSSZoom || 1
    // Position absolue (dans la page) : coordonnées de la page, pas de la
    // fenêtre (sinon, page défilée, le panneau sauterait hors de la vue)
    const fixed = getComputedStyle(obj).position == 'fixed'
    const left = fixed ? r.left : r.left + window.scrollX
    const top  = fixed ? r.top  : r.top  + window.scrollY
    Object.assign(obj.style, {left: `${left / z}px`, top: `${top / z}px`, right: 'auto', bottom: 'auto', transform: 'none'})
  })
  draggable(obj, {handle: '.panneau-head'})
  // Touches tapées dans un champ : elles ne sortent pas du panneau (un
  // « O » majuscule n'ouvre pas la boite à outils…). Échap excepté
  // (fermeture des boites)
  ;['keydown', 'keypress', 'keyup'].forEach(type => listen(obj, type, (e) => {
    if ( e.key != 'Escape' && isTextField(e.target) ) e.stopPropagation()
  }))
  listen(obj, 'keydown', (e) => {
    if ( e.key != 'Enter' || e.isComposing || ['TEXTAREA', 'BUTTON', 'SELECT'].includes(e.target.tagName) ) return
    const btn = Array.from(obj.querySelectorAll('button.btn-default')).find(b => !b.disabled && b.offsetParent)
    if ( !btn ) return
    return onRelease(e, () => btn.click())
  })
  let buttons = obj.querySelector(':scope > div.buttons')
  buttons || obj.appendChild(buttons = DCreate('DIV', {class: 'buttons'}))
  // Pied de page déjà dessiné par le panneau : laissé tel quel
  if ( getComputedStyle(buttons).position != 'absolute' ) buttons.classList.add('panneau-foot')
  if ( !obj.querySelector('button.btn-close, button[id^="btn_"][id$="_close"], button#btn_close_tools') ) {
    const alone = !buttons.querySelector('button')
    const btn = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.close')})
    alone || (btn.style.float = 'left')
    buttons.insertBefore(btn, buttons.firstChild)
    listen(btn, 'click', (e) => { e.stopPropagation() ; onClose() })
  }
  return head
}

// Champ de saisie (texte)
function isTextField(el){
  return !!el && (el.isContentEditable || el.tagName == 'TEXTAREA' || (el.tagName == 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(el.type)))
}

const panelsInView = new Set()
function keepPanelInView(obj, placement){
  panelsInView.add(obj)
  new ResizeObserver(() => obj.classList.contains('anim-hidden') || keepInView(obj)).observe(obj)
  requestAnimationFrame(() => { placement && placePanel(obj, placement.target) ; keepInView(obj) })
}

/*
  PLACEMENT DES PANNEAUX près du clic qui les ouvre (dernier clic ou
  clic droit de la page, menu contextuel compris)
*/
const PLACE_DELAY = 15000 // ms : au-delà, clic trop ancien (menu de l'app)
const PLACE_GAP   = 14    // px entre le panneau et l'élément ou le clic
let lastPointer = null
;['mousedown', 'contextmenu'].forEach(type => window.addEventListener(type, (e) => {
  lastPointer = {x: e.clientX, y: e.clientY, time: Date.now()}
}, true))

/**
 * Place le panneau +obj+ :
 * - à côté de +target+ (élément ou liste d'éléments concernés), sans le
 *   masquer : à droite, à gauche, au-dessus ou au-dessous (le premier
 *   côté où il tient entier, sinon celui qui masque le moins) ;
 * - sinon près du dernier clic (en dessous à droite, ou de l'autre côté
 *   quand la place manque) ;
 * - sinon (ouverture par le menu de l'app, panneau très grand) : laissé
 *   à sa place.
 * Jamais hors de la fenêtre (cf. keepInView, appelé ensuite).
 */
export function placePanel(obj, target){
  const r = obj.getBoundingClientRect()
  if ( !r.width && !r.height ) return
  const W = window.innerWidth, H = window.innerHeight, M = 8, T = M + splitInset()
  if ( r.width > W * 0.6 || r.height > (H - T) * 0.85 ) return
  const els = [target].flat().filter(el => el && el.getBoundingClientRect)
  const fits = (x, y) => x >= M && y >= T && x + r.width <= W - M && y + r.height <= H - M
  const clamp = (x, y) => [Math.min(Math.max(x, M), W - M - r.width), Math.min(Math.max(y, T), H - M - r.height)]
  let pos = null
  if ( els.length ) {
    const rs = els.map(el => el.getBoundingClientRect())
    const t = {left: Math.min(...rs.map(q => q.left)), top: Math.min(...rs.map(q => q.top)), right: Math.max(...rs.map(q => q.right)), bottom: Math.max(...rs.map(q => q.bottom))}
    // « plus haut et à côté » : haut du panneau un peu au-dessus de l'élément
    const y = t.top - Math.min(60, r.height / 3)
    const candidates = [
        [t.right + PLACE_GAP, y]
      , [t.left - PLACE_GAP - r.width, y]
      , [t.left, t.top - PLACE_GAP - r.height]
      , [t.left, t.bottom + PLACE_GAP]
    ]
    pos = candidates.find(([x, y]) => fits(x, y))
    if ( !pos ) {
      const covered = ([x, y]) => Math.max(0, Math.min(x + r.width, t.right) - Math.max(x, t.left)) * Math.max(0, Math.min(y + r.height, t.bottom) - Math.max(y, t.top))
      pos = candidates.map(c => clamp(...c)).sort((a, b) => covered(a) - covered(b))[0]
    }
  } else if ( lastPointer && Date.now() - lastPointer.time < PLACE_DELAY ) {
    const {x, y} = lastPointer
    pos = [x + PLACE_GAP + r.width <= W - M ? x + PLACE_GAP : x - PLACE_GAP - r.width,
           y + PLACE_GAP + r.height <= H - M ? y + PLACE_GAP : y - PLACE_GAP - r.height]
  }
  if ( !pos ) return
  const [x, y] = clamp(...pos)
  moveBox(obj, x - r.left, y - r.top)
}
// (aussi quand la place disponible change : fenêtre scindée, cf. Split.js)
export function keepPanelsInView(){
  panelsInView.forEach(obj => obj.isConnected ? keepInView(obj) : panelsInView.delete(obj))
}
window.addEventListener('resize', keepPanelsInView)
