/**
 * Pour gérer l'analyse en tant que telle
 *
 * NOTE : les méthodes de classe sont placées après les méthodes
 *        d'instance.
 *
 */
import { DCreate, DGet } from './dom.js'
import { not, isNil } from './lib/common.js'
import { message, erreur } from './lib/Message.js'
import { raise } from './handies.js'
import { invoke } from './api.js'
import { Sablier } from './Sablier.js'
import { Current } from './Current.js'
import { Preferences, pref } from './Preferences.js'
import { PreferencesAppData } from './Preferences_AppData.js'
import { PreferencesPanel } from './PreferencesPanel.js'
import { AObjet } from './AObjet.js'
import { AMark } from './AMark.js'
import { Systeme } from './Systeme.js'
import { AnalyseDisplayer } from './AnalyseDisplayer.js'
import { AnalyseSaver } from './AnalyseSaver.js'
import { PanneauInfos } from './PanneauInfos.js'
import { TableAnalyse } from './TableAnalyse.js'
import { t } from './i18n.js'

export class Analyse {

  static get current(){ return Current.analyse }
  static set current(v){ Current.analyse = v }

  static setModified(){
    /** Pour avoir à seulement utiliser Analyse.setModified() **/
    this.current && this.current.setModified()
  }

  constructor(data){
    this.data = data;
  }

  get modified(){ return this._modified }
  set modified(v){
    if ( this.loading ) return ;
    this._modified = v
    setRedLight(v)
    v && this.programAutosave()
  }
  setModified(){this.modified = true}

  // Sauvegarde automatique, quelques secondes après la dernière
  // modification, si la préférence est activée.
  programAutosave(){
    clearTimeout(this.autosaveTimer)
    if ( !pref('autosave') ) return
    this.autosaveTimer = setTimeout(() => {
      this.modified && Analyse.current === this && AnalyseSaver.save()
    }, 3000)
  }
  unsetModified(){this.modified = false}


  defineWindowSize(largeur, hauteur){
    /**
     ** Méthode appelée quand on change la taille de la fenêtre, pour
     ** pouvoir l'enregistrer.
     **/
    // Redimensionnements du chargement ignorés (taille initiale de la
    // fenêtre) tant que la taille enregistrée n'est pas appliquée
    if ( !this.windowSizeApplied ) return
    if ( largeur == pref('window_width') && hauteur == pref('window_height') ) return
    Preferences.set('window_width'  , largeur)
    Preferences.set('window_height' , hauteur)
    // Enregistrement immédiat dans le fichier (une copie du dossier de
    // l'analyse garde la taille, même sans enregistrement)
    clearTimeout(this.timerWindowSize)
    this.timerWindowSize = setTimeout(() => {
      invoke('analyse:saveWindowSize', {width: largeur, height: hauteur}).catch(err => console.error(err))
    }, 500)
  }

  /**
   * Redonne à la fenêtre la taille enregistrée dans les préférences
   */
  applyWindowSize(){
    const w = pref('window_width'), h = pref('window_height')
    const done = () => setTimeout(() => { this.windowSizeApplied = true }, 300)
    if ( w && h ) {
      invoke('window:setSize', {width: w, height: h}).catch(err => console.error(err)).finally(done)
    } else done()
  }

  scrollToLastPosition(){
    window.scrollTo({top:pref('last_scroll') || 0})
  }

  /**
   * Retourne un nouvel identifiant unique
   *
   */
  newId(){
    if (undefined == this._lastId) this._lastId = 0;
    return ++ this._lastId
  }

