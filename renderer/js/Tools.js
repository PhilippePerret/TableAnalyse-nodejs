import { DGet, listen } from './dom.js'
import { isBool } from './lib/common.js'
import { message, erreur } from './lib/Message.js'
import { invoke } from './api.js'
import { Panneau } from './Panneau.js'
import { Preferences } from './Preferences.js'
import { Current } from './Current.js'
import { Systeme } from './Systeme.js'
import { Analyse } from './Analyse.js'
import { onKeyDownUniversel } from './KeyboardEvents.js'

export class Tools {

  static toggle(){this.panneau.toggle.call(this.panneau)}
  static get panneau(){return this._pano || (this._pano = new Panneau(this))}
  static get panneauId(){return 'panneau_outils'}
  static get panneauTitle(){return 'Boite à outils'}
  static get panneauShortcut(){return '⇧O'}
  static onKeyPress(e){
    var returnU = onKeyDownUniversel(e)
    if ( isBool(returnU) ) return returnU
    if ( e.shiftKey && e.key == 'O' ) return this.toggle()
  }

  /**
   * Opérations à faire à l'ouverture du panneau des outils
   */
  static onOpen(){
    DGet('#value_ecart_preferences').innerHTML = Preferences.get('distance_systemes')
  }

  /**
   * Observation des boutons du panneau (appelée à la préparation de
   * l'interface)
   */
  static init(){
    const o = this.panneau.obj
    listen(this.menuAssistantCode,              'change', this.onChooseAssistantCode.bind(this))
    listen(DGet('#btn_build_score', o),         'click',  this.buildScoreFromCode.bind(this))
    listen(DGet('#btn_distribute_systems', o),  'click',  () => this.distributeSystem(DGet('#tool_inter_system').value))
    listen(DGet('#btn_export_image', o),        'click',  Analyse.exportImage.bind(Analyse))
    listen(DGet('#btn_export_svg', o),          'click',  Analyse.exportToSvg.bind(Analyse))
    listen(DGet('#btn_close_tools', o),         'click',  this.toggle.bind(this))
  }

  /* --- MuScore Code Methods --- */

  static onChooseAssistantCode(){
    /**
     ** Méthode appelée pour assister le code muscore à utiliser
     ** Elle est appelée par le menu qui permet d'insérer plein de
     ** choses dans le code.
     **/
    try {
      const code = this.menuAssistantCode.value
      this.musCodeField.value = code + "\n" + this.musCodeField.value
    } catch(err) {
      erreur(err.message)
    } finally {
      this.menuAssistantCode.selectedIndex = 0
    }

  }

  static get menuAssistantCode(){
    return this._massmuscode || (this._massmuscode = DGet('select#assistant_muscode'))
  }
  static get musCodeField(){
    return this._muscodefield || (this._muscodefield = DGet('textarea#music_score_code'))
  }

  /**
   * Méthode appelée depuis le panneau des outils pour construire
   * rapidement une image SVG de partition simple à partir du code
   * fourni (application externe ScoreImage).
   */
  static async buildScoreFromCode(){
    const muscode = this.musCodeField.value.trim()
    if ( !muscode ) return erreur("Il faut donner le code dans le champ.")
    if ( !Current.analyse ) return erreur("Il faut d'abord ouvrir une analyse.")
    try {
      const res = await invoke('tools:buildImage', {code: muscode})
      if ( res.ok ) {
        message(`L'image ${res.image_name} a été construite avec succès.\nSon nom est dans le presse-papier, tu peux créer une image pour la voir tout de suite.`)
      } else {
        erreur(res.error)
      }
    } catch(err) {
      erreur(err.message)
    }
  }

  /**
   * Méthode permettant de répartir les systèmes de façon
   * uniforme.
   * Utilisé au tout départ pour écarter les systèmes.
   * Utilisé ensuite pour maintenant un certain écart tout en
   * déplacement tous les éléments du système.
   */
  static distributeSystem(ecart){
    ecart = ecart || Preferences.get('distance_systemes')
    ecart = parseInt(ecart,10)
    var current_top = Preferences.get('top_first_system')
    Systeme.each(sys => {
      sys.top = current_top
      current_top += sys.full_height + ecart
    })
    message("Il faut penser à enregistrer l'analyse.")
  }
}
