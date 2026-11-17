import { DCreate, DGet, listen, stopEvent } from './dom.js'
import { not } from './lib/common.js'
import { erreur, message } from './lib/Message.js'
import { px, escapeLt } from './handies.js'
import { analyseUrl, invoke } from './api.js'
import { draggable, resizable } from './lib/interact.js'
import { AObjet } from './AObjet.js'
import { Current, setModified } from './Current.js'
import { pref } from './Preferences.js'
import { Grid } from './Grid.js'
import { Systeme } from './Systeme.js'
import { Editeur } from './Editeur.js'
import { GetterInList } from './GetterInList.js'
import { AMark_Editor } from './AMark_Editor.js'
import { AMARQUES_TYPES, CADENCES, TYPES_AJUSTABLES, SUBTYPES_AJUSTABLES, TYPES_PHILHARMONIEFONT, TYPES_MISE_EN_PAGE } from './Constants.js'
import { UI } from './UI.js'
import { Forme } from './Forme.js'
import { ExtraitComposer } from './ExtraitComposer.js'
import { t } from './i18n.js'
import { Variables } from './Variables.js'


/**
 * Déplacement avec Maj : la position +ui.position+ ne garde que le
 * déplacement (depuis +left+, +top+) sur l'axe où il est le plus grand
 */
function keepOneAxis(ui, left, top){
  if ( Math.abs(ui.position.left - left) >= Math.abs(ui.position.top - top) ) ui.position.top = top
  else ui.position.left = left
}

export class AMark extends AObjet {