  /**
   * Pour afficher une analyse
   *
   * Note : ça la met en analyse courante
   */
  display(){
    this.loading = true
    Analyse.current = this
    if ( false == AnalyseDisplayer.display(this) ) {
      Analyse.current = null
    } else {
      Systeme.setLockSystemsOnLoad()
      TableAnalyse.setHeight()
    }
    this.loading = false
    return this; // chainage
  }

/* --- Color Methods --- */

/**
* Méthode qui bascule de la version couleur à la version noir et 
* blanc de l'affichage de l'analyse.
*/
toggleModeColor(modeON){
  if ( modeON && not(DGet('style#mode_couleur')) ) {
    this.buildStyleTagForModeColor()
  }
  DGet('style#mode_couleur').disabled = !modeON
}
/**
* Construire la balise <style> pour le mode couleur
*/
buildStyleTagForModeColor(){
  var styles = []
  Object.values(PreferencesAppData).forEach(dp =>{
    if ( dp.typeV != 'color' ) return
    var color = Preferences.get(dp.id)
    styles.push(`${dp.selectors} {border-color:#${color}!important;color:#${color}!important;}`)
  })
  styles = "\n/* Ce code est produit automatiquement en fonction des préférences */\n" + 
    styles.join("\n") + "\n"
  const tag = DCreate('STYLE', {id:'mode_couleur', type:'text/css', text: styles})
  document.head.appendChild(tag)
}

/* --- Staff Methods --- */

/**
 * Méthode qui compare les images systèmes du dossier 
 * (this.data.systems_in_folder) avec les systèmes définis pour le
 * moment dans l'analyse et tient compte des changements.
 * 
 */
checkSystems(){
  const imgSystems = this.data.systems_in_folder
  // console.log("imgSystems = ", imgSystems)
  // console.log("Systèmes courants = ", this.systems)
  const nombreSystemesInitial = Object.keys(this.systems).length
  /*
  * Table de comparaison
  * --------------------
  * Par commodité, on fait une table des systèmes courant avec en
  * clé le nom de l'image et en valeur l'instance, qui servira tout
  * à la fin.
  */
  const table_systems = {}
  this.systems.forEach(sys => {
    Object.assign(table_systems, {[sys.data.image_name]: sys})
  })
  // console.log("table_systems = ", table_systems)
  /*
  * On peut vérifier maintenant la concordance (systèmes ajoutés et
  * systèmes retirés)
  */
  const unknownSystemsNames = []
  imgSystems.forEach( sys_img_name => {
    if ( undefined == table_systems[sys_img_name] ) {
      // <= C'est un nouveau système
      // => On le met dans la liste des inconnus
      unknownSystemsNames.push(sys_img_name)
    } else {
      // <= C'est un système connu
      // => On le retire de la table de comparaison
      delete table_systems[sys_img_name]
    }
  })
  /*
  * Conclusion à tirer :
  *   - les systèmes de unknownSystemsNames sont à ajouter
  *   - les systèmes qui reste dans table_systems sont à retirer
  *   - s'il n'y a aucune différence, on peut s'arrêter là
  */
  const nombreSystemesARetirer = Object.keys(table_systems).length
  if (unknownSystemsNames.length + nombreSystemesARetirer == 0) {
    return console.info("= Le nombre de systèmes n'a pas changé.")
  }
  if (unknownSystemsNames.length) {
    console.info("Nombre de systèmes à ajouter : %i", unknownSystemsNames.length)
  }
  if (nombreSystemesARetirer) {
    console.info("Nombre de systèmes à retirer : %i", nombreSystemesARetirer)
    Object.values(table_systems).forEach( sys => {
      delete this.systems[sys.index - 1]
    })
  }
  /*
  * Il faut ajouter les systèmes nouveaux aux bons endroits. Pour ça,
  * on se sert de la liste des noms de systèmes dans le dossier, qui
  * est classée par ordre alphabétique.
  * On en profite en même temps pour créer les nouvelles instances.
  */
  const newSystems = []
  var last_top = 0
  imgSystems.forEach(img_name => {
    if ( table_systems[img_name] ) {
      // <= Un système qui existe déjà
      // => On l'ajoute tel quel
      newSystems.push(table_systems[img_name])
    } else {
      // <= Un nouveau système
      // => On lui crée une nouvelle instance
      const newSystem = new Systeme(this, {
          image_name: img_name
        , top:  last_top + 100
        , left: 0
      })
      newSystems.push(newSystem)
    }
    last_top = newSystems[newSystems.length - 1].top
  })
  this.systems = newSystems
  console.info("Nouvelle valeur systems : ", this.systems)

  this.setModified()
}


  /**
   * Les méthodes de sauvegarde
   */
  saveInfos(){        AnalyseSaver.saveInfos(this).catch(err => erreur(err.message)) }
  savePreferences(){  AnalyseSaver.savePreferences(this).catch(err => erreur(err.message)) }
  saveAnalyseTags(){  AnalyseSaver.saveAnalyseTags(this).catch(err => erreur(err.message)) }

