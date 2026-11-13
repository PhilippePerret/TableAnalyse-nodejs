import { DCreate, listen, stopEvent } from './dom.js'
import { not } from './lib/common.js'
import { message } from './lib/Message.js'
import { px } from './handies.js'
import { analyseUrl, invoke } from './api.js'
import { AObjet } from './AObjet.js'
import { Current, setModified } from './Current.js'
import { Preferences } from './Preferences.js'
import { emit } from './events.js'
import { TYPES_OU_SOUSTYPES_AU_DESSUS, TYPES_OU_SOUSTYPES_EN_DESSOUS } from './Constants.js'
import { UI } from './UI.js'
import { t } from './i18n.js'
/**
  * Class Systeme
  * 
  * Gestion des images des systèmes de la partition
  * 
  */

export class Systeme extends AObjet {

  /**
   * Boucle sur tous les systèmes
   */
  static each(method){
    this.all.forEach(method)
  }

  /**
   * Pour sauver les systèmes modifiés (tous, en fait, 
   * puisqu'il n'y en aura jamais beaucoup)
   */
  static getData(){
    var data_systems = []
    this.all.forEach(sys => {
      data_systems.push(sys.data2save)
    })
    return data_systems
  }

  /**
   * @return {Systeme} Le premier et le dernier système
   */
  static get first(){ return this.getByIndex(1) }
  static get last() { return this.getByIndex(this.all.length) }

  /**
   * @return {Systeme} l'instance d'index +index+ (1-start)
   * 
   */
  static getByIndex(index){
    return this.all[index - 1]
  }

  static get all(){
    return Current.analyse ? Current.analyse.systems : []
  }

  /**
  * Pour déplacer tous les systèmes (et seulement les systèmes) de
  * la valeur positive ou négative (+diff+) à partir du système 
  * (inclus) +isystem+
  */
  static moveAllFrom(isystem, diff){
    const lastIndex = this.all.length
    for (var idx = isystem; idx <= lastIndex; ++idx) {
      const sys = this.getByIndex(idx)
      // console.debug("Déplacement du système %i de %i à %i", idx, sys.top, sys.top + diff)
      sys.positionne(sys.top + diff, /* onlySystem = */ true)
    }
    setModified()
  }

  /**
   * @return Le système associé à la marque +aobj+
   * 
   */
  static getSystemeAssociated(aobj) {
    /*
    |  Numéro de mesure posé sur la ligne des numéros : il appartient au
    |  système au-dessus duquel il se trouve.
    */
    if ( aobj.data && aobj.data.line ) return this.getSystemeOfMeasure(aobj)
    /*
    |  Marque posée sur un système : elle lui appartient (le plus grand
    |  chevauchement s'il y en a plusieurs)
    */
    let onSys = null, maxOverlap = 0
    this.each(sys => {
      const overlap = Math.min(sys.bottom, aobj.bottom) - Math.max(sys.top, aobj.top)
      if ( overlap > maxOverlap ) { maxOverlap = overlap ; onSys = sys }
    })
    if ( onSys ) return onSys
    /*
    |  Systèmes avant et après (if any)
    */
    var [sysAuDessus, sysEnDessous] = this.getSystemAvantEtApres(aobj.top, aobj.bottom)


    if ( not(sysEnDessous) ) {

      return sysAuDessus // peut-être null

    } else if ( not(sysAuDessus) ) {

      return sysEnDessous

    } else if ( TYPES_OU_SOUSTYPES_AU_DESSUS.includes(aobj.type) || (aobj.subtype && TYPES_OU_SOUSTYPES_AU_DESSUS.includes(aobj.subtype)) ){

      return sysEnDessous

    } else if ( TYPES_OU_SOUSTYPES_EN_DESSOUS.includes(aobj.type) || (aobj.subtype && TYPES_OU_SOUSTYPES_EN_DESSOUS.includes(aobj.subtype)) ) {

      return sysAuDessus

    } else {

      /*
      |  +aobj+ est un objet de type quelconque et les deux systèmes
      |  sont définis.
      */
      const ecart_audessus  = Math.abs(aobj.top - sysAuDessus.bottom)
      const ecart_endessous = Math.abs(sysEnDessous.top - aobj.bottom)

      if ( ecart_audessus > ecart_endessous ) {
        return sysEnDessous
      } else {
        return sysAuDessus
      }

    }

  }

  /**
   * @return le système d'un numéro de mesure de la ligne des numéros :
   * le dernier système qui commence au-dessus de lui.
   */
  static getSystemeOfMeasure(aobj){
    var found = this.all[0]
    this.each(sys => { if ( sys.top <= aobj.top ) found = sys })
    return found
  }

