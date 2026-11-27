import { DCreate, DGet, listen, stopEvent, cmdKey } from './dom.js'
import { onRelease, isCleanRelease } from './KeyRelease.js'
import { px, uiZoom, keepInView, escapeLt } from './handies.js'
import { UI } from './UI.js'
import { t } from './i18n.js'
import { addPanelHead } from './Panneau.js'
import { AMark_Editor } from './AMark_Editor.js'
import { AMARQUES_TYPES, typeHasSubtype } from './Constants.js'
import { supize, plainSup } from './lib/exposants.js'
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


// Touches des valeurs de la liste des suggestions (chiffres puis lettres)
const LETTERS = '123456789abcdefghijklmnopqrstuvwxyz'
// Valeur affichée (texte long : retours chariot)
const displayedValue = v => String(v).replace(/__RET__/g, ' ')

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
    this.data.suggestions && this.setSuggestions(this.data.suggestions())
    this.setVariableField()
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

  // Titre (p.e. « Nom de l'accord ») : dans l'entête du panneau (#262)
  set titre(v){
    this.init()
    this.headTitle.innerHTML = v
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
    // Motif : sa variable (refusée → l'éditeur reste ouvert)
    if ( this.isMotif && false === this.owner.setVariable(this.variableField.value) ) {
      this.variableField.focus()
      return
    }
    this.data.setMethod(this.getValue())
    this.hide()
  }

  // Type de la marque éditée (ou créée, cf. AMark_Editor)
  get markType(){
    return this.isAMark ? this.owner.type : this.owner._amark_type
  }
  get isMotif(){ return this.markType == 'mot' }

  /**
   * Champ « Variable » du motif : affiché pour un motif seulement,
   * avec la variable actuelle
   */
  setVariableField(){
    this.variableRow.classList[this.isMotif ? 'remove' : 'add']('hidden')
    this.variableField.value = (this.isAMark ? this.owner.data.variable : this.owner._amark_variable) || ''
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
    this.textField = DCreate('INPUT',{type:'text', value:this.value})
    o.appendChild(this.textField)
    this.textarea = DCreate('TEXTAREA',{})
    // Texte long : où trouver les variables
    this.variablesHint = DCreate('DIV', {class:'variables-hint', text:t('ui.marks.variable.hint', {menu: `${t('ui.menu.tools_menu')} > ${t('ui.menu.variable')}`})})
    // Valeurs déjà utilisées (data.suggestions, cf. AMark_Editor) : menu
    // au-dessus du champ, ou liste seule dans la partie droite du panneau
    // (le reste à gauche)
    this.suggestMenu = DCreate('SELECT', {class:'suggest-menu hidden'})
    this.suggestList = DCreate('DIV', {class:'suggest-list', tabindex:'0'})
    this.suggestPane = DCreate('DIV', {class:'suggest-pane hidden', inner:[this.suggestList]})
    // Motif : nom de sa variable (`{<variable>}` dans les textes)
    this.variableField = DCreate('INPUT', {type:'text', class:'variable'})
    this.variableRow   = DCreate('DIV', {class:'variable-row hidden', inner:[
        DCreate('LABEL', {text:t('ui.marks.variable.label')})
      , this.variableField
    ]})
    // Aspect (#262, « carte à entête ») : entête avec le titre et le
    // bouton du type, champ dans le corps, valeurs déjà utilisées en
    // grille sous le champ, « Renoncer » et « OK » à droite du pied
    o.appendChild(DCreate('DIV', {class:'body', inner:[DCreate('DIV', {class:'fields', inner:[this.suggestMenu, this.textField, this.textarea, this.variablesHint, this.variableRow]}), this.suggestPane]}))
    const divBoutons = DCreate('DIV', {class:'buttons'})
    // « Renoncer » hors de l'ordre des tabulations ; OK le dernier
    divBoutons.appendChild(DCreate('BUTTON', {text:t('ui.buttons.renounce'), class:'cancel btn-close', tabindex:'-1'}))
    divBoutons.appendChild(DCreate('BUTTON', {text:t('ui.buttons.ok'), class:'ok btn-default'}))
    o.appendChild(divBoutons)
    this.obj = o
    document.body.appendChild(o)
    addPanelHead(o, {title: t('ui.panels.mark_editor.title'), onClose: this.onClickCancel.bind(this), place: false})
    const head = o.querySelector(':scope > div.panneau-head')
    this.headTitle = head.querySelector('span.panneau-title')
    // Marque d'analyse : changement de son type (de son sous-type
    // d'abord quand elle en a un). En création : retour au choix du type.
    // Dans l'entête, à droite
    let btnType = null
    if ( this.isAMark ) {
      btnType = DCreate('BUTTON', {text:this.typeButtonLabel, class:'type'})
    } else if ( this.data.onTypeButton ) {
      btnType = DCreate('BUTTON', {text:this.data.typeButtonLabel || t('ui.buttons.type'), class:'type'})
    }
    const spacer = head.querySelector('span.panneau-spacer')
    btnType ? spacer.replaceWith(btnType) : spacer.remove()
    this.data.titre && (this.titre = this.data.titre)
  }
  observe(){
    listen(this.btnOK,      'click', this.onClickOK.bind(this))
    listen(this.btnCancel,  'click', this.onClickCancel.bind(this))
    this.btnType && listen(this.btnType, 'click', this.onClickType.bind(this))
    listen(this.obj,        'click', e => e.stopPropagation())
    listen(this.obj,        'dblclick', e => {return stopEvent(e)})
    listen(this.textField,  'focus', this.onFocusTextField.bind(this))
    listen(this.textField,  'blur',  this.onBlurTextField.bind(this))
    listen(this.textField,  'keydown', this.onKeyDownTextField.bind(this))
    listen(this.textarea,   'focus', this.onFocusTextField.bind(this))
    listen(this.textarea,   'blur',  this.onBlurTextField.bind(this))
    listen(this.variableField, 'focus', this.onFocusTextField.bind(this))
    listen(this.variableField, 'blur',  this.onBlurTextField.bind(this))
    listen(this.suggestMenu, 'change', this.onSuggestMenu.bind(this))
    listen(this.suggestList, 'click', this.onClickSuggestion.bind(this))
    listen(this.suggestList, 'keydown', this.onKeyDownSuggestions.bind(this))
    listen(this.suggestList, 'keypress', this.onKeyPressSuggestions.bind(this))
    listen(this.suggestList, 'focus', this.onFocusTextField.bind(this))
    listen(this.suggestList, 'blur',  this.onBlurTextField.bind(this))
    listen(this.obj,        'keypress', this.onKeyPress.bind(this))
    listen(this.obj,        'keydown',  this.onKeyDown.bind(this))
    listen(this.obj,        'keyup',    this.onKeyUp.bind(this))
  }

  /**
   * Valeurs déjà utilisées proposées : +sug+ = {mode: 'menu'|'panel',
   * values: [...]}, ou null (aucune)
   */
  setSuggestions(sug){
    const values = (sug && sug.values) || []
    const mode   = values.length ? sug.mode : null
    this.suggestValues = values
    this.suggestData   = sug
    // Chiffre tapé en tête du champ : valeur de ce numéro (panneau)
    this.digitChoice = mode == 'panel' && !!sug.digits
    this.suggestMenu.innerHTML = ''
    this.suggestList.innerHTML = ''
    if ( mode == 'menu' ) {
      this.suggestMenu.appendChild(DCreate('OPTION', {value:'', text:t('ui.marks.suggestions.menu_title')}))
      const menuText = (sug.menuText || (v => v))
      values.forEach((v, i) => this.suggestMenu.appendChild(DCreate('OPTION', {value:String(i), text:escapeLt(plainSup(displayedValue(menuText(v))))})))
      this.suggestMenu.selectedIndex = 0
    } else if ( mode == 'panel' ) {
      values.forEach((v, i) => {
        const letter = i < LETTERS.length ? LETTERS[i] : ''
        this.suggestList.appendChild(DCreate('DIV', {class:'suggestion', 'data-index':String(i), inner:[
            DCreate('SPAN', {class:'letter', text:letter})
          , DCreate('SPAN', {class:'value',  text:sug.philnote ? escapeLt(displayedValue(v)) : supize(escapeLt(displayedValue(v)))})
        ]}))
      })
      this.suggestList.scrollTop = 0
    }
    this.suggestMenu.classList[mode == 'menu' ? 'remove' : 'add']('hidden')
    this.suggestPane.classList[mode == 'panel' ? 'remove' : 'add']('hidden')
    this.obj.classList[mode == 'panel' ? 'add' : 'remove']('with-suggestions')
    this.suggestList.classList[sug && sug.philnote ? 'add' : 'remove']('philnote')
  }

  // Choix d'une valeur : appliquée tout de suite (sans passer par OK)
  chooseSuggestion(index){
    const v = this.suggestValues && this.suggestValues[index]
    if ( undefined === v ) return
    const toField = this.suggestData && this.suggestData.toField
    this.value = toField ? toField(v) : v
    this.onClickOK()
  }
  onSuggestMenu(e){
    const index = this.suggestMenu.value
    this.suggestMenu.selectedIndex = 0
    index !== '' && this.chooseSuggestion(Number(index))
  }
  onClickSuggestion(e){
    const div = e.target.closest('div.suggestion')
    div && this.chooseSuggestion(Number(div.dataset.index))
  }
  // Liste active : une lettre choisit la valeur
  onKeyDownSuggestions(e){
    if ( e.metaKey || e.ctrlKey || e.altKey || e.key.length != 1 ) return
    e.stopPropagation()
    const index = LETTERS.indexOf(e.key)
    if ( index < 0 ) return
    return onRelease(e, () => this.chooseSuggestion(index))
  }
  // Chiffre (1 à 9) tapé en tête du champ, vide ou entièrement
  // sélectionné : valeur déjà utilisée de ce numéro, appliquée
  onKeyDownTextField(e){
    if ( !this.digitChoice || e.metaKey || e.ctrlKey || e.altKey ) return
    if ( !/^[1-9]$/.test(e.key) ) return
    const f = this.textField
    const whole = f.value == '' || (f.selectionStart == 0 && f.selectionEnd == f.value.length)
    if ( !whole || undefined === this.suggestValues[LETTERS.indexOf(e.key)] ) return
    const index = LETTERS.indexOf(e.key)
    return onRelease(e, () => this.chooseSuggestion(index))
  }
  onKeyPressSuggestions(e){
    if ( e.key.length == 1 ) e.stopPropagation()
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
    if ( !this.isAMark && this.data.onTypeButton ) {
      this.hide()
      this.data.onTypeButton.call(null)
      return stopEvent(e)
    }
    const r = this.btnType.getBoundingClientRect()
    const x = Math.round(r.left), y = Math.round(r.bottom)
    const editor = new AMark_Editor({
        onReleaseMethod:  this.onTypeChosen.bind(this)
      , event:            {clientX: x, clientY: y, pageX: x + window.scrollX, pageY: y + window.scrollY}
      , onlyType:         true
      , type:             typeHasSubtype(this.owner.type) ? this.owner.type : undefined
      , markId:           this.owner.id
    })
    editor.proceed()
    return stopEvent(e)
  }
  onTypeChosen(data){
    if ( data ) {
      // Fin de portion de la forme : son texte est le nom du début
      const value = data.start ? data.content : this.getValue()
      if ( data.start ) { this.owner.data.start = data.start }
      else { delete this.owner.data.start }
      // Titre de mise en page : son niveau
      if ( data.level ) { this.owner.data.level = data.level }
      this.owner.changeType(data.type, data.subtype)
      const msg = AMARQUES_TYPES[data.type] && AMARQUES_TYPES[data.type].message
      msg && (this.titre = msg)
      this.btnType.textContent = this.typeButtonLabel
      this.obj.classList[this.isLongText ? 'add' : 'remove']('longtext')
      this.setVariableField()
      keepInView(this.obj)
      this.value = value
    }
    const field = this.isLongText ? this.textarea : this.textField
    field.focus()
  }

  // Touches de l'éditeur écoutées sur l'éditeur lui-même (celles des
  // champs ne sortent pas du panneau, cf. addPanelHead)
  onFocusTextField(e){
    UI.desactiveCurrentShortcuts()
  }
  onBlurTextField(e){
    UI.reactiveCurrentShortcuts()
  }

  onKeyPress(e){
    // console.log("e.key = '%s'", e.key)
    // Bouton sélectionné (Tab) : Entrée le joue (comportement normal)
    if ( e.target.tagName == 'BUTTON' ) return true
    if (e.key == 'Enter') {
      if ( this.isLongText ) {
        if ( cmdKey(e) ) {
          
        } else {
          return true 
        }
      } else { 
        return onRelease(e, () => this.onClickOK.call(this, e))
      }
    }
    else if (e.key == 'Backspace') return stopEvent(e)
    else return true
  }
  onKeyDown(e){
    if (this.isLongText && cmdKey(e) && e.key == 'Enter') {
      return onRelease(e, () => this.onClickOK.call(this, e))
    }
  }
  onKeyUp(e){
    // console.log("e.key = '%s'", e)
    if (e.key == 'Escape' && isCleanRelease(e)){ 
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