  /**
   * Pour créer un nouvel objet à l'endroit du double-clic
   * 
   * La méthode fonctionne en deux temps :
   *  1) choix du type (type) de la marque (avec un GetterInList)
   *  2) contenu (value) de la marque (avec un Mini-éditeur)
   * 
   * @param {Event}   e       L'event double-click (ou null)
   * @param {Hash}    params  Les données
   */
  static createNew(e, params){
    if ( undefined == params ) {

      const editor = new AMark_Editor({event:e, onReleaseMethod: this.createNew.bind(this, e)})
      return editor.proceed()

    } else if ( null === params ) {

      //
      // Annulation de l'utilisateur
      //
      return

    } else {

      //
      // Paramètres fournis, on peut construire la marque
      //

      /*
      |  Si la grille est activée et que c'est une boite, il faut
      |  ajuster ses données (noter que dans +params+ ne se trouvent
      |  ni sa largeur ni sa hauteur)
      */
      // console.info("CREATE: Marque d'analyse avec données : ", params)
      // Identifiant unique
      Object.assign(params, { id: Current.analyse.newId() })
      // Marque de forme : endroit du clic (non enregistré)
      const clickX = params.clickX
      delete params.clickX
      // Extrait de partition : morceaux des images des systèmes des
      // mesures demandées (abandon si elles sont introuvables), réglés
      // ensuite dans le compositeur ; une copie garde ceux de l'original
      const newExtract = params.type == 'ext' && !params.pieces && !params.image
      params.pieces && (params.pieces = params.pieces.map(p => Object.assign({}, p)))
      if ( newExtract ) {
        const extract = AMExtrait.extractOf(params.content)
        if ( !extract ) return
        Object.assign(params, extract)
      }
      // Saut de page, délimitation : ligne alignée sur les systèmes
      if ( params.type == 'lay' && params.subtype != 'tit' ) params.left = Systeme.first ? Systeme.first.left : 0
      // Numéro de mesure ajouté quand la ligne des numéros existe : il
      // y prend place et renumérote les suivants
      const onMeasureLine = params.subtype == 'mes' && Systeme.hasMeasureLine
      if ( onMeasureLine ) params.line = true
      const newMark = AMark.instanciate(Current.analyse, params)
      newMark.setValues(params)
      newMark.build_and_observe()
      // Motif avec variable : les textes qui l'utilisent
      params.variable && Variables.refresh()
      newMark.toggleFromSelection(/* keep_other = */ false)
      newMark.ajustePosition(newMark.left, newMark.top)
      // Marque de forme : à sa hauteur, au début (ou à la fin) de la
      // mesure cliquée
      if ( newMark.isForme && undefined !== clickX ) {
        newMark.placeAtHeight()
        Forme.placeOnMeasure(newMark, clickX - window.scrollX)
      }
      if ( onMeasureLine ) {
        Systeme.placeMeasureNumbers()
        Systeme.renumberMeasures(newMark)
      }
      newExtract && new ExtraitComposer(newMark, {isNew: true}).open()
      UI.allumeRedLight()

      return newMark
    }
  }

/**
 * @return l'instance de marque (AMark ou AMImage) pour les données
 * +data+
 */
static instanciate(analyse, data){
  switch(data.type){
    case 'img': return new AMImage(analyse, data)
    case 'ext': return new AMExtrait(analyse, data)
    default:    return new AMark(analyse, data)
  }
}

/**
* Pour déplacer la sélection avec les flèches
*/
static moveSelection(sens, multiplicateur, precision){
  if (!Current.analyse) return
  var prop, factor, methode
  switch(sens){
  case 'right': [prop, factor] = ['left', 1]  ; break
  case 'left' : [prop, factor] = ['left',-1]  ; break
  case 'down' : [prop, factor] = ['top',  1]  ; break
  case 'up'   : [prop, factor] = ['top', -1]  ; break
  }
  factor = factor * multiplicateur
  methode = function(aob) { aob[prop] += precision * factor}
  AObjet.eachSelection(methode)
  
}

/**
 * Nettoyage de la table d'analyse (par exemple avant lecture)
 * 
 */
static cleanUp(){
  var restItems = []
  AObjet.items.forEach(aobj => {
    if ( aobj.type != 'systeme' ){
      aobj.destroy()
      aobj = null
    } else {
      restItems.push(aobj)
    }
  })
  AObjet.items      = restItems ; // seulement les systèmes
  AObjet.resetSelection()
}

//##################################################################


constructor(analyse, data){
  super(analyse, data)
  this.type = data.type
}

get prolong(){
  return this.data.prolong
}
set prolong(v){
  this.data.prolong = v
}

/**
 * Quand on double clique sur l'élément => édition pour le moment
 * 
 */
onDoubleClick(e){
  // Marque verrouillée : pas d'édition (menu contextuel) ; son clic crée
  // une marque, comme sur la table (cf. TableAnalyse.onClick)
  if ( this.isLocked ) return stopEvent(e)
  try{
    this.edit()
  } catch(err){
    console.error(err)
  }
  return stopEvent(e)// important
}

/**
 * Édition de la marque
 * 
 * Noter qu'on ne peut pas changer le type de la marque. Pour faire
 * un autre type de marque, supprimer la marque et en refaire une
 * autre
 * 
 */
edit(){
  this.editor = this.editor || new Editeur(this)
  this.editor.value = this.content + (this.hasProlongLine ? '--' : '')
  this.editor.show({top:this.top, left:this.left}, AMARQUES_TYPES[this.type].message)
}

destroy(){
  this.obj.remove() // c'est tout ? OUI
  setModified()
}

/**
 * Définition des valeurs à la création de la marque
 * Elles sont envoyées depuis la méthode AMark.createNew()
 */
setValues(values){
  this.content  = values.content
  this.top      = values.top
  this.left     = values.left
  this.subtype  = values.subtype
  this.prolong  = values.prolong
  this.type     = values.type
  values.width  && (this.width  = values.width);
  values.height && (this.height = values.height);
}

/**
 * Redéfinition de la valeur de la marque d'analyse
 * 
 * Est appelée seulement par le mini-éditeur lorsque l'on veut 
 * modifier le texte de la marque.
 * 
 *  '--' à la fin indique qu'il faut un trait de prolongation
 * 
 */
setValue(newvalue){
  if ( null == newvalue ) return ; // annulation
  // console.log("-> setValue('%s')", newvalue)
  const oldProlong = true && this.prolong

  this.prolong = this.data.prolong = newvalue.endsWith('--')
  
  newvalue = this.prolong ? newvalue.substring(0, newvalue.length - 2) : newvalue

  /**
   * Re-définition du contenu et de la prolongation
   */
  this.content = newvalue

  /**
   * 
   * LIGNE DE PROLONGATION
   * À ajouter ou à retirer
   * 
   */
  if ( this.prolong != oldProlong ) {
    if ( this.prolong && !this.isCadence ){
      this.buildLigneProlongation()
    } else if ( this.hasProlongLine && !this.prolong ) {
      this.destroyLigneProlongation()
      this.data.width = null
    }
  }

  this.isCadence && this.buildPoigneeCadence()

  // Début de portion de la forme renommé : ses fins aussi
  this.isForme && Forme.updateEndsOf(this)

  // Numéro de mesure modifié : il fait foi pour les suivants
  this.subtype == 'mes' && this.data.line && Systeme.renumberMeasures(this)

  // Motif renommé : les textes qui utilisent sa variable
  this.data.variable && Variables.refresh()

  setModified()

}

/**
 * Variable du motif (champ « Variable » de l'éditeur) : `{<variable>}`
 * dans un texte est remplacé par le nom du motif. +v+ vide la retire.
 * 
 * @return false si la variable est refusée (déjà utilisée)
 */
setVariable(v){
  v = Variables.clean(v)
  if ( v == (this.data.variable || '') ) return true
  if ( v && (Variables.isReserved(v) || Variables.motifOf(v, this)) ) {
    erreur(t('errors.marks.variable_used', {name: v}))
    return false
  }
  if ( v ) { this.data.variable = v } else { delete this.data.variable }
  Variables.refresh()
  setModified()
  return true
}

lock(){
  this.data.locked = true
  this.obj.classList.add('locked')
  draggable(this.obj, "disable")
}
unlock(){
  delete this.data.locked
  this.obj.classList.remove('locked')
  draggable(this.obj, "enable")
}
get isLocked(){
  return this.data.locked == true
}

/* --- Groupes : cf. Groups.js --- */

/* --- Classes CSS Methods --- */



addCss(classe){
  if (!this.data.css) this.data.css = []
  if ( not(this.data.css.includes(classe)) ) this.data.css.push(classe)
}
removeCss(classe){
  if ( !this.data.css) return // on ne sait jamais…
  const idx = this.data.css.indexOf(classe)
  if (idx < 0) return // on ne sait jamais
    this.data.css.splice(idx, 1)
  if ( this.data.css.length == 0) {
    delete this.data.css
    this.data.css = undefined
  }
}
/**
* À la construction du tag, pour appliquer ses css ajoutés
*/
applyCss(){
  if ( this.data.css ) {
    this.data.css.forEach(classe => this.obj.classList.add(classe))
  }
  if ( this.data.align ) {
    this.spanContent.classList.add(this.data.align)
  }
  // Numéro de mesure sur la ligne des numéros (boite, cf. AMark.css)
  if ( this.data.line ) this.obj.classList.add('on-line')
}

/**
 * Si le type de la marque est une cadence (markType = 'cad') alors
 * il faut choisir ce type
 * 
 */
chooseCadenceType(){
  // console.log("-> chooseCadenceType")
  this.getterCadenceType.show({top:this.top, left:this.left})
}
/**
 * Méthode qui reçoit le choix du type de la cadence.
 * Elle la consigne et l'affiche.
 * 
 */
onChooseTypeCadence(cadenceType){
  this.cadenceType = cadenceType
  // On marque la cadence
  this.marquerCadence()
}
get getterCadenceType(){
  return this._gettertypecad||(this._gettertypecad = this.buildGetterTypeCadence())
}
buildGetterTypeCadence(){
  var getter = new GetterInList({
    items:Object.values(CADENCES)
    , onChooseMethod: this.onChooseTypeCadence.bind(this)
    , message: t('ui.marks.getter.cadence')
  })
  return getter
}

/**
 * Méthode qui associe l'objet avec son système
 * 
 * L'objet sera mis dans la liste @objets du système et 
 * déplacé avec lui.
 * Les objets permettent aussi de définir le top et le height
 * réel de l'objet.
 * 
 * Pour le détail, consulter la partie "Association de l'objet avec
 * son système" dans le manuel de développement
 */
associateWithSystem(){
  this._sys = null
  this.system && this.system.addObjet(this)
}
get system(){
  return this._sys || (this._sys = Systeme.getSystemeAssociated(this))
}

/**
 * Construction et observation de la marque d'analyse
 * 
 */
build_and_observe(){
  this.build()
  this.observe()
  this.associateWithSystem()
  // Verrouillage enregistré
  this.isLocked && this.lock()
}

/**
 ***********************************
 ***  Construction de la marque  ***
 ***********************************
 */
build(){
  // Main objet
  this.obj = DCreate('DIV', {id:this.domId})
  const o = this.obj
  UI.TableAnalyse.appendChild(o)

  // Borne de la marque de forme (avant le nom de la portion)
  this.isForme && o.appendChild(DCreate('SPAN', {class:'borne'}))

  // Content
  this.contentSpan = this.buildSpanContent()
  o.appendChild(this.contentSpan)
  
  // Style de la marque
  var css = ['amark', 'aobj']
  css.push(this.type)
  if ( TYPES_PHILHARMONIEFONT.includes(this.type) ) css.push('philnote')
  this.subtype && css.push(this.subtype)
  // Titre de mise en page : son niveau
  this.isLayoutTitle && css.push(`t${this.data.level || 1}`)
  o.className = css.join(' ')
  // Saut de page, délimitation : ligne sur toute la largeur des systèmes
  this.isLayoutLine && (o.style.width = px(Number(pref('systeme_width'))))

  // Ligne supplémentaire et bouton "+"
  this.hasVerticalLine && this.buildVerticalLine()
  this.prolong    && this.buildLigneProlongation()
  this.isCadence  && this.buildPoigneeCadence()
  this.isCadence  && this.marquerCadence()
  
  // Position et taille de la marque
  this.data.width   && this.applyWidth(this.width)
  this.data.height  && this.setHeight(this.height)
  this.setLeft(this.left)
  this.setTop(this.top)

  // Css suplémentaires
  this.applyCss()
  this.isForme && (o.title = this.content)
  this.isForme && Forme.shown && this.toggleExpanded(true)

}

buildSpanContent(){
  // La méthode est "détachée" de #build pour pouvoir être surclassée
  // par une méthode de classe fille. Un type image, par exemple, ne
  // construit pas un span mais une balise <img>
  this.spanContent = DCreate('SPAN', {class:'content', text:this.formated_content })
  return this.spanContent
}

changeTextAlignement(css){
  /** 
   ** Applique un style au span content pour aligner le texte de
   ** la façon définie par +css+ 
   **/
  /*
  |  Rien à faire si le texte est déjà aligné comme ça
  */
  if ( this.data.align && this.data.align == css) {
    return
  }
  if ( this.data.align ) {
    this.spanContent.classList.remove(this.data.align)
  }
  this.data.align = css
  /*
  |  On applique l'alignement
  */
  this.spanContent.classList.add(css)
  // Marquer l'analyse modifiée
  setModified()
}

get formated_content(){
  // Saut de page, délimitation : leur nom (et la hauteur)
  if ( this.isLayoutLine ) {
    return escapeLt(TYPES_MISE_EN_PAGE[this.subtype].name + (this.content ? ` : ${this.content}` : ''))
  }
  // Variables (`{title}`, motif…) remplacées par leur valeur
  const content = Variables.replaceIn(this.content)
  if ( this.hasFormatedText && content ) {
    return this.markdownize(this.tunize(escapeLt(content)))
  } else {
    return content && escapeLt(content)
  }
}
markdownize(str){
  return str.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
          .replace(/\*(.+?)\*/g, '<i>$1</i>')
          .replace(/\b_(.+?)_\b/g, '<u>$1</u>')
          .replace(/\^(te|re|er|e)/g, '<sup>$1</sup>')
          .replace(/¡(.+?)¡/g,'<span class="smaller">$1</span>')
          .replace(/__RET__/g, '<br>')
          .replace(/\[#([0-9]+?)\]/, '<span class="goto-tag" data-tag="$1">⎆</span>')
}
tunize(str){
  /** Repère les notes dans +str+ et leur met la bonne fonte **/
  return str.replace(/\b([A-H][\-\+=]?m?)(\+?[24579][\-\+]?)?([\s\.\,])/, '<mus>$1</mus>$3')
}

/* --- Predicate Methods --- */

get isMark(){ return true }

get isCadence(){ return this.type == 'cad'}
get isForme(){ return this.type == 'frm'}
get isLayoutTitle(){ return this.type == 'lay' && this.subtype == 'tit' }
get isLayoutLine(){ return this.type == 'lay' && this.subtype != 'tit' }
get isPartie(){ return this.type == 'bbx' && this.subtype.startsWith('prt')}
get isSection(){ return this.type == 'bbx' && this.subtype.startsWith('sec')}
get isModulation(){return this.type == 'mod'}
get isEmprunt()   {return this.type == 'emp'}
get isText(){return this.type == 'txt'}
get isImage(){return this.type == 'img'}
get isSVGImage(){return this.isImage && this.content.endsWith('.svg')}
get hasFormatedText(){
  return this._hasformtxt || (this._hasformtxt = ['txt','bbx'].includes(this.type))
}

get isGridAjustable(){
  /** @return true si le type est ajustable sur la grille **/
  return this._isgridadjust ||= (this._isgridadjust = ['bbx'].includes(this.type))
}
get isHresizable(){
  return this._ishresize || (this._ishresize = ['bbx','cir','seg','emp','txt','mot'].includes(this.type))
}
get isVresizable(){
  return this._isvresize || (this._isvresize = (['bbx','emp','mot'].includes(this.type) || this.isSegmentVertical))
}
get isSegmentVertical(){
  return this.type == 'seg' && ['v-left','v-right'].includes(this.subtype)
}

get is2dimResizable(){
  // Les objets qui sont redimensionnables dans les deux sens en même
  // temps (comme les images)
  return this._is2dimresize || (this._is2dimresize = (['img'].includes(this.type)))
}

// @return true si le type de marque est ajustable
get isTypeAjustable(){
  return this._isajust || (this._isajust = (TYPES_AJUSTABLES[this.type]||SUBTYPES_AJUSTABLES[this.subtype]))
}

// @return true si la marque a une ligne verticale
get hasVerticalLine(){
  return this.isPartie || this.isSection || this.isModulation
}

/* --- Observation Methods --- */

/**
 * Observation de la marque
 * 
 */
observe(){
  const my = this ;
  listen(this.obj, 'click', this.onClick.bind(this))
  listen(this.obj, 'dblclick', this.onDoubleClick.bind(this))
  if ( this.is2dimResizable ) {
    // Attention : là il s'agit bien d'objets dont les deux dimen-
    // sions se règlent EN MÊME TEMPS qui, donc, conservent leurs
    // proportions
    resizable(this.obj, {
        aspectRatio: true
      , stop: function(e, ui){
          // NON : pour les objets qui sont 2DRezable (aspectRatio = true),
          // on part toujours du principe qu'on en redimensionne un 
          // seul à la fois.
          // const wDiff = my.getWidth.call(my) - my.width
          // const hDiff = my.getHeight.call(my) - my.height
          // AObjet.applyToSelection({me:my, dWidth: wDiff, dHeight:hDiff, adjust:true})
          my.width  = my.getWidth.call(my)
          my.height = my.getHeight.call(my)
          my.ajustePosition.call(my)
      }
    })
  } else if ( this.type == 'ext' ) {
    // Extrait de partition : taille proportionnelle, gardée comme
    // échelle de son image
    resizable(this.obj, {
        aspectRatio: true
      , stop: function(e, ui){ my.onResized() }
    })
  } else if ( this.type == 'cir' ) {
    // Cercle : Maj garde les proportions, Alt garde le centre
    resizable(this.obj, {
        handles: 'e,s,se'
      , keys: true
      , stop: function(e, ui){
          my.width  = my.getWidth.call(my)
          my.height = my.getHeight.call(my)
          my.left   = Math.round(ui.position.left)
          my.top    = Math.round(ui.position.top)
      }
    })
  } else if ( this.isVresizable && this.isHresizable ) {
    resizable(this.obj, {
        handles: 'e,s'
      , start: function(e, ui){ my.memoriseTailleAvantResize() }
      , stop: function(e, ui){
          const wDiff = my.getWidth.call(my) - my.width
          const hDiff = my.getHeight.call(my) - my.height          
          AObjet.applyToSelection({me:my, dWidth: wDiff, dHeight:hDiff, adjust:true})
          // Avant :
          // my.width  = my.getWidth.call(my)
          // my.height = my.getHeight.call(my)
          // my.ajustePosition.call(my)
      }
    })
  } else if ( this.isHresizable ) {
    resizable(this.obj, {
      handles:'e'
    , start: function(e, ui){ my.memoriseTailleAvantResize(/* width only */ true) }
    , stop: function(e, ui){
        const wDiff = my.getWidth.call(my) - my.width
        AObjet.applyToSelection({me:my, dWidth: wDiff})
        // Avant :
        // my.width = my.getWidth.call(my)
      }
    })
  }
  if ( this.hasVerticalLine ) { 
    resizable(this.obj, {
      handles: 's'
    , alsoResize: my.verticalLine
    , stop: function(e, ui) {
        my.height = my.verticalLine.offsetHeight
      }
    }) 
  }
  // Pour tout déselectionner même lors d'un déplacement
  // cf. bug #10
  listen(this.obj, 'mousedown', this.onMouseDown.bind(this))
  // Menu contextuel (clic droit ou Ctrl-clic)
  listen(this.obj, 'contextmenu', this.onContextMenu.bind(this))

  // Draggable
  draggable(this.obj, {
      rien:function(){}
      // Avec ALT, c'est une copie qu'on déplace (duplication),
      // l'original reste en place.
    , helper:function(e){
        if ( !e.altKey ) return this
        const copie = this.cloneNode(true)
        copie.removeAttribute('id')
        copie.style.cursor = 'copy'
        return copie
      }
    , drag:function(e,ui){
        // Maj : un seul axe, celui du plus grand déplacement
        e.shiftKey && keepOneAxis(ui, this.debLeft, this.debTop)
        // Les autres marques sélectionnées suivent la marque déplacée
        if ( !this.forDuplication && my.isSelected ) {
          const diffTop   = this.debTop - ui.position.top
          const diffLeft  = this.debLeft - ui.position.left
          AObjet.eachSelection(ao => {
            if ( ao === my || !ao.obj ) return
            ao.obj.style.top   = px(ao.top - diffTop)
            ao.obj.style.left  = px(ao.left - diffLeft)
          })
        }
      }
    , start:function(e,ui){
        // console.log("Départ : ", {
        //   obj_top: my.top,
        //   obj_left: my.left,
        //   ui_top: ui.position.top,
        //   ui_left: ui.position.left
        // })
        this.debTop  = 0 + parseInt(ui.position.top, 10)
        this.debLeft = 0 + parseInt(ui.position.left,10)
        this.forDuplication = ui.helper[0] !== my.obj
        this.initData = Object.assign({}, my.data)
        // La copie (Alt) n'entre pas dans le groupe de l'original
        delete this.initData.groups
      }
    , stop:function(e,ui){
        // console.log("Fin : ", {
        //   obj_top: my.top,
        //   obj_left: my.left,
        //   ui_top: ui.position.top,
        //   ui_left: ui.position.left
        // })
        // console.log("-> stop")
        // Maj au relâchement : un seul axe, celui du plus grand
        // déplacement (Maj pouvant être pressée en cours de route)
        e.shiftKey && keepOneAxis(ui, this.debLeft, this.debTop)
        const diffTop   = this.debTop - ui.position.top
        const diffLeft  = this.debLeft - ui.position.left
        // console.log("diffLeft = %i / diffTop = %i", diffLeft, diffTop)
        let saufId = null
        if ( this.forDuplication ) {
          // Créer la nouvelle marque
          var newMark = AMark.createNew(e, this.initData)
          newMark.ajustePosition(ui.position.left, ui.position.top)
          // Marque de forme : toujours à sa hauteur
          newMark.isForme && newMark.placeAtHeight()
          saufId = newMark.id
        } else {
          my.ajustePosition(ui.position.left, ui.position.top)
          // Marque de forme : toujours à sa hauteur
          my.isForme && my.placeAtHeight()
          my.justMoved = true // pour empêcher le re-select
          saufId = my.id
        }
        /**
         * S'il y a d'autres objets sélectionnés, on les 
         * déplace aussi
         */
        this.forDuplication || AObjet.eachSelection(ao => {
          if ( ao.id == saufId ) return
          ao.left = ao.left - diffLeft
          ao.top  = ao.top - diffTop
        })
        // La copie devient la sélection
        if ( this.forDuplication ) {
          AObjet.deselectAll()
          AObjet.addToSelection(newMark)
        }
        // console.log("<- stop")
      }
  })
}

/**
 * Sans largeur/hauteur enregistrée, my.width/my.height renverraient
 * la taille APRÈS redimensionnement (différence nulle, rien n'est
 * enregistré). On fixe donc la taille de départ.
 */
memoriseTailleAvantResize(widthOnly){
  this.data.width  || (this.data.width  = this.getWidth())
  widthOnly || this.data.height || (this.data.height = this.getHeight())
}

onClick(e){
  // Marque verrouillée : le clic remonte jusqu'à la table (création)
  if ( this.isLocked ) return
  if ( this.justMoved ) {
    this.justMoved = false
  } else if ( e.shiftKey ) {
    this.toggleFromSelection(/* keep_other = */ true)
  } else {
    // Clic simple : la marque devient la seule sélectionnée
    AObjet.deselectAll()
    AObjet.addToSelection(this)
    // Marque de forme : déplie/replie le nom de la portion
    this.isForme && this.toggleExpanded()
  }
  return stopEvent(e)
}

/**
 * MENU CONTEXTUEL de la marque (clic droit ou Ctrl-clic)
 * Verrouiller, aligner et supprimer s'appliquent à toute la sélection
 * quand la marque en fait partie, à la marque seule sinon.
 */
onContextMenu(e){
  stopEvent(e)
  const T = (k) => t(`ui.mark_context.${k}`)
  const items = [
      {label: T(this.isLocked ? 'unlock' : 'lock'), value: 'lock'}
    , {label: T('edit'), value: 'edit'}
    , {type: 'separator'}
    , {label: T('align'), value: 'align'}
  ]
  this.type == 'acc' && items.push({label: T('align_harmony'), value: 'alignHarmony'})
  this.type == 'har' && items.push({label: T('align_chord'),   value: 'alignChord'})
  this.isForme && items.push({label: T('align_measure'), value: 'alignMeasure'}, {label: T('form_height'), value: 'formHeight'})
  this.type == 'ext' && items.push({type: 'separator'}, {label: t('ui.system_menu.open_image'), value: 'openImage'}, {label: T('reload_image'), value: 'reloadImage', enabled: !!this.data.file})
  items.push({type: 'separator'}, {label: T('delete'), value: 'delete'})
  invoke('menu:popup', {items})
    .then(choice => choice && this.onContextChoice(choice))
    .catch(err => console.error(err))
  return false
}

onContextChoice(choice){
  const targets = this.isSelected && AObjet.selection.length > 1 ? AObjet.dupSelection() : [this]
  switch(choice){
    case 'lock':
      const lock = !this.isLocked
      targets.forEach(m => lock ? m.lock() : m.unlock())
      setModified()
      break
    case 'edit':          return this.edit()
    case 'openImage':     return this.openImage()
    case 'reloadImage':   return this.showImage()
    case 'align':         return targets.forEach(m => m.alignOnSameType())
    case 'alignHarmony':  return this.alignHorizontallyOn('har', 'no_harmony_mark')
    case 'alignChord':    return this.alignHorizontallyOn('acc', 'no_chord_mark')
    case 'alignMeasure':  return targets.filter(m => m.isForme).forEach(m => m.placeOnMeasure())
    case 'formHeight':    return targets.filter(m => m.isForme).forEach(m => m.placeAtHeight())
    case 'delete':
      targets.forEach(m => AObjet.remove(m))
      AObjet.deselectAll()
      setModified()
      break
  }
}

/**
 * Marque de forme : déplie (nom de la portion visible) ou replie (la
 * borne seule). Repliée par défaut.
 */
toggleExpanded(expanded){
  this.obj.classList.toggle('expanded', expanded)
}

/**
 * Marque de forme : alignée sur sa mesure (cf. Forme.placeOnMeasure).
 * Elle reste ensuite déplaçable librement.
 */
placeOnMeasure(){
  Forme.placeOnMeasure(this) && setModified()
}

/**
 * Marque de forme : replacée à sa hauteur (préférence form_height_<niveau>)
 */
placeAtHeight(){
  Forme.placeAtHeight(this) && setModified()
}

/**
 * Aligne verticalement la marque sur la marque de même type (ou type
 * associé) la plus proche en hauteur, dans le même système
 */
alignOnSameType(){
  const sys = Systeme.getSystemeAssociated(this)
  let best = null, ecart = Infinity
  AObjet.items.forEach(ao => {
    if ( ao === this || !(ao instanceof AMark) ) return
    if ( AObjet.areNotAjustable(ao.type, this.type) && AObjet.areNotAjustable(ao.subtype, this.subtype) ) return
    if ( Systeme.getSystemeAssociated(ao) !== sys ) return
    const d = Math.abs(ao.top - this.top)
    if ( d < ecart ) { ecart = d ; best = ao }
  })
  if ( !best ) return message(t('messages.no_same_type_mark'), {duration: 3000})
  this.top = best.top
  setModified()
}

/**
 * Aligne horizontalement la marque sur la marque de type +type+ du
 * même système qui lui correspond (la plus proche horizontalement, à
 * moins d'une demi-largeur de mesure environ)
 */
alignHorizontallyOn(type, msgNone){
  const TOLERANCE = 120
  const sys = Systeme.getSystemeAssociated(this)
  let best = null, ecart = Infinity
  AObjet.items.forEach(ao => {
    if ( ao === this || ao.type != type || Systeme.getSystemeAssociated(ao) !== sys ) return
    const d = Math.abs(ao.left - this.left)
    if ( d < ecart ) { ecart = d ; best = ao }
  })
  if ( !best || ecart > TOLERANCE ) return message(t(`messages.${msgNone}`), {duration: 3000})
  // Alignement sur le texte lui-même (sans les marges de la boite) :
  // centres alignés, ou début du texte si une marque a une ligne de
  // prolongation (son centre n'est pas celui du texte)
  const a = this.textRect, b = best.textRect
  const z = this.obj.currentCSSZoom || 1
  const dx = (this.prolong || best.prolong)
    ? b.left - a.left
    : (b.left + b.width / 2) - (a.left + a.width / 2)
  this.left = Math.round(this.left + dx / z)
  setModified()
}

// Rectangle (écran) du texte de la marque, sans les marges de sa boite
get textRect(){
  const span = this.obj.querySelector('span.content') || this.obj
  const range = document.createRange()
  range.selectNodeContents(span)
  const r = range.getBoundingClientRect()
  return r.width ? r : span.getBoundingClientRect()
}

// cf. issue #10
// Marque déjà sélectionnée : la sélection est gardée (déplacement,
// redimensionnement de toutes les marques sélectionnées)
onMouseDown(e){
  e.shiftKey || this.isSelected || AObjet.deselectAll()
}

toggleFromSelection(keep_other){
  if ( this.isSelected ) {
    AObjet.removeFromSelection(this)
  } else {
    keep_other || AObjet.deselectAll()
    AObjet.addToSelection(this)
  }  
}

setSelected(){
  this.obj.classList.add('selected')
  this.obj.style.zIndex = 10
  this.isSelected = true
}
unsetSelected(){
  this.obj.classList.remove('selected')
  this.obj.style.zIndex = null
  this.isSelected = false
}

/**
 * Ajustement de la position
 * 
 * Si la marque est d'un type ajustable (harmonie, accord, modulation,
 * etc.) et que d'autres marques sont déjà présentes, on l'ajuste à
 * la position de ces marques.
 * 
 */
ajustePosition(left, top){
  const initTop = 0 + this.data.top
  this.left = left
  this.top  = top
  if (pref('adjust_same_mark') && this.isTypeAjustable ) {
    /*
    |  Ajustement précis de l'objet par rapport aux autres marques
    */
    AObjet.checkPositionAndAdjust(this)
  } else if ( this.isGridAjustable && Grid.on ) {
    /*
    |  Sinon, si la grille est activée, on ajuste aussi la longueur
    |  et la hauteur des boites.
    */
    this.width  = this.width
    this.height = this.height
  }
  /*
  |  Si l'objet a été déplacé verticalement, il faut actualiser son
  |  appartenance à un système.
  */
  if ( initTop != this.top ) this.associateWithSystem()
}

/**
 * Traitement de la ligne verticale pour les styles :
 * - Partie (prt)
 * 
 */
buildVerticalLine(){
  const line  = DCreate('SPAN',{class:'vline'})
  this._vline = line
  this.obj.appendChild(line)
  // Caler sa hauteur en fonction de height ou de la hauteur du système
  this.setVerticalLineHeight(this.data.height || (this.system.top - this.data.top))
}

setVerticalLineHeight(v){
  this.verticalLine.style.height = px(v)
}

get verticalLine(){
  return this._vline
}

/**
 * Allongement de la cadence vers la gauche (poignée sur le bord
 * gauche, comme pour les lignes de prolongation à droite)
 */
buildPoigneeCadence(){
  const my = this
  if ( my.hasPoigneeCadence ) return
  my.hasPoigneeCadence = true
  resizable(my.obj, {
      handles: 'w'
    , start: function(e, ui){
        this.rightIni = my.left + my.width
        // Largeur minimale = celle du contenu, pour que la marque
        // ne se déplace jamais
        resizable(my.obj, 'option', 'minWidth', my.contentSpan.offsetWidth)
      }
    , stop: function(e, ui){
        my.left  = ui.position.left
        my.width = this.rightIni - my.left
        my.setLeft(my.left)
        my.setWidth(my.width)
      }
  })
}

/**
 * Type de la cadence (abréviation : C.P., D.C.…) écrit après son trait
 * vertical. Le type est le sous-type de la marque.
 */ 
marquerCadence(){
  const cadence = CADENCES[this.subtype || this.cadenceType]
  let divMType = DGet('.mtype', this.obj)
  if ( !cadence ) return divMType && divMType.remove()
  if ( !divMType ){
    divMType = DCreate('DIV', {class:'mtype'})
    this.obj.appendChild(divMType)
  }
  divMType.textContent = cadence.abbr
  divMType.title = cadence.name
}

/**
 * TRAITEMENT LIGNE DE PROLONGATION
 * 
 */

buildLigneProlongation(){
  const my = this
  if ( my.hasProlongLine ) return
  my.prolongLine = DCreate('SPAN', {class:'pline'})
  my.obj.appendChild(this.prolongLine)
  my.data.width || my.applyWidth(200)
  // Resizable
  resizable(my.obj, {
      alsoResize: my.prolongLine
    , handles: 'e'
    , start: function(e, ui){
      }
    , stop: function(e, ui){
        my.applyWidth(my.prolongLine.offsetWidth + my.contentSpan.offsetWidth + 20)
      }
  })
}

setProlongLineWidth(v){
  // longueur du span content + longueur de la ligne
  const lineWidth = v - (this.contentSpan.offsetWidth + 20)
  this.prolongLine.style.width = px(lineWidth)
  this.width = v
}

get hasProlongLine(){return not(undefined == this.prolongLine) }

destroyLigneProlongation(){
  if (this.hasProlongLine){
    this.prolongLine.remove()
    delete this.prolongLine
    resizable(this.obj, "disable")
  }
}

get height(){
  if ( this.isPartie ) {
    if ( this.obj ) {
      return this.verticalLine.offsetHeight
    } else {
      return this.data.height
    }
  } else {
    return super.height
  }
}
set height(v){
  this.isPartie && this.setVerticalLineHeight(v)
  super.height = v
}

applyWidth(v) {
  const my  = this
  if ( my.hasProlongLine ) {
    my.setProlongLineWidth(v)
  } else {
    this.setWidth(this.width)
  }
}

/**
 * Changement du type (et du sous-type) d'une marque construite : elle
 * est reconstruite pour prendre tout ce qui dépend du type (poignées de
 * redimensionnement, ligne verticale, police…) puis replacée comme une
 * marque de ce type (marque de forme : à sa hauteur et sur sa mesure ;
 * autres : ajustée sur les marques de même type)
 */
changeType(type, subtype){
  // Extrait de partition : pas de changement de type (ses données ne
  // concernent que lui)
  if ( type != this.type && [type, this.type].includes('ext') ) return erreur(t('errors.marks.extract_type'))
  const wasMotif = this.type == 'mot'
  this.type    = type
  this.subtype = subtype
  if ( !this.obj ) return
  this.rebuild()
  // Motif à variable devenu autre chose (ou l'inverse) : textes actualisés
  this.data.variable && wasMotif != (type == 'mot') && Variables.refresh()
  if ( this.isForme ) {
    this.placeAtHeight()
    this.placeOnMeasure()
  } else {
    this.ajustePosition(this.left, this.top)
  }
}

rebuild(){
  const selected = this.isSelected
  ;['_ishresize', '_isvresize', '_is2dimresize', '_isajust', '_hasformtxt', '_isgridadjust'].forEach(k => delete this[k])
  delete this.prolongLine
  this._vline = null
  this.hasPoigneeCadence = false
  this.obj.remove()
  this.build()
  this.observe()
  this.isLocked && this.lock()
  selected && this.setSelected()
}

get type(){return this._type}
set type(t){
  const type_ini = `${this.data.type}`
  this.obj && this._type && this.obj.classList.remove(this._type)
  this._type = t
  this.data.type = t
  this.obj && this.obj.classList.add(this._type)
  this.obj && this.obj.classList.toggle('philnote', TYPES_PHILHARMONIEFONT.includes(t))
  this.obj && t != 'cad' && this.obj.querySelectorAll('div.mtype').forEach(e => e.remove())
  t != type_ini && setModified()
}
get subtype(){return this._subtype || (this._subtype = this.data.subtype)}
set subtype(v){
  // On retire le sous-type éventuellement appliqué
  const subtype_ini = `${this.data.subtype}`
  this.obj && this._subtype && this.obj.classList.remove(this._subtype)
  this._subtype = v
  this.data.subtype = v
  this.obj && this.obj.classList.add(this._subtype)
  this.obj && this.isCadence && this.marquerCadence()
  v != subtype_ini && setModified()
}

// Le contenu complet, avec préfixe (aka type). Pour l'édition, par
// exemple, il faut tout remettre
get content(){ return this._content || (this._content = this.data.content)}
set content(v){
  // Certaines marques (cercle) n'ont pas de contenu
  v = (v || '').replace(/\r?\n/g,'__RET__')
  this._content = v
  this.data.content = v
  this.contentSpan && (this.contentSpan.innerHTML = this.formated_content )
  this.obj && this.isForme && (this.obj.title = v)
}

  get domId(){return this._domid || (this._domid = `amark-${this.id}`)}
}


/**
 * Marque de type image
 * (dans le même module qu'AMark, dont elle hérite)
 */
export class AMImage extends AMark {

constructor(analyse, data){
  super(analyse,data)
}

buildSpanContent(){
  this.img = DCreate('IMG', {class:'content', src:this.srcPath})
  return this.img
}

set content(v){
  this._content = v
  this.data.content = v
  this.img && (this.img.src = this.srcPath)
}
// Pourquoi est-on contraint de faire ça ?
get content(){
  return super.content
}

get srcPath(){
  return analyseUrl(`images/${this.content}`)
}

}// class AMIage



/**
 * Marque « Extrait partition » : image composée de morceaux d'images de
 * systèmes (sans les marques), assemblés dans le compositeur (cf.
 * ExtraitComposer.js) : mesures demandées, précédées de la clé et de
 * l'armure.
 * Données propres : pieces, liste de {image, x1, x2, y1, y2, dx, dy}
 * (bornes du morceau dans l'image du système et position dans
 * l'extrait, en px des images) ; scale (px de la table par px des
 * images). Le contenu est le numéro des mesures (« 12 », « 12-15 »).
 */
// Largeur de l'en-tête (clé, armure) d'un système, en hauteurs de
// portée après sa barre de début (réglée ensuite dans le compositeur) ;
// pour le premier système, métrique comprise
const HEADER_STAVES = 2
const HEADER_STAVES_FIRST = 3
// Marge (px des images) laissée autour de ce qui est imprimé
const INK_MARGIN = 6

export class AMExtrait extends AMark {

/**
 * Morceaux de l'extrait des mesures +spec+ (« 12 », « 12-15 ») : un par
 * système traversé, de la barre de début de la première mesure (après
 * l'en-tête du système pour sa première mesure) à celle de fin de la
 * dernière ; en tête, en morceau séparé, l'en-tête (clé, armure ;
 * métrique pour le premier système) du système de la première mesure.
 * Morceaux bout à bout, portées alignées (cf. aligned).
 * @return {pieces, scale} ou null (message affiché)
 */
static extractOf(spec){
  const m = String(spec || '').trim().match(/^(\d+)\s*(?:[-–à]\s*(\d+))?$/)
  if ( !m ) return erreur(t('errors.marks.extract_bad_measures', {spec: escapeLt(String(spec || ''))})), null
  let [from, to] = [Number(m[1]), Number(m[2] || m[1])]
  if ( to < from ) [from, to] = [to, from]
  const mesures = Forme.measureMarks
  if ( mesures.length == 0 ) return message(t('messages.no_measure_number')), null
  const found = mesures.find(x => x.number == from)
  if ( !found ) return message(t('messages.measure_not_found', {num: from})), null
  const sys0 = Systeme.getSystemeAssociated(found.mark)
  if ( !sys0 || !sys0.obj.naturalWidth ) return message(t('messages.measure_not_found', {num: from})), null
  const pieces = []
  const systems = Systeme.all
  for ( let i = systems.indexOf(sys0) ; i < systems.length ; ++i ) {
    const sys = systems[i], img = sys.obj
    if ( !img.naturalWidth ) break
    const r = img.getBoundingClientRect(), k = img.naturalWidth / r.width
    const marks = Forme.measureMarksOf(sys)
    if ( !marks.length ) break
    const nums   = marks.map(mk => Number(String(mk.content).trim()))
    const starts = marks.map((mk, j) => {
      const x = Forme.measureRect(mk).left
      return j == 0 ? r.left : (Forme.barlineNear(sys, x, 25) ?? x)
    })
    const iFrom = sys === sys0 ? nums.indexOf(from) : 0
    if ( nums[iFrom] > to ) break
    let iTo = nums.findLastIndex(n => n <= to)
    // Barre de fin comprise
    const end = iTo + 1 < starts.length ? starts[iTo + 1] + 3 : Forme.systemEndX(sys)
    // Suite dans un autre système : sans son en-tête (clé, armure)
    // Mesure qui commence son système : sans l'en-tête de celui-ci
    const x1 = iFrom > 0
      ? Math.max(0, Math.round((starts[iFrom] - r.left) * k))
      : this.headerOf(sys).x2
    pieces.push({
        image: sys.image_name
      , x1
      , x2: Math.min(img.naturalWidth, Math.round((end - r.left) * k))
      , y1: 0, y2: img.naturalHeight
    })
    if ( iTo + 1 < nums.length || nums[iTo] >= to ) break
  }
  // En-tête (clé, armure ; métrique pour le premier système) du système
  // de la première mesure, toujours en morceau séparé
  pieces.unshift(Object.assign({image: sys0.image_name, y1: 0, y2: sys0.obj.naturalHeight}, this.headerOf(sys0)))
  // Hauteur limitée à ce qui est imprimé (pas les marges des systèmes)
  pieces.forEach(p => {
    const sys  = Systeme.all.find(s => s.image_name == p.image)
    const prof = this.rowProfile(sys.obj, p.x1, p.x2)
    const first = prof.findIndex(n => n > 0), last = prof.findLastIndex(n => n > 0)
    if ( first < 0 ) return
    p.y1 = Math.max(0, first - INK_MARGIN)
    p.y2 = Math.min(prof.length, last + 1 + INK_MARGIN)
  })
  return {pieces: this.aligned(pieces), scale: sys0.obj.offsetWidth / sys0.obj.naturalWidth}
}

/**
 * Bornes {x1, x2} (px de l'image) de l'en-tête du système +sys+ : de
 * l'accolade (une demi-hauteur de portée avant la barre de début du
 * système) à l'armure (HEADER_STAVES hauteurs de portée après cette
 * barre ; HEADER_STAVES_FIRST, métrique comprise, pour le premier
 * système). À régler dans le compositeur.
 */
static headerOf(sys){
  const staves = sys === Systeme.first ? HEADER_STAVES_FIRST : HEADER_STAVES
  const img = sys.obj, w = img.naturalWidth, h = img.naturalHeight
  const prof = Forme.darkProfile(sys)
  let start = prof ? prof.findIndex(n => n > h / 2) : -1
  if ( start < 0 ) start = 0
  const lines = this.staffLines(img, 0, w)
  const span = lines.length >= 5 ? lines[4] - lines[0] : h / 6
  return {x1: Math.max(0, Math.round(start - span / 2)), x2: Math.min(w, Math.round(start + staves * span))}
}

/**
 * Morceaux +pieces+ mis bout à bout, portées alignées sur celles du
 * premier. L'écart entre les portées pouvant changer d'un système à
 * l'autre, un morceau dont les portées ne sont pas espacées comme
 * celles du premier est coupé entre ses portées (un morceau par
 * portée, chacun aligné).
 */
static aligned(pieces){
  const staves = pieces.map(p => this.stavesOf(p))
  const ref = staves[0]
  const res = []
  let x = 0
  pieces.forEach((p, i) => {
    const st = staves[i]
    const same = st.tops.length == ref.tops.length
    const split = same && st.tops.length > 1 && st.tops.some((y, k) => Math.abs((y - st.tops[0]) - (ref.tops[k] - ref.tops[0])) > 2)
    if ( split ) {
      st.tops.forEach((top, k) => {
        const y1 = k == 0 ? p.y1 : st.cuts[k - 1]
        const y2 = k == st.tops.length - 1 ? p.y2 : st.cuts[k]
        res.push(Object.assign({}, p, {y1, y2, dx: x, dy: ref.tops[k] - top + y1}))
      })
    } else {
      res.push(Object.assign({}, p, {dx: x, dy: (ref.tops[0] || 0) - (st.tops[0] || 0) + p.y1}))
    }
    x += p.x2 - p.x1
  })
  const minY = Math.min(...res.map(p => p.dy))
  res.forEach(p => p.dy -= minY)
  return res
}

/**
 * Portées du morceau +p+ (px de l'image) : {tops, bottoms, cuts},
 * premières et dernières lignes de chaque portée, et rangées où couper
 * entre deux portées (la moins encrée, p.e. pour ne pas couper une
 * nuance)
 */
static stavesOf(p){
  const sys = Systeme.all.find(s => s.image_name == p.image)
  const prof = sys && sys.obj.naturalWidth ? this.rowProfile(sys.obj, p.x1, p.x2) : []
  const w = p.x2 - p.x1
  const lines = []
  prof.forEach((n, y) => n > w / 2 && !(prof[y - 1] > w / 2) && lines.push(y))
  if ( lines.length < 5 || lines.length % 5 ) return {tops: lines.length ? [lines[0]] : [], bottoms: [], cuts: []}
  const tops = [], bottoms = [], cuts = []
  for ( let i = 0 ; i < lines.length ; i += 5 ) { tops.push(lines[i]) ; bottoms.push(lines[i + 4]) }
  for ( let k = 0 ; k < tops.length - 1 ; ++k ) {
    const from = bottoms[k] + 4, to = tops[k + 1] - 4, mid = (from + to) / 2
    let best = Math.round(mid)
    for ( let y = from ; y <= to ; ++y ) {
      if ( prof[y] < prof[best] || (prof[y] == prof[best] && Math.abs(y - mid) < Math.abs(best - mid)) ) best = y
    }
    cuts.push(best)
  }
  return {tops, bottoms, cuts}
}

/**
 * Nombre de pixels sombres de chaque rangée de l'image +img+ entre les
 * abscisses +x1+ et +x2+ (px de l'image). Les lignes de portée sont les
 * rangées sombres sur plus de la moitié de la largeur.
 */
static rowProfile(img, x1, x2){
  const w = x2 - x1, h = img.naturalHeight
  if ( w <= 0 ) return []
  const canvas = new OffscreenCanvas(w, h)
  const ctx = canvas.getContext('2d', {willReadFrequently: true})
  ctx.drawImage(img, x1, 0, w, h, 0, 0, w, h)
  let data
  try { data = ctx.getImageData(0, 0, w, h).data } catch(err) { return [] }
  const prof = new Array(h).fill(0)
  for ( let y = 0 ; y < h ; ++y ) {
    for ( let x = 0, q = y * w * 4 ; x < w ; ++x, q += 4 ) {
      if ( data[q] + data[q + 1] + data[q + 2] < 300 ) ++prof[y]
    }
  }
  return prof
}

// Lignes de portée de l'image +img+ entre +x1+ et +x2+ (cf. rowProfile)
static staffLines(img, x1, x2){
  const prof = this.rowProfile(img, x1, x2), w = x2 - x1
  const lines = []
  prof.forEach((n, y) => n > w / 2 && !(prof[y - 1] > w / 2) && lines.push(y))
  return lines
}

// Images des systèmes (sources des extraits), chargées une fois
static sourceOf(name){
  this.sources || (this.sources = new Map())
  if ( !this.sources.has(name) ) {
    const img = new Image()
    const loaded = new Promise(ok => { img.onload = () => ok(img) ; img.onerror = () => ok(null) })
    img.src = analyseUrl(`systems/${name}`)
    this.sources.set(name, loaded)
  }
  return this.sources.get(name)
}

// Morceaux (données d'un seul morceau : image, x1, x2 des premières
// versions)
get pieces(){
  const d = this.data
  if ( !d.pieces && d.image ) {
    d.pieces = [{image: d.image, x1: d.x1, x2: d.x2, y1: 0, y2: null, dx: 0, dy: 0}]
    delete d.image ; delete d.x1 ; delete d.x2
  }
  return d.pieces || []
}

buildSpanContent(){
  this.img = DCreate('IMG', {class:'content'})
  this.img.draggable = false
  this.showImage()
  return this.img
}

/**
 * Affichage de l'image de l'extrait : son fichier (images/, modifiable
 * hors de l'application, cf. « Ouvrir l'image »), sinon les morceaux
 * assemblés. Taille de la marque : celle de l'image à l'échelle.
 * Aussi « Recharger l'image » (menu contextuel).
 */
showImage(){
  if ( !this.data.file ) return this.drawExtract()
  this.img.onload = () => {
    this.obj.style.width  = px(this.img.naturalWidth  * this.data.scale)
    this.obj.style.height = px(this.img.naturalHeight * this.data.scale)
  }
  this.img.src = `${analyseUrl(`images/${this.data.file}`)}?v=${Date.now()}`
}

/**
 * Assemblage : image des morceaux enregistrée dans le dossier images de
 * l'analyse (images/extrait-<id>.png), puis affichée
 */
async assemble(){
  const data = await this.composeImage()
  if ( !data ) return
  this.data.file = await invoke('extract:save', {id: this.id, data})
  this.showImage()
  setModified()
}

/**
 * Dessin de l'extrait (morceaux assemblés) et taille de la marque
 */
async drawExtract(){
  const data = await this.composeImage()
  if ( !data || !this.img ) return
  this.img.onload = () => {
    this.obj.style.width  = px(this.img.naturalWidth  * this.data.scale)
    this.obj.style.height = px(this.img.naturalHeight * this.data.scale)
  }
  this.img.src = data
}

// Image (data URL PNG) des morceaux assemblés, ou null
async composeImage(){
  const pieces = this.pieces
  const sources = await Promise.all(pieces.map(p => AMExtrait.sourceOf(p.image)))
  if ( sources.some(s => !s) ) return null
  pieces.forEach((p, i) => null == p.y2 && (p.y2 = sources[i].naturalHeight))
  const W = Math.max(1, ...pieces.map(p => Math.round(p.dx + p.x2 - p.x1)))
  const H = Math.max(1, ...pieces.map(p => Math.round(p.dy + p.y2 - p.y1)))
  const canvas = DCreate('CANVAS', {width: W, height: H})
  const ctx = canvas.getContext('2d')
  // Fond blanc, morceaux superposés sans que l'un efface l'encre de
  // l'autre
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, W, H)
  ctx.globalCompositeOperation = 'multiply'
  pieces.forEach((p, i) => {
    const w = p.x2 - p.x1, h = p.y2 - p.y1
    ctx.drawImage(sources[i], p.x1, p.y1, w, h, Math.round(p.dx), Math.round(p.dy), w, h)
  })
  // Masques blancs (cf. ExtraitComposer) : scories couvertes
  ctx.globalCompositeOperation = 'source-over'
  ;(this.data.masks || []).forEach(m => ctx.fillRect(Math.round(m.x), Math.round(m.y), Math.round(m.w), Math.round(m.h)))
  return AMExtrait.trimmed(canvas).toDataURL('image/png')
}

// Canevas +canvas+ réduit à ce qui est imprimé (marge INK_MARGIN)
static trimmed(canvas){
  const W = canvas.width, H = canvas.height
  const data = canvas.getContext('2d').getImageData(0, 0, W, H).data
  let x1 = W, y1 = H, x2 = -1, y2 = -1
  for ( let y = 0 ; y < H ; ++y ) {
    for ( let x = 0, q = y * W * 4 ; x < W ; ++x, q += 4 ) {
      if ( data[q] + data[q + 1] + data[q + 2] >= 300 ) continue
      x < x1 && (x1 = x) ; x > x2 && (x2 = x)
      y < y1 && (y1 = y) ; y > y2 && (y2 = y)
    }
  }
  if ( x2 < 0 ) return canvas
  x1 = Math.max(0, x1 - INK_MARGIN) ; y1 = Math.max(0, y1 - INK_MARGIN)
  x2 = Math.min(W, x2 + 1 + INK_MARGIN) ; y2 = Math.min(H, y2 + 1 + INK_MARGIN)
  const out = DCreate('CANVAS', {width: x2 - x1, height: y2 - y1})
  out.getContext('2d').drawImage(canvas, x1, y1, x2 - x1, y2 - y1, 0, 0, x2 - x1, y2 - y1)
  return out
}

// Redimensionnement sur la table (cf. observe) : nouvelle échelle
onResized(){
  if ( !this.img.naturalWidth ) return
  this.data.scale = this.getWidth() / this.img.naturalWidth
  this.obj.style.height = px(this.img.naturalHeight * this.data.scale)
  setModified()
}

// Le contenu (numéros des mesures) n'est pas affiché
set content(v){
  this._content = v
  this.data.content = v
}
get content(){
  return super.content
}

// « Ouvrir l'image » (menu contextuel) : son fichier (assemblé d'abord
// s'il n'existe pas), ouvert par l'application du système
async openImage(){
  try {
    this.data.file || await this.assemble()
    this.data.file && await invoke('extract:open', {file: this.data.file})
  } catch(err) { erreur(err.message) }
}

// Édition (double-clic) : le compositeur
edit(){
  new ExtraitComposer(this).open()
}

}// class AMExtrait
