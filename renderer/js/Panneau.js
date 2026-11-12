import { DCreate, DGet, listen } from './dom.js'
import { raise } from './handies.js'
import { UI } from './UI.js'

export class Panneau {

  constructor(owner){
    this.owner = owner
    this.id = owner.panneauId || raise(`${this.constructor.name} faut définir l'ID du panneau (<owner>.panneauId)`)
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
 * En-tête commun des panneaux (cf. thèmes, css/themes/) : croix de
 * fermeture à gauche, titre et raccourci.
 */
export function addPanelHead(obj, {title, shortcut, onClose}){
  obj.classList.add('panneau-ui')
  const close = DCreate('SPAN', {class: 'panneau-close', title: 'Fermer', text: '×'})
  const head = DCreate('DIV', {class: 'panneau-head', inner: [
      close
    , DCreate('SPAN', {class: 'panneau-title',    text: title || ''})
    , DCreate('SPAN', {class: 'panneau-shortcut', text: shortcut || ''})
  ]})
  obj.insertBefore(head, obj.firstChild)
  listen(close, 'click', (e) => { e.stopPropagation() ; onClose() })
  return head
}