  checkDataBeforeSave(){
    /**
     ** Méthode qui fait quelques vérification avant de procéder à
     ** l'enregistrement des données.
     ** @return true en cas de succès, false otherwise
     **/
      AObjet.items.forEach(o => {
        try {
          if ( o.type == 'systeme' ) {
            /*
            |  Check des systèmes
            */
          } else {
            /*
            |  Check des marques d'analyse
            */
            isNil(o.data.top)   && o.corrigeDataValue('top')
            isNil(o.data.left)  && o.corrigeDataValue('left')
            isNil(o.data.top)   && raise(t('errors.marks.top_undefined'))
            isNil(o.data.left)  && raise(t('errors.marks.left_undefined'))
            isNaN(o.data.top)   && raise(t('errors.marks.top_nan'))
            isNaN(o.data.left)  && raise(t('errors.marks.left_nan'))
          }
        } catch(err) {
          console.error("Objet erroné : ", o, err)
          raise(err)
        }
      })

    return true
  }
  /**
   * Pour actualiser une donnée général (métadonnée, data)
   * 
   */
  updateInfos(data){
    Object.assign(this.data.infos, data)
  }


  /**
   * Rafraichir l'affichage de l'analyse
   *
   * Cela consiste à relever les systèmes (images du dossier 'systems')
   * et à afficher les nouveaux.
   */
  async refresh(){
    try {
      this.refreshSystems(await invoke('analyse:refresh'))
    } catch(err) {
      erreur(err.message)
    }
  }

  /**
   * Méthode qui rafraichit la liste des systèmes
   * 
   * Elle est principalement appelée lorsqu'on a créé une nouvelle
   * analyse et qu'on a mis les systèmes dans le dossier système.
   * Dans ce cas, il faut les fabriquer.
   * 
   * Mais on prévoit aussi des ajouts où des suppressions.
   * 
   * 
   * Maintenant, la donnée data_systems est plus complète, puisqu'elle
   * a été traitée par ruby côté serveur. Peut-être faut-il simplement
   * tout initialiser.
   */
  refreshSystems(data_systems){
    console.info('OPE: Rafraichissement des systèmes…')
    // console.log("Nouvelles données systèmes : ", data_systems)
    const tableNewSystems = {}
    data_systems.forEach(dsys => {
      Object.assign(tableNewSystems, {[dsys.image_name]: dsys})
    })
    const currentSystems = Systeme.getData()
    // console.log("Données systèmes actuels : ", currentSystems)
    const tableOldSystems = {}
    currentSystems.forEach(dsys => {
      Object.assign(tableOldSystems, {[dsys.image_name]: dsys})
    })

    // Dernier système et hauteur courante
    const ecart = Number(Preferences.get('distance_systemes'))
    let currentTop
    if ( Systeme.last ) {
      currentTop = Systeme.last.bottom + ecart
    } else {
      currentTop = Number(Preferences.get('top_first_system'))
    }

    /**
     * Ajout des nouveaux systèmes 
     */
    var newSystemsCount = 0
    data_systems.forEach( dsys => {
      if ( undefined == tableOldSystems[dsys.image_name] ) {
        // Un nouveau système
        const sys = new Systeme(this, Object.assign(dsys, {index: this.systems.length + 1}))
        this.systems.push(sys)
        sys.build()
        sys.top = currentTop
        currentTop += sys.full_height + ecart
        Object.assign(tableOldSystems, {[dsys.image_name]: dsys})
        newSystemsCount ++
      }
    })

    console.info("OPE: Fin de construction des nouveaux systèmes. Nouveaux systèmes construits : %i", newSystemsCount)
  }

  /**
   * @return les instances système des systèmes de l'analyse
   */
  get systems(){
    if (undefined == this._systems){
      AObjet.items || AObjet.init() // indispensable pour instanciation
      var index   = 0
      this._systems = this.data.systems.map(dsys => {
        Object.assign(dsys, {index: ++index})
        return new Systeme(this, dsys) 
      })
    }; return this._systems
  }
  set systems(v){ this._systems = v }

  /**
   * @return La liste des instances de tags
   */
  get tags(){
    const my = this
    my._lastId = 0
    if (undefined == this._tags) {
      AObjet.items || AObjet.init() // indispensable pour instanciation
      const idchecker = {}
      var erreurDoublons = false
      
      /*
       * *** Boucle sur toutes les marques ***
       */
      this._tags = this.data.analyse_tags.map(dtag => {

        /*
         * --- Contrôle des doublons d'ID ---
         */
        if ( undefined == idchecker[dtag.id] ) {
          Object.assign( idchecker, {[dtag.id]: true} )

          // Mémorisation du dernier ID (pour en affecter des 
          // nouveaux à chaque fois)
          if ( dtag.id > my._lastId ) { my._lastId = 0 + dtag.id }

        } else {
          erreurDoublons = true
          console.error("Double utilisation de l'ID %i :", dtag.id, dtag)
        }

        /*
         * --- L'instance à retourner ---
         */
        return AMark.instanciate(this, dtag)
      })
      if ( erreurDoublons ) {
        erreur(t('errors.marks.duplicate_ids'))
      }
      console.info("_lastId (après chargement) = ", this._lastId)
      // console.log("Tags instanciées :", this._tags)
    }; return this._tags;
  }