  /**
   * NUMÉROS DE MESURE (ligne des numéros)
   * -------------------------------------
   * Les numéros de mesure produits par la découpe (marques texte « mes »
   * avec `line: true`) sont posés sur une ligne fine, sous chaque
   * système, à la distance définie en préférence (measure_line_offset).
   * Ils suivent leur système. Le système d'un numéro est mémorisé
   * (_msys) pour qu'il ne change pas quand on déplace les systèmes.
   */
  static get measureMarks(){
    return AObjet.select(ao => ao.subtype == 'mes' && ao.data && ao.data.line)
  }
  static get hasMeasureLine(){ return this.measureMarks.length > 0 }

  static get measureLineOffset(){ return Number(Preferences.get('measure_line_offset')) }

  static measureMarksOf(sys){
    return this.measureMarks.filter(ao => this.systemOfMeasure(ao) === sys)
  }

  static systemOfMeasure(ao){
    return ao._msys || (ao._msys = this.getSystemeOfMeasure(ao))
  }

  /**
   * Pose les numéros de mesure sur la ligne de leur système (et dessine
   * cette ligne). +offset+ : distance de la ligne sous le système (par
   * défaut, la préférence).
   */
  static placeMeasureNumbers(offset){
    if ( undefined === offset ) offset = this.measureLineOffset
    const bySystem = new Map()
    this.measureMarks.forEach(ao => {
      const sys = this.systemOfMeasure(ao)
      if ( !sys ) return
      bySystem.has(sys) || bySystem.set(sys, [])
      bySystem.get(sys).push(ao)
    })
    this.each(sys => sys.placeMeasureLine(bySystem.get(sys) || [], offset))
  }

  /**
   * Place le premier système à la distance top_first_system du haut, en
   * déplaçant d'autant tous les éléments de la table
   */
  static moveToFirstSystemTop(){
    const first = this.all[0]
    if ( !first ) return
    const diff = Number(Preferences.get('top_first_system')) - first.top
    if ( diff == 0 ) return
    AObjet.moveAllBelow({top: -Infinity, offset: diff, sauf: []})
    setModified()
    this.placeMeasureNumbers()
  }

  /**
   * Replace les systèmes pour laisser, entre la ligne des numéros de
   * mesure d'un système et ce qui la suit (marques posées sous la ligne,
   * système suivant), la distance de la préférence
   * distance_after_measure_line. Tout ce qui est sous la ligne est
   * décalé d'autant, comme quand on déplace un système.
   */
  static spaceAfterMeasureLines(){
    const gap = Number(Preferences.get('distance_after_measure_line'))
    const offset = this.measureLineOffset
    this.each((sys, i) => {
      const next = this.all[i + 1]
      if ( !next || !sys.measureLine ) return
      const lineY = sys.top + sys.obj.offsetHeight + offset
      const below = AObjet.items.filter(ao => ao !== next && ao.top > lineY && ao.top < next.top && !(ao.data && ao.data.line))
      const firstTop = Math.min(next.top, ...below.map(ao => ao.top))
      const diff = Math.round(lineY + gap - firstTop)
      if ( diff == 0 ) return
      AObjet.moveAllBelow({top: lineY + 1, offset: diff, sauf: []})
      setModified()
    })
    this.placeMeasureNumbers()
  }

  /**
   * Replace les systèmes pour laisser, entre l'élément le plus bas d'un
   * système (marques comprises) et l'élément le plus haut du suivant, la
   * distance de la préférence distance_systemes. Tout ce qui suit est
   * décalé d'autant.
   */
  static spaceSystems(){
    const gap = Number(Preferences.get('distance_systemes'))
    const blocks = this.all.map(sys => [sys])
    AObjet.items.forEach(ao => {
      if ( ao.type == 'systeme' ) return
      const sys = this.getSystemeAssociated(ao)
      sys && blocks[this.all.indexOf(sys)].push(ao)
    })
    for ( let i = 0 ; i < blocks.length - 1 ; ++i ) {
      const bottom = Math.max(...blocks[i].map(ao => ao.top + ao.height))
      const top    = Math.min(...blocks[i + 1].map(ao => ao.top))
      const diff = Math.round(bottom + gap - top)
      if ( diff == 0 ) continue
      const ids = new Set(blocks.slice(i + 1).flat())
      AObjet.items.forEach(ao => { if ( ids.has(ao) ) ao.top = ao.top + diff })
      setModified()
    }
    emit('table:changed')
    this.placeMeasureNumbers()
  }

