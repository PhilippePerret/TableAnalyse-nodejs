import { DCreate, DGet, listen, stopEvent } from './dom.js'
import { px } from './handies.js'
import { draggable } from './lib/interact.js'
import { UI } from './UI.js'
/**
 * Classe Editeur
 * --------------
 * Pour éditer un texte, pour le moment
 * 
 * 
 * @usage
 * 
 *    let ed = new Editeur(this/* owner * /, {setMethod:<méthode set>})
 *    ed.titre = "Le titre"
 *    ed.font  = "<police à utiliser dans le champ de saisie>"
 *    ed.value = "<la valeur actuelle>"
 *    ed.positionne({top:<nombre ou valeur>, left:<nombre ou valeur>, fixed:true/*pour position fixed * /})
 * 
 *    ed.show()
 *    
 *    OU 
 * 
 *    ed.show({top:..., left:..., titre:...})
 */


export class Editeur {
  constructor(owner, data){
    this.owner  = owner
    console.debug("Nouvel éditeur pour ", owner)
    console.debug("data = ", data)
    data = data || {}
    if ( ! data.setMethod ) {
      if ( 'function' == typeof owner.setValue){
        Object.assign(data, {setMethod: owner.setValue.bind(owner)})
      }
    }
    data.titre || Object.assign(data, {titre: data.message})

    this.data = data
  }

  init(){
    this.obj || this.build_and_observe()
  }

  // Ouvrir l'éditeur
  show(position, message){
    // console.log("-> Editeur#show")
    this.init()
    position && this.positionne(position)
    message  && (this.titre = message)
    this.obj.classList.remove('hidden')
    console.debug("editeur", this)
    this.obj.classList[this.isLongText ? 'add' : 'remove']('longtext')
    var fieldText ;
    if ( this.isLongText ) {
      fieldText = this.textarea
    } else {
      fieldText = this.textField
    }
    fieldText.focus()
    fieldText.select()
  }

  // Fermer l'éditeur
  hide(){
    this.obj.classList.add('hidden')
    UI.reactiveCurrentShortcuts()
  }

  get isLongText(){
    if ( this.owner.data.type ) {
      console.debug("Je prends le owner.data.type")
      return this.owner.data.type == 'txt' && this.owner.data.subtype == 'long'
    } else {
      console.debug("Je recherche le owner._amark_type")
      return this.owner._amark_type == 'txt' && this.owner._amark_subtype == 'long'
    }
  }

  set titre(v){
    this.init()
    this.spanTitre.innerHTML = v
    this.spanTitre.classList.remove('hidden')
  }
  /**
   * Modification de la fonte
   * 
   * @param {String} f  Famille à utiliser (font-family)
   * @param {String} s  [optionnel] Font size
   * 
   */
  setFont(f, s){
    this.init()
    this.textField.style.fontFamily = f
    s && (this.textField.style.fontSize = s)
  }

  onClickOK(){
    this.data.setMethod(this.getValue())
    this.hide()
  }

  onClickCancel(){
    this.data.setMethod(null)
    this.hide()
  }

  getValue(){
    if ( this.isLongText ) {
      return this.textarea.value
    } else {
      return this.textField.value
    }
  }

  set value(v){
    this.init()
    if ( this.isLongText ) {
      this.textarea.value = v.replace(/__RET__/g,"\n")
    } else {
      this.textField.value = v
    }
  }

  set setMethod(m){ Object.assign(this.data, {setMethod: m})}

  build_and_observe(){
    this.build()
    this.observe()
  }
  build(){
    const o = DCreate('DIV', {class:'mini_editeur hidden'})
    this.spanTitre = DCreate('DIV', {class:'titre hidden'})
    o.appendChild(this.spanTitre)
    this.textField = DCreate('INPUT',{type:'text', value:this.value})
    o.appendChild(this.textField)
    this.textarea = DCreate('TEXTAREA',{})
    o.appendChild(this.textarea)
    const divBoutons = DCreate('DIV', {class:'buttons right'})
    divBoutons.appendChild(DCreate('BUTTON', {text:'Renoncer', class:'cancel'}))
    // divBoutons.appendChild(DCreate('BUTTON', {text:'OK', class:'ok'}))
    o.appendChild(divBoutons)
    this.obj = o
    this.data.titre && (this.titre = this.data.titre)
    document.body.appendChild(o)
  }
  observe(){
    // listen(this.btnOK,      'click', this.onClickOK.bind(this))
    listen(this.btnCancel,  'click', this.onClickCancel.bind(this))
    listen(this.obj,        'dblclick', e => {return stopEvent(e)})
    listen(this.textField,  'focus', this.onFocusTextField.bind(this))
    listen(this.textField,  'blur',  this.onBlurTextField.bind(this))
    listen(this.textarea,   'focus', this.onFocusTextField.bind(this))
    listen(this.textarea,   'blur',  this.onBlurTextField.bind(this))
    draggable(this.obj)
  }

  onFocusTextField(e){
    UI.desactiveCurrentShortcuts()
    window.onkeypress = this.onKeyPress.bind(this)
    window.onkeyup    = this.onKeyUp.bind(this)
    window.onkeydown  = this.onKeyDown.bind(this)
  }
  onBlurTextField(e){
    UI.reactiveCurrentShortcuts()
  }

  onKeyPress(e){
    // console.log("e.key = '%s'", e.key)
    if (e.key == 'Enter') {
      if ( this.isLongText ) {
        if ( e.metaKey ) {
          
        } else {
          return true 
        }
      } else { 
        return this.onClickOK.call(this, e) 
      }
    }
    else if (e.key == 'Backspace') return stopEvent(e)
    else return true
  }
  onKeyDown(e){
    if (this.isLongText && e.metaKey && e.key == 'Enter') {
      return this.onClickOK.call(this, e)
    }
  }
  onKeyUp(e){
    // console.log("e.key = '%s'", e)
    if (e.key == 'Escape'){ 
      return this.onClickCancel.call(this,e)
    }
  }

  /**
   * Positionne le mini-éditeur
   * 
   * @param {Hash} pos Position
   *      :top    Position verticale (nombre de pixels)
   *      :left   Position horizontale (nombre de pixels)
   *      :fixed  Si true, on positionne en fixed
   * 
   * Nota Bene
   * ---------
   *  Il faut absolument positionner l'éditeur avant de le montrer,
   *  (méthode 'show') sinon la page va scroller jusqu'à lui tout en
   *  bas, et rester en bas tandis que l'éditeur aura peut-être été 
   *  placé en haut.
   *  Le mieux est tout simplement d'envoyer la position à la méthode
   *  show
   */
  positionne(pos){
    this.top  = pos.top
    this.left = pos.left
    this.obj.style.position = pos.fixed ? 'fixed' : 'absolute'
  }

  set top(v){ 
    if ( 'number' == typeof v ) v = px(v)
    this.obj.style.top = v 
  }
  set left(v){
    if ( 'number' == typeof v ) v = px(v)
    this.obj.style.left = v
  }

  get btnOK(){
    return this._btnok || (this._btnok = DGet('button.ok', this.obj))
  }
  get btnCancel(){
    return this._btncancel || (this._btncancel = DGet('button.cancel', this.obj))
  }
}