  get infos(){
    return this.data.infos
  }

  get preferences(){
    return this.data.preferences
  }

  get analyse_title(){
    return this.infos.analyse_title
  }

  get id(){return this.infos.analyse_id}

  /**
   * @return le chemin d'accès à l'analyse (son dossier)
   */
  get path(){
    return this._path || (this._path = this.data.path)
  }



/*****************************************************************/

  /* --- Ouverture / création --- */

  /**
   * Enregistre l'analyse courante si elle a été modifiée.
   * @return false si l'enregistrement a échoué
   */
  static async saveIfModified(){
    if ( this.current && this.current.modified ) {
      return await AnalyseSaver.save()
    }
    return true
  }

  /**
   * Ouverture d'une autre analyse (choix du dossier)
   */
  static async openAnalyse(){
    if ( !(await this.saveIfModified()) ) return
    try {
      await invoke('analyse:open')
    } catch(err) {
      erreur(err.message)
    }
  }

  /**
   * Recharger l'analyse courante (pour prendre en compte les
   * modifications du dossier, par exemple de nouveaux systèmes)
   */
  static async reloadAnalyse(){
    if ( !(await this.saveIfModified()) ) return
    invoke('analyse:reload').catch(err => erreur(err.message))
  }

  /**
   * Découpe la partition PDF en systèmes, numérotés. La fenêtre est
   * ensuite rechargée.
   */
  static async cutScore(){
    if ( !(await this.saveIfModified()) ) return
    try {
      const pdf = await invoke('analyse:chooseScorePdf')
      if ( !pdf ) return
      Sablier.show(t('messages.cutting_score'))
      await invoke('analyse:cutScore', {pdf})
    } catch(err) {
      Sablier.hide()
      erreur(err.message)
    }
  }

  /**
   * Numérote les mesures des systèmes existants. La fenêtre est
   * ensuite rechargée.
   */
  static async numberScore(){
    if ( !(await this.saveIfModified()) ) return
    try {
      Sablier.show(t('messages.numbering_score'))
      await invoke('analyse:numberScore')
    } catch(err) {
      Sablier.hide()
      erreur(err.message)
    }
  }

  /**
   * Ouvre le panneau des informations pour créer une nouvelle
   * analyse.
   */
  static newAnalyse(){
    this.panneau_infos.showForCreation()
  }

  /**
   * Pour créer une nouvelle analyse
   * -------------------------------
   * (à partir des données du panneau des informations)
   */
  static async createNew(){
    const data = this.panneau_infos.getData()
    data.systems_source = DGet('#metadata_systems_source').value
    if ( !this.dataAreValide(data) ) return
    if ( !(await this.saveIfModified()) ) return
    try {
      await invoke('analyse:create', data)
      // La fenêtre est rechargée avec la nouvelle analyse
    } catch(err) {
      erreur(err.message)
    }
  }

/* --- Export Methods --- */

static async exportCurrentToHtml(){
  if ( not(this.current) ) {
    return erreur(t('errors.no_analyse_to_export'))
  }
  message(t('messages.exporting_html'))
  try {
    const content = DGet('section#content').cloneNode(true)
    /*
    |  On épure le code en retirant toutes les poignées de
    |  redimensionnement
    */
    content.querySelectorAll('.ui-resizable-handle').forEach(h => h.remove())
    /*
    |  Les images sont mises en dur dans le code
    */
    await HtmlImages.embed(content)
    /*
    |  Il faut ajouter le code CSS en dur (préférences)
    */
    const code = `<style type="text/css">\n${PreferencesPanel.buildSelectorsInHead()}\n</style>\n${content.outerHTML}`
    const htmlPath = await invoke('analyse:exportHtml', {code_html: code})
    message(t('messages.exported_html', {path: htmlPath}))
  } catch(err) {
    erreur("L'analyse n'a pas pu être exportée : " + err.message)
  }
}

  static exportImage(){
    if ( ! this.current ) {
      return erreur(t('errors.need_choose_analyse'))
    }
    erreur(t('errors.image_export_todo'))
  }

  /**
   * Pour produire l'image SVG (ou les images) de l'analyse
   * OBSOLÈTE (pas réussi à le faire fonctionner correctement)
   */
  static exportToSvg(){
    if ( ! this.current ) {
      return erreur(t('errors.need_analyse_first'))
    }
    erreur(t('errors.svg_export_todo'))
  }