  /**
   * Renumérote les numéros de mesure dans l'ordre de la partition
   * (système, puis de gauche à droite) à partir de +fromMark+, dont le
   * numéro fait foi (ou du premier numéro). Ainsi, un numéro ajouté (en
   * double) décale les suivants vers le haut, un numéro supprimé (qui
   * manque) les décale vers le bas.
   */
  static renumberMeasures(fromMark){
    const index = (ao) => this.all.indexOf(this.systemOfMeasure(ao))
    const marks = this.measureMarks.sort((a, b) => (index(a) - index(b)) || (a.left - b.left))
    if ( marks.length == 0 ) return
    let i = Math.max(0, marks.indexOf(fromMark))
    let n = parseInt(marks[i].content, 10)
    if ( isNaN(n) ) return
    for ( ++i ; i < marks.length ; ++i ) {
      const v = String(++n)
      if ( marks[i].content != v ) { marks[i].content = v ; setModified() }
    }
  }

  /**
   * Cherche et retourne [système avant, système après] les valeurs
   * pour +top+ et +bottom+
   */
  static getSystemAvantEtApres(top, bottom){
    var sysAuDessus, sysEnDessous ;
    this.each(sys => {
      if ( !sysEnDessous && sys.top > top ) {
        sysEnDessous = sys
      }
      if ( sys.bottom < bottom ) {
        sysAuDessus = sys
      }
    })
    return [sysAuDessus, sysEnDessous]
  }

  /**
   * Méthode appelée par le menu « Options » pour verrouiller ou
   * déverrouiller les systèmes sur la table d'analyse. Déverrouillés,
   * un seul système peut être déplacé : ils sont reverrouillés après.
   */
  static toggleLock(e, lockState){
    if ( undefined == lockState ) lockState = !Preferences.get('lock_systems')
    this.systemsLocked = lockState
    emit('systems:locked', {locked: this.systemsLocked})
    if ( this.systemsLocked ) {
      this.lockAll()
    } else {
      this.unlockAll()
      if ( not(this.alerteDeplacementSystemesOK) ) {      
        message(t('messages.systems_unlocked'))
        this.alerteDeplacementSystemesOK = true
      }
    }
    Preferences.set('lock_systems', this.systemsLocked)
    return e && stopEvent(e)
  }

  static setLockSystemsOnLoad(){
    emit('systems:locked', {locked: !!Preferences.get('lock_systems')})
  }

  static lockAll(){
    this.all && this.all.forEach(sys => sys.lock())
  }
  static unlockAll(){
    this.all && this.all.forEach(sys => sys.unlock())
  }

  /**
   * Appelée après le chargement (réel) des images de
   * tous les systèmes.
   */
  static afterSystemsLoaded(){
    // Les nouveaux systèmes ont été placés sans connaitre leur
    // hauteur ; on corrige les chevauchements.
    this.checkAndRepareSystemsPosition()
    this.placeMeasureNumbers()
  }

  static checkAndRepareSystemsPosition(){
    /**
     ** Vérifie et corrige la position des systèmes.
     **
     ** Avant, la méthode était appelée systématiquement, mais 
     ** maintenant la position des systèmes est bien calculée à la
     ** création donc il n'y a pas besoin de la toucher systématique-
     ** ment.
     **/
    var lastSystem ;
    var modified = false ;
    this.each(sys => {
      delete sys._height
      if ( lastSystem ) {
        // On s'assure du positionnement correct
        if ( lastSystem.bottom > sys.top ) {
          sys.top = parseInt(lastSystem.bottom + (sys.height / 2),10)
          modified = true
        }
      }
      // Pour ajustement du prochain
      lastSystem = sys
    })
    if ( modified ){
      setModified()
      message(t('messages.systems_position_adjusted'))
      emit('table:changed')
    }
  }

  /**
   * Deux méthodes pour suivre le chargement des images
   * des systèmes et exécuter une méthode après leur
   * chargement complet.
   */
  static incrementeNombreImagesSystemes(){
    if (undefined == this._nbimgsys) { this._nbimgsys = 0 }
    ++ this._nbimgsys
  }
  static decrementeNombreImagesSystemes(){
    if (undefined == this._nbimgsysloaded) this._nbimgsysloaded = 0
    ++ this._nbimgsysloaded
    if ( this._nbimgsysloaded == this._nbimgsys && this._nbimgsysloaded == this.count ) {
      this.afterSystemsLoaded()
    }
  }

  static get count(){
    return this._count || (this._count = this.all.length)
  }

