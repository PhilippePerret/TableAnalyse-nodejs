import { DCreate, DGet, listen } from './dom.js'
import { draggable } from './lib/interact.js'
import { raise } from './handies.js'
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
    this.head || (this.head = addPanelHead(this.obj, {
        title:    this.owner.panneauTitle
      , shortcut: this.owner.panneauShortcut
      , onClose:  this.hide.bind(this)
    }))
    this.observeDoubleClick()
    this.obj.classList.remove('hidden')
    this.isOpened = true
    'function' == typeof this.owner.onOpen  && this.owner.onOpen()
  }
  hide(){
    this.obj.classList.add('hidden')
    UI.reactiveCurrentShortcuts()
    this.isOpened = false
    'function' == typeof this.owner.onClose && this.owner.onClose()
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
 * fermeture à gauche, titre et raccourci. Les boutons du bas forment un
 * pied de page (filet) ; un bouton « Fermer » y est ajouté si le panneau
 * n'en a pas : à droite s'il est seul, à gauche sinon.
 * Le panneau est déplaçable par sa bande supérieure. Son bouton par défaut (classe btn-default)
 * répond à la touche Entrée.
 */
export function addPanelHead(obj, {title, shortcut, onClose}){
  obj.classList.add('panneau-ui')
  const close = DCreate('SPAN', {class: 'panneau-close', title: t('ui.buttons.close'), text: '×'})
  const head = DCreate('DIV', {class: 'panneau-head', inner: [
      close
    , DCreate('SPAN', {class: 'panneau-title',    text: title || ''})
    , DCreate('SPAN', {class: 'panneau-shortcut', text: shortcut || ''})
  ]})
  obj.insertBefore(head, obj.firstChild)
  listen(close, 'click', (e) => { e.stopPropagation() ; onClose() })
  // Position ramenée à left/top (sans right, bottom ni transform) avant
  // un déplacement
  listen(head, 'mousedown', () => {
    const r = obj.getBoundingClientRect(), z = obj.currentCSSZoom || 1
    Object.assign(obj.style, {left: `${r.left / z}px`, top: `${r.top / z}px`, right: 'auto', bottom: 'auto', transform: 'none'})
  })
  draggable(obj, {handle: '.panneau-head'})
  listen(obj, 'keydown', (e) => {
    if ( e.key != 'Enter' || e.isComposing || ['TEXTAREA', 'BUTTON', 'SELECT'].includes(e.target.tagName) ) return
    const btn = Array.from(obj.querySelectorAll('button.btn-default')).find(b => !b.disabled && b.offsetParent)
    if ( !btn ) return
    e.preventDefault() ; e.stopPropagation()
    btn.click()
  })
  let buttons = obj.querySelector(':scope > div.buttons')
  buttons || obj.appendChild(buttons = DCreate('DIV', {class: 'buttons'}))
  // Pied de page déjà dessiné par le panneau (p.e. « Forme ») : laissé tel quel
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
