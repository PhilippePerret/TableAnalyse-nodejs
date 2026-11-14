import { not } from './lib/common.js'
import { erreur } from './lib/Message.js'
import { GetterInList } from './GetterInList.js'
import { DCreate, DGet, listen } from './dom.js'
import { px, uiZoom, keepInView } from './handies.js'
import { addPanelHead } from './Panneau.js'
import { UI } from './UI.js'
import { Editeur } from './Editeur.js'
import { AMARQUES_TYPES, CADENCES, TYPES_NOTES, TYPES_CADRE, TYPES_SEGMENT, TYPES_FORME } from './Constants.js'
import { AObjet } from './AObjet.js'
import { Forme } from './Forme.js'
import { t } from './i18n.js'
/**
 * AMark_Editor
 * ------------
 * 
 * L'édition d'une "marque d'analyse" (AMark) étant assez complexe,
 * on se sert de cette classe pour créer ou éditer les marques.
 * 
 * Une marque est caractérisée par :
 *    - son type 
 *    - son sous-type (éventuellement)
 *    - son texte (le plus souvent)
 * 
 * Fonctionnement :
 * 
 *  const editor = new AMark_Editor(<data>)
 *  editor.proceed()
 * 
 *  <data> doit définir :
 *    - onReleaseMethod     
 *      La méthode qui recevra en premier argument les données 
 *      récoltée
 *    - event 
 *      L'évènement pour trouver la position de la boite
 * 
 *    OPTIONNEL
 *    ---------
 *    - mettre 'onlyType' à true pour ne choisir que le type et
 *      sous-type de la marque
 *    - 'type' : type déjà connu (on commence alors par le sous-type)
 *    - 'markId' : identifiant de la marque éditée (le cas échéant)
 */


