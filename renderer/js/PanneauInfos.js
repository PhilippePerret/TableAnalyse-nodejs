import { DGet, listen } from './dom.js'
import { isBool } from './lib/common.js'
import { erreur } from './lib/Message.js'
import { invoke } from './api.js'
import { Panneau } from './Panneau.js'
import { Analyse } from './Analyse.js'
import { onKeyDownUniversel } from './KeyboardEvents.js'

export class PanneauInfos {

  get PROPS(){return ['piece_title', 'composer', 'analyse_title','analyse_id','folder','analyst']}

  toggle(){ this.panneau.toggle.call(this.panneau)}
  get panneau(){return this._pano||(this._pano = new Panneau(this))}
  get panneauId(){return 'panneau_infos'}
  onKeyPress(e){
    var returnU = onKeyDownUniversel(e)
    if ( isBool(returnU) ) return returnU
    if ( e.shiftKey && e.key == 'I' ) return this.toggle()
  }

  /**
   * Observation des boutons du panneau
   */
  init(){
    const o = this.panneau.obj
    listen(DGet('#btn_infos_close', o),          'click', this.toggle.bind(this))
    listen(DGet('#btn_infos_create', o),         'click', Analyse.createNew.bind(Analyse))
    listen(DGet('#btn_infos_save', o),           'click', () => Analyse.current ? Analyse.current.saveInfos() : erreur("Aucune analyse n'est ouverte."))
    listen(DGet('#btn_choose_folder', o),        'click', this.chooseFolder.bind(this, 'metadata_folder', "Dossier dans lequel créer l'analyse"))
    listen(DGet('#btn_choose_systems', o),       'click', this.chooseFolder.bind(this, 'metadata_systems_source', "Dossier contenant les images des systèmes"))
  }

  async chooseFolder(fieldId, title){
    try {
      const folder = await invoke('dialog:chooseFolder', {title: title})
      if ( folder ) DGet(`#${fieldId}`).value = folder
    } catch(err) {
      erreur(err.message)
    }
  }

  /**
   * Prépare le panneau pour la création d'une nouvelle analyse
   */
  showForCreation(){
    this.PROPS.forEach(prop => {
      if ( prop == 'analyst' ) return
      DGet(`#metadata_${prop}`).value = ''
    })
    DGet('#metadata_systems_source').value = ''
    this.panneau.obj.classList.add('creation')
    this.panneau.isOpened || this.toggle()
  }

  onClose(){
    this.panneau.obj.classList.remove('creation')
  }

  /**
   * Retourne les données du panneau
   *
   */
  getData(){
    var data = {}
    this.PROPS.forEach(prop => {
      Object.assign(data, {[prop]: DGet(`#metadata_${prop}`).value})
    })
    return data
  }

  /**
   * Renseigne les champs du panneau avec les données de
   * +data+
   *
   */
  setData(data){
    this.PROPS.forEach(prop => {
      DGet(`#metadata_${prop}`).value = data[prop]||''
    })
  }
}