  /**
   * @return Les données par système (table avec l'identifiant-index
   *         du système en clé), c'est-à-dire leur position ainsi
   *          que les données utiles de tous leurs éléments associés
   * 
   * Note : ces données servent pour l'exportation de l'image (qui 
   * sera construite ave RMagick côté serveur).
   * 
   */
  static getSystemesData(){
    const systemesData = {}
    Systeme.each(sys => {
      if ( sys.height < 100 ) {
        delete sys._height
      }
      // console.log("sys.height = %i", sys.height, sys.obj.offsetHeight)
      const dsystem = {id: sys.index, real_top:sys.real_top, top: sys.top, height:sys.height, width:sys.width, full_height:sys.full_height, marks: []}
      // Tous les objets du système
      sys.objets.forEach( ao => {
        const dao = {
          content:ao.content, 
          type:ao.type, 
          top:ao.top, 
          left:ao.left, 
          width:ao.width, 
          height:ao.height,
          prolong: ao.prolong
        }
        dsystem.marks.push(dao)
      })
      Object.assign(systemesData, {[sys.index]: dsystem})
    })
    return systemesData;
  }


  /**
   * @return true si les données pour l'analyse sont valides
   * Pour une création, c'est seulement une première vérification. 
   * Les données devront être confirmées côté serveur.
   */ 
  static dataAreValide(data){
    var errors = []
    if ( data.analyse_id == '' ) {
      errors.push(t('errors.creation.id_required'))
    }
    if ( data.analyse_id.replace(/[a-zA-Z0-9_\-]/g,'') != '' ) {
      errors.push(t('errors.creation.id_chars'))
    }
    if ( data.piece_title == '') {
      errors.push(t('errors.creation.title_required'))
    }
    if ( data.composer == '') {
      errors.push(t('errors.creation.composer_required'))
    }
    if ( data.folder == '' ) {
      errors.push(t('errors.creation.folder_required'))
    }
    if ( errors.length ) {
      erreur(errors.join('<br />'))
      return false
    } else {
      return true
    }
  }



  // @return l'objet du panneau des informations de l'analyse
  static get panneau_infos(){
    if (undefined == this._panneau_infos) {
      this._panneau_infos = new PanneauInfos()
    } return this._panneau_infos
  }
}

/**
 * Titre de l'œuvre, compositeur et titre de l'analyse (s'ils existent)
 * au centre de la bande supérieure de la fenêtre
 */
export function setWindowTitle(infos){
  infos = infos || {}
  DGet('#window-title').textContent = [infos.piece_title, infos.composer, infos.analyse_title]
    .map(s => String(s || '').trim()).filter(Boolean).join(', ')
}

/**
 * Allume ou éteint la lumière d'enregistrement
 */
function setRedLight(on){
  DGet('#red-light').classList[on ? 'add' : 'remove']('red')
}

/**
 * Mise en dur des images dans le code HTML exporté
 * - les systèmes sont redimensionnés à la largeur des systèmes et
 *   convertis en webp,
 * - les images SVG sont remplacées par leur code,
 * - les autres images sont converties en webp.
 */
const HtmlImages = {

  async embed(container){
    for ( const img of container.querySelectorAll('img') ) {
      const src = img.getAttribute('src')
      if ( !src || src.startsWith('data:') ) continue
      const response = await fetch(src)
      if ( !response.ok ) throw new Error(t('errors.image_not_found', {src}))
      if ( src.toLowerCase().endsWith('.svg') ) {
        const code = await response.text()
        const holder = document.createElement('div')
        holder.innerHTML = code.substring(code.indexOf('<svg')).trim()
        img.replaceWith(...holder.childNodes)
      } else {
        const width = img.classList.contains('systeme') ? Number(pref('systeme_width')) : null
        img.setAttribute('src', await this.toWebp(await response.blob(), width))
      }
    }
  },

  async toWebp(blob, width){
    const bitmap = await createImageBitmap(blob)
    const w = width || bitmap.width
    const h = Math.round(bitmap.height * w / bitmap.width)
    const canvas = new OffscreenCanvas(w, h)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    const webp = await canvas.convertToBlob({type: 'image/webp', quality: 0.85})
    return await new Promise((ok, ko) => {
      const reader = new FileReader()
      reader.onload  = () => ok(reader.result)
      reader.onerror = () => ko(reader.error)
      reader.readAsDataURL(webp)
    })
  }
}