export class AMark_Editor {

constructor(data){
  this.data   = data
  this.event  = data.event
  data.type && (this._amark_type = data.type)

  /* Pour écrire toutes les coordonnées
  var xy = {}
  for(var k in this.event){
    if ( k.endsWith('X') || k.endsWith('Y')) Object.assign(xy, {[k]: this.event[k]})
  }
  //*/

}

/**
 * = main =
 * 
 * Méthode qui procède à l'édition. On repasse toujours par cette
 * function, jusqu'à ce que toutes les valeurs nécessaires soient
 * définies. 
 * 
 */
proceed(){
  // console.log("-> proceed() / amark_data = ", this.amark_data)
  if ( !this.amark_type ) return this.getAMarkType()
  if ( this.isRequiringSubType && !this.amark_subtype) return this.getAMarkSubType()
  if ( this.isFormEnd && !this._amark_start ) return this.getFormStart()
  if ( not(this.data.onlyType) && this.isRequiringContent && undefined == this.amark_content) return this.getAMarkContent()
  this.hasAutoContent && this.setAutoContent()
  this.finishWith(this.amark_data)
}

/**
 * Pour finir, on envoie les données à la méthode qui les attend
 * pour construire ou reconstruire l'objet.
 * 
 * En cas d'annulation, +data+ est null
 * 
 */
finishWith(data){
  this.data.onReleaseMethod.call(null, data)
}

/**
 * Les DATA de la Marque d'analyse
 * 
 */
get amark_data(){
  const data = {
      type:     this.amark_type
    , prolong:  !!this.hasProlong
    , subtype:  this.amark_subtype
    , content:  this.amark_content
    , top:      this.position.top   + this.rectifTopPerType
    , left:     this.position.left  + this.rectifLeftPerType
  }
  // Fin de portion de la forme : sa marque de début
  this.isFormEnd && (data.start = this._amark_start)
  // Marque de forme : endroit du clic, pour la placer sur sa mesure
  // (non enregistré, cf. AMark.createNew)
  this.amark_type == 'frm' && (data.clickX = this.event.pageX)
  return data
}

get amark_type()    {return this._amark_type}
get amark_subtype() {return this._amark_subtype}
get amark_content() {return this._amark_content}

/**
 * Rectification du left et du top par rapport au clic de souris
 * en fonction du type de marque
 */
get rectifLeftPerType(){
  return this.dataOfType.ajustX || 0
}
get rectifTopPerType(){
  return this.dataOfType.ajustY || 0
}

/**
 * Les méthodes pour obtenir les valeurs des données
 * 
 */

/**
 * Méthode pour obtenir le type de la marque
 */
getAMarkType(){
  var params = {}
  Object.assign(params, this.positionFixed)
  console.log("Paramètres envoyés à GetterInList (notamment pour le positionner)", params)
  this.getterOfAMarkType.show(params)
  this._datatype      = null
  this._gettersubtype = null
  this._editorcontent = null
}
onChooseType(type){
  if ( type ) {
    this._amark_type = type
    this.proceed()
  }
}
/**
 * Méthode pour obtenir le sous-type de la marque
 * (si nécessaire)
 */
getAMarkSubType(){
  this.getterOfAMarkSubtype.show(this.positionFixed)
}
onChooseSubtype(subtype){
  this._amark_subtype = subtype
  this.proceed()
}
/**
 * Fin de portion de la forme : choix de la marque de début dans un menu
 * (toujours proposé, même s'il n'y en a qu'une). Les portions qui ont
 * déjà leur fin (autre que la marque éditée) sont grisées. Sans marque
 * de début, ou en renonçant, retour au choix du sous-type.
 */
getFormStart(){
  const startType = TYPES_FORME[this.amark_subtype].startOf
  const forms  = AObjet.select(ao => ao.isForme)
  const starts = Forme.sorted(forms.filter(ao => ao.subtype == startType))
  if ( starts.length == 0 ) {
    erreur(t('errors.marks.no_form_start', {name: TYPES_FORME[startType].name}))
    return this.backToSubtype()
  }
  const self   = this.data.markId && AObjet.get(this.data.markId)
  const hasEnd = m => forms.some(ao => ao.data.start == m.id && ao.id != this.data.markId)
  const menu = DCreate('SELECT', {class:'form-start-menu', inner: starts.map(m => {
    const o = DCreate('OPTION', {value: m.id, text: Forme.labelOf(m)})
    o.disabled = hasEnd(m)
    return o
  })})
  const current = self && self.data.start && starts.find(m => m.id == self.data.start)
  const first   = current || starts.find(m => !hasEnd(m))
  first && (menu.value = first.id)
  const btnCancel = DCreate('BUTTON', {class:'btn-close', text:t('ui.buttons.renounce'), style:'float:left;'})
  const btnOK     = DCreate('BUTTON', {class:'btn-default', text:t('ui.buttons.ok')})
  btnOK.disabled = !first
  const o = DCreate('DIV', {class:'form-start-panel', inner: [
      DCreate('P', {text: t('ui.marks.forms.end_of')})
    , menu
    , DCreate('DIV', {class:'buttons', inner:[btnCancel, btnOK]})
  ]})
  document.body.appendChild(o)
  const close = (id) => { o.remove() ; UI.reactiveCurrentShortcuts() ; this.onChooseFormStart(id) }
  addPanelHead(o, {title: TYPES_FORME[this.amark_subtype].name, onClose: () => close(null)})
  listen(btnCancel, 'click', e => { e.stopPropagation() ; close(null) })
  listen(btnOK,     'click', e => { e.stopPropagation() ; close(Number(menu.value)) })
  // Entrée dans le menu : validation
  listen(menu, 'keydown', e => { if ( e.key == 'Enter' && !btnOK.disabled ) { e.preventDefault() ; close(Number(menu.value)) } })
  listen(o, 'click', e => e.stopPropagation())
  listen(o, 'dblclick', e => e.stopPropagation())
  UI.desactiveCurrentShortcuts()
  o.style.top  = px(this.positionFixed.top / uiZoom())
  o.style.left = px(this.positionFixed.left / uiZoom())
  keepInView(o)
  menu.focus()
}
onChooseFormStart(id){
  if ( null == id ) return this.backToSubtype()
  this._amark_start   = id
  this._amark_content = AObjet.get(id).content
  this.proceed()
}
// Retour au choix du sous-type (getter reconstruit pour retrouver ses
// raccourcis)
backToSubtype(){
  this._amark_subtype = null
  this._gettersubtype && this._gettersubtype.obj.remove()
  this._gettersubtype = null
  this.getAMarkSubType()
}

/**
 * Bouton « Type… » du panneau de sous-type : retour au choix du type
 * (les getters sont reconstruits pour retrouver leurs raccourcis)
 */
onWantTypes(){
  this._amark_type    = null
  this._amark_subtype = null
  this._amark_start   = null
  ;[this._gettertype, this._gettersubtype].forEach(g => g && g.obj.remove())
  this._gettertype    = null
  this.getAMarkType()
}

/**
 * Méthode pour obtenir le contenu textuel de l amark
 */
getAMarkContent(){
  this.editorOfAMarkContent.value = this.amark_content || this.defaultValue
  this.editorOfAMarkContent.show(this.position)
}

/**
 * Méthode de retour du contenu (Editeur.js)
 * 
 * @param {String|Null} content Le contenu ou la valeur null si Renoncer
 * 
 */
onSetContent(content){
  if ( content ) {
    this.hasProlong = content.endsWith('--')
    this._amark_content = this.hasProlong 
      ? content.substring(0, content.length - 2) 
      : content
    // On met toujours une prolongation à une pédale, même lorsqu'elle
    // n'est pas indiquée
    if ( this.amark_type == 'ped' ) this.hasProlong = true
    this.proceed()
  }
}

/**
 * Méthode qui règle le contenu automatique pour les valeurs
 * qui le nécessite. Par exemple pour les cadences.
 * 
 */
setAutoContent(){
  const my = this
  this._amark_content = (function(value){
    switch(value){
      case 'cad':
        return CADENCES[my.amark_subtype].autocontent
      case 'not':
        return TYPES_NOTES[my.amark_subtype].autocontent
      case 'box':
        return TYPES_CADRE[my.amark_subtype].autocontent
      default:
        erreur(t('errors.marks.no_autocontent', {type: my.amark_type}))
        return null
    }
  })(this.amark_type)
}

/**
 * 
 * Méthode d'état, pour savoir si la marque a besoin de telle ou 
 * telle chose (subtype, content)
 * 
 */
get isRequiringSubType(){
  return (this.dataOfType.subdata || undefined != this.dataOfType.subtype)
}
/**
* @return true si un contenu est attendu pour la marque ou la 
*         sous-marque. Pour la sous-marque, le contenu est attendu
*         si .subdata est défini dans les données du type et que le
*         sous-type définit un :default
*/  
get isRequiringContent(){
  if ( this.isRequiringSubType && this.dataOfType.subdata ) {
    return undefined != this.dataOfSubType.default
  } else {
    return undefined != this.dataOfType.default
  }
}
get isFormEnd(){
  return this.amark_type == 'frm' && !!this.amark_subtype && !!TYPES_FORME[this.amark_subtype].startOf
}
get hasAutoContent(){
  return this.dataOfType.autocontent == true
}


// --- PRIVATE ---

// La position des différents "éditeur" (getters de liste, 
// mini-éditeur)
get position(){
  // return this._pos || (this._pos = {top:this.event.layerY, left:this.event.layerX})
  return this._pos || (this._pos = {top:this.event.pageY - 40, left:this.event.pageX - 40})
}
get positionFixed(){
  return this._posfixed || (this._posfixed = {top:this.event.clientY - 40, left:this.event.clientX - 40})
}

// La valeur par défaut, en fonction du type et en fonction du fait
// que ce type a des sous-valeurs
get defaultValue(){
  let defautValue = (function(me){
    if (me.isRequiringSubType) {
      return me.dataOfSubType.default || me.dataOfType.default
    } else {
      return me.dataOfType.default
    }
  })(this)
  if ( 'function' == typeof defautValue ) { 
    defautValue = defautValue.call()
  }
  return defautValue
}

// Les données du type (dans AMARQUES_TYPES)
get dataOfType(){
  return this._datatype || ( this._datatype = AMARQUES_TYPES[this.amark_type])
}
get dataOfSubType(){
  if ( this.dataOfType.subdata ) {
    return this.dataOfType.subdata[this.amark_subtype]
  } else {
    // Si le type ne définit pas sont .subdata dans AMARQUES_TYPES
    return {}
  }
}

/**
 * 
 * Les éditeurs particuliers
 * 
 */

// Éditeur pour obtenir le type
get getterOfAMarkType(){
  return this._gettertype || (this._gettertype = new GetterInList(this.paramsGetterOfType))
}

// Éditeur pour obtenir le sous-type (subtype)
get getterOfAMarkSubtype(){
  return this._gettersubtype || (this._gettersubtype = new GetterInList(this.paramsGetterOfSubtype))
}

// Éditeur pour obtenir le contenu textuel
get editorOfAMarkContent(){
  return this._editorcontent || (this._editorcontent = new Editeur(this, {message:this.dataOfType.message, setMethod: this.onSetContent.bind(this)}) )
}


/**
 * 
 * Les paramètres pour les éditeurs particuliers (getter de liste…)
 * 
 */
get paramsGetterOfType(){
  return {
      values:         Object.values(AMARQUES_TYPES)
    , message:        t('ui.marks.getter.type')
    , onChooseMethod: this.onChooseType.bind(this)
  }
}

// Paramètres pour le getter de sous-type
get paramsGetterOfSubtype(){
  var d = {}
  if ( this.dataOfType.subdata) {
    d = {
        values: Object.values(this.dataOfType.subdata)
      , message: this.dataOfType.message
    }
  } else {
    switch(this.amark_type){
      case 'cad':
        d = {
            values: Object.values(CADENCES)
          , message:t('ui.marks.getter.cadence')
        }
        break
      case 'seg':
        d = {
            values: TYPES_SEGMENT
          , message:t('ui.marks.getter.segment')
        }
        break
      default:
        erreur(t('errors.marks.no_subtype', {type: this.amark_type}))
        return null
    }
  }
  return Object.assign(d, {onChooseMethod: this.onChooseSubtype.bind(this), onTypesMethod: this.onWantTypes.bind(this)})
}

} // AMark_Editor
