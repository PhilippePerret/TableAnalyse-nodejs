import { DCreate, listen, stopEvent } from './dom.js'
import { not } from './lib/common.js'
import { message } from './lib/Message.js'
import { px } from './handies.js'
import { analyseUrl } from './api.js'
import { AObjet } from './AObjet.js'
import { Current, setModified } from './Current.js'
import { Preferences } from './Preferences.js'
import { emit } from './events.js'
import { TYPES_OU_SOUSTYPES_AU_DESSUS, TYPES_OU_SOUSTYPES_EN_DESSOUS } from './Constants.js'
import { UI } from './UI.js'
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
   * Méthode appelée quand on clique le bouton pour verrouiller ou 
   * déverrouiller les systèmes sur la table d'analyse.
   */
  static toggleLock(e, lockState){
    if ( undefined == lockState ) lockState = !Preferences.get('lock_systems')
    this.systemsLocked = lockState
    UI.btnLockSystems.classList[this.systemsLocked?'add':'remove']('pressed')
    if ( this.systemsLocked ) {
      this.lockAll()
    } else {
      this.unlockAll()
      if ( not(this.alerteDeplacementSystemesOK) ) {      
        message(`
          <p>Par défaut, toutes les marques d'analyse ainsi que les autres systèmes suivront le déplacement.</p>
          <p>Pour ne déplacer qu'UN SEUL SYSTÈME, tenir la touche ⌥ appuyée.</p>
          <p>Pour ne déplacer que le système et les systèmes suivants, tenir ⌥ et ⇧.</p>`)
        this.alerteDeplacementSystemesOK = true
      }
    }
    Preferences.set('lock_systems', this.systemsLocked)
    return e && stopEvent(e)
  }

  static setLockSystemsOnLoad(){
    UI.btnLockSystems.classList[Preferences.get('lock_systems')?'add':'remove']('pressed')
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
      message("La position des systèmes a été ajustée. Enregistez les nouvelles données.")
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
  }

  /**
   * Observation du système
   * 
   * */
  observe(){
    listen(this.obj, 'click',     this.toggleMoving.bind(this))
    listen(this.obj, 'mousemove', this.onMove.bind(this))
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
    this.obj.style.top = px(e.clientY - this.rectTop)
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