  /**
   * Instanciation du système
   * ------------------------
   * À la base, un système est caractérisé par une image, un numéro
   * et une hauteur
   * 
   */
  constructor(analyse, data){
    super(analyse, data)
    this.index      = data.index
    this.type       = 'systeme'
    this.data.type  = 'systeme'
    this._id        = `systeme-${this.index + 1}`
  }

  get isSystem(){return true}
  get isSysteme(){return true}

  setSelected(){
    this.obj.classList.add('selected')
    this.isSelected = true
  }
  unsetSelected(){
    this.obj.classList.remove('selected')
    this.isSelected = false
  }

  /**
   * Les données qui seront enregistrées
   * 
   */
  get data2save(){
    return {
        image_name: this.data.image_name
      , top:    this.data.top
      , left:   this.data.left
    }
  }

  get domId(){return this._domid || (this._domid = `systeme-${this.index}`)}
  
  /**
   * Construction du système
   * 
   */
  build(){
    const my = this
    my.obj = my.buildAndSetImage()
    my.writeAndObserve()
  }
  writeAndObserve(){
    UI.TableAnalyse.appendChild(this.obj)
    this.observe()
  }

  buildAndSetImage(){
    const my = this
    let img = DCreate('IMG', {id: this.domId})
    Systeme.incrementeNombreImagesSystemes()
    img.src = analyseUrl(`systems/${this.image_name}`)
    img.onload = function(e) {
      Systeme.decrementeNombreImagesSystemes()
    }
    img.draggable   = false // supprimer ghost-image quand on move
    img.className   = 'aobj systeme' // aobj = objet d'analyse
    img.style.top   = px(this.top)
    img.style.width = px(Preferences.get('systeme_width'))
    return img
  }

  /**
   * Pour repositionner le système
   * 
   */
  positionne(top, onlySystem){
    // console.log("-> positionne à %i le système et les objets : ", top, this.objets)
    const iniTop = parseInt(this.top,10)
    const diff = top - iniTop
    if ( diff == 0 ) return 
    else { setModified() }
    // console.log("DATA: Top actuel = %i, Nouveau top = %i, différence = %i", iniTop,top,diff)
    this.top = top
    /*
    |  Déplacement de tous ses objets associés
    */
    onlySystem || this.objets.forEach(ao => { ao.top = ao.top + diff })
    Systeme.placeMeasureNumbers()
  }

  /**
   * Ligne des numéros de mesure du système (cf. Systeme.placeMeasureNumbers)
   * et pose de ses numéros (+marks+) sur cette ligne. +top+ : position
   * du système (par défaut, sa position enregistrée).
   */
  placeMeasureLine(marks, offset, top = this.top){
    const height = this.obj && this.obj.complete ? this.obj.offsetHeight : 0
    if ( marks.length == 0 || !height ) {
      this.measureLine && this.measureLine.remove()
      this.measureLine = null
      return
    }
    const y = Math.round(top + height + offset)
    if ( !this.measureLine ) {
      this.measureLine = DCreate('DIV', {class: 'measure-line', 'data-sys': this.index})
      UI.TableAnalyse.appendChild(this.measureLine)
    }
    this.measureLine.style.top   = px(y)
    this.measureLine.style.width = px(Preferences.get('systeme_width'))
    // Le bas de la boite du numéro (cf. AMark.css) est posé sur la ligne
    marks.forEach(ao => {
      const box = ao.obj && ao.obj.querySelector('span.content')
      const bottom = box ? box.getBoundingClientRect().bottom - ao.obj.getBoundingClientRect().top : ao.height
      const top = Math.round(y - bottom)
      if ( ao.top != top ) ao.top = top
    })
  }

  /**
   * Observation du système
   * 
   * */
  observe(){
    listen(this.obj, 'click',     this.toggleMoving.bind(this))
    listen(this.obj, 'mousemove', this.onMove.bind(this))
    listen(this.obj, 'contextmenu', this.onContextMenu.bind(this))
  }

  /**
   * Menu contextuel du système (menu natif, cf. main.js) : verrouiller
   * ou déverrouiller les systèmes, ouvrir l'image, l'afficher dans le
   * gestionnaire de fichiers.
   */
  onContextMenu(e){
    stopEvent(e)
    const locked = !!Preferences.get('lock_systems')
    invoke('menu:systemContext', {image: this.image_name, locked})
      .then(choice => { if ( choice == 'toggleLock' ) Systeme.toggleLock(null, !locked) })
      .catch(err => console.error(err))
    return false
  }

