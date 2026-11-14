import { DCreate, DGet, listen, stopEvent, cmdKey } from './dom.js'
import { px, uiZoom, keepInView } from './handies.js'
import { UI } from './UI.js'
import { t } from './i18n.js'
import { addPanelHead } from './Panneau.js'
import { AMark_Editor } from './AMark_Editor.js'
import { AMARQUES_TYPES, typeHasSubtype } from './Constants.js'
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
    keepInView(this.obj)
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
    const divBoutons = DCreate('DIV', {class:'buttons'})
    divBoutons.appendChild(DCreate('BUTTON', {text:t('ui.buttons.renounce'), class:'cancel btn-close', style:'float:left;'}))
    // Marque d'analyse : changement de son type (de son sous-type
    // d'abord quand elle en a un)
    if ( this.isAMark ) {
      divBoutons.appendChild(DCreate('BUTTON', {text:this.typeButtonLabel, class:'type'}))
    }
    // Bouton OK toujours le dernier, à droite
    divBoutons.appendChild(DCreate('BUTTON', {text:t('ui.buttons.ok'), class:'ok btn-default'}))
    o.appendChild(divBoutons)
    this.obj = o
    this.data.titre && (this.titre = this.data.titre)
    document.body.appendChild(o)
    addPanelHead(o, {title: t('ui.panels.mark_editor.title'), onClose: this.onClickCancel.bind(this)})
  }
  observe(){
    listen(this.btnOK,      'click', this.onClickOK.bind(this))
    listen(this.btnCancel,  'click', this.onClickCancel.bind(this))
    this.btnType && listen(this.btnType, 'click', this.onClickType.bind(this))
    listen(this.obj,        'click', e => e.stopPropagation())
    listen(this.obj,        'dblclick', e => {return stopEvent(e)})
    listen(this.textField,  'focus', this.onFocusTextField.bind(this))
    listen(this.textField,  'blur',  this.onBlurTextField.bind(this))
    listen(this.textarea,   'focus', this.onFocusTextField.bind(this))
    listen(this.textarea,   'blur',  this.onBlurTextField.bind(this))
  }

  get typeButtonLabel(){
    return t(typeHasSubtype(this.owner.type) ? 'ui.buttons.subtype' : 'ui.buttons.type')
  }

  get isAMark(){
    return !!(this.owner && this.owner.data && this.owner.data.type && 'function' == typeof this.owner.setValue)
  }

  /**
   * Choix d'un nouveau type pour la marque éditée (menu des types
   * habituel), le texte en cours d'édition étant conservé
   */
  onClickType(e){
    const r = this.btnType.getBoundingClientRect()
    const x = Math.round(r.left), y = Math.round(r.bottom)
    const editor = new AMark_Editor({
        onReleaseMethod:  this.onTypeChosen.bind(this)
      , event:            {clientX: x, clientY: y, pageX: x + window.scrollX, pageY: y + window.scrollY}
      , onlyType:         true
      , type:             typeHasSubtype(this.owner.type) ? this.owner.type : undefined
    })
    editor.proceed()
    return stopEvent(e)
  }
  onTypeChosen(data){
    if ( data ) {
      // Fin de portion de la forme : son texte est le nom du début
      const value = data.start ? data.content : this.getValue()
      this.owner.type     = data.type
      this.owner.subtype  = data.subtype
      if ( data.start ) { this.owner.data.start = data.start }
      else { delete this.owner.data.start }
      const msg = AMARQUES_TYPES[data.type] && AMARQUES_TYPES[data.type].message
      msg && (this.titre = msg)
      this.btnType.textContent = this.typeButtonLabel
      this.obj.classList[this.isLongText ? 'add' : 'remove']('longtext')
      keepInView(this.obj)
      this.value = value
    }
    const field = this.isLongText ? this.textarea : this.textField
    field.focus()
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
        if ( cmdKey(e) ) {
          
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
    if (this.isLongText && cmdKey(e) && e.key == 'Enter') {
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

  // Position en px de la page, élément zoomé (cf. --ui-zoom)
  set top(v){ 
    if ( 'number' == typeof v ) v = px(v / uiZoom())
    this.obj.style.top = v 
  }
  set left(v){
    if ( 'number' == typeof v ) v = px(v / uiZoom())
    this.obj.style.left = v
  }

  get btnOK(){
    return this._btnok || (this._btnok = DGet('button.ok', this.obj))
  }
  get btnCancel(){
    return this._btncancel || (this._btncancel = DGet('button.cancel', this.obj))
  }
  get btnType(){
    return this._btntype || (this._btntype = DGet('button.type', this.obj))
  }
}