  /**
   * La hauteur 'real_top' correspond à la hauteur de l'objet associé
   * au système qui se trouve le plus haut. En cas d'absence d'objet
   * associé, c'est le top normal du système qui est renvoyé.
   */
  get real_top(){
    if ( this.objets.length ) {
      var min = this.top
      this.objets.forEach( ao => {
        if ( ao.top < min ) min = ao.top
      })
      return min
    } else {
      return this.top
    }
  }
  set real_top(v){
    var offset ;  // décalage (positif) entre le premier objet et le
                  // haut du système

    if ( this.objets.length ) {
      offset = 0
      this.objets.forEach(ao => {
        if ( ao.top < this.top ) {
          var dif = this.top - ao.top
          if ( dif > offset ) offset = dif
        }
      })
    } else {
      offset = 0
    }
    this.positionne(v + offset)
  }

  get full_height(){
    if ( this.objets.length ) {
      var min = this.top, max = this.bottom ;
      this.objets.forEach( ao => {
        if ( ao.top < min ) { min = ao.top }
        if ( ao.bottom > max ) { max = ao.bottom }
      })
      return max - min
    } else {
      return this.height
    }
  }

  /**
   * @return la liste des AObjets associés au système
   */
  get objets(){
    return this._objets || (this._objets = this.getObjets() || [])
  }
  addObjet(aobjet){
    this._objets || this.objets
    this._objets.push(aobjet)
  }
  getObjets(){
    if ( this.data.objets ) {
      return this.data.objets.map( oid => AObjet.get(oid))
    }
  }

  lock(){
    this.isLocked = true
  }
  unlock(){
    this.isLocked = false
  }

  /**
   * Méthode-bascule pour passer du mode fixe au mode déplacement.
   * En mode déplacement, l'objet suit la souris
   * 
   */
  toggleMoving(e){
    if ( this.isLocked ) return stopEvent(e)
    if ( this.moving ) {
      // 
      // === FIN DU DÉPLACEMENT
      // 
      // <= On était en déplacement
      // => on doit fixer à la nouvelle position
      // 
      const onlySystem = true == e.altKey
      const onlyAllSystems = onlySystem && e.shiftKey
      const initTop = this.top
      this.positionne(e.clientY - this.rectTop, onlySystem)
      this.obj.classList.remove('selected')
      /*
      |  La différence de position (négative ou positive)
      */
      const diff = this.top - initTop

      if ( onlyAllSystems ) {
        /*
        |  Pour déplacer les systèmes suivants et seulement les
        |  systèmes.
        */
        Systeme.moveAllFrom(this.index + 1, diff)
      } else if ( ! onlySystem ) {
        /*
        |  Pour déplacer tous les systèmes et les objets suivants
        */
        var saufs = this.objets.map(ao => {return ao.domId})
        saufs.push(this.domId)
        AObjet.moveAllBelow({
          top:    initTop,
          offset: this.top - initTop, 
          sauf:   saufs
        })
      } else {
        console.info("OPE: Déplacement du système seul.")
      }
      // Les lignes des numéros suivent les systèmes déplacés
      Systeme.placeMeasureNumbers()
      // Un seul déplacement de système à la fois
      this.moving = false
      return Systeme.toggleLock(null, true)

    } else {
      
      // 
      // === DÉBUT DU DÉPLACEMENT ===
      // 
      // <= On était fixé
      // => on doit se mettre à se déplacer
      // 
      this.rectTop = e.clientY - this.top
      this.obj.classList.add('selected')    
    }
    this.moving = !this.moving
  }

  onMove(e){
    // Ne pas bloquer la propagation (resize des marques)
    if ( !this.moving ) return
    const top = e.clientY - this.rectTop
    this.obj.style.top = px(top)
    // La ligne des numéros (et ses numéros) suit le système
    this.measureLine && this.placeMeasureLine(Systeme.measureMarksOf(this), Systeme.measureLineOffset, top)
  }


  // MÉTHODE DE CONTRÔLE
  // Méthode pour vérifier la hauteur du système (on place un trait
  // pour voir)
  mesure(){
    const div = DCreate('DIV', {style:'position:absolute;left:calc(100%/2);width:8px;background-color:#5F5;'})
    UI.TableAnalyse.appendChild(div)
    div.style.top     = px(this.top)
    div.style.height  = px(this.height)
  }

  get image_name(){ return this.data.image_name }

}// class Systeme

/*
|  Suppression d'un numéro de mesure de la ligne : les suivants sont
|  renumérotés (crochet appelé par AObjet.remove, qui ne peut pas
|  importer Systeme).
*/
AObjet.afterRemove = (aobjet) => {
  if ( aobjet.subtype == 'mes' && aobjet.data && aobjet.data.line ) Systeme.renumberMeasures()
}
