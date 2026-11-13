import { DGet, listen } from './dom.js'
import { isBool } from './lib/common.js'
import { erreur } from './lib/Message.js'
import { invoke } from './api.js'
import { Panneau } from './Panneau.js'
import { Analyse } from './Analyse.js'
import { onKeyDownUniversel } from './KeyboardEvents.js'
import { t } from './i18n.js'

export class PanneauInfos {

  get PROPS(){return ['piece_title', 'composer', 'analyse_title','analyse_id','folder','analyst']}

  toggle(){ this.panneau.toggle.call(this.panneau)}
  get panneau(){return this._pano||(this._pano = new Panneau(this))}
  get panneauId(){return 'panneau_infos'}
  get panneauTitle(){return t('ui.panels.infos.title')}
  get panneauShortcut(){return '⇧I'}
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
    listen(DGet('#btn_infos_save', o),           'click', this.saveInfos.bind(this))
    listen(DGet('#btn_choose_folder', o),        'click', this.chooseFolder.bind(this, 'metadata_folder', t('ui.dialogs.choose_creation_folder')))
    listen(DGet('#btn_choose_systems', o),       'click', this.chooseFolder.bind(this, 'metadata_systems_source', t('ui.dialogs.choose_systems_folder')))
  }

  // Enregistrement des infos du panneau (édition)
  saveInfos(){
    if ( !Analyse.current ) return erreur(t('errors.no_analyse_open'))
    Object.assign(Analyse.current.data.infos, this.getData())
    Analyse.current.saveInfos()
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
    this.applyMode()
    this.panneau.isOpened || this.toggle()
  }

  onOpen(){ this.applyMode() }

  onClose(){
    this.panneau.obj.classList.remove('creation')
  }

  /**
   * Même panneau en création et en édition. En édition, le conteneur,
   * l'identifiant et les systèmes (dossier de l'analyse) ne sont pas
   * modifiables.
   */
  applyMode(){
    const creation = this.panneau.obj.classList.contains('creation')
    ;['metadata_analyse_id', 'metadata_folder', 'metadata_systems_source', 'btn_choose_folder', 'btn_choose_systems'].forEach(id => {
      DGet(`#${id}`).disabled = !creation
    })
    // En édition : infos de l'analyse (les champs ont pu être vidés pour
    // une création) et emplacement réel
    const apath = !creation && Analyse.current && Analyse.current.data.path
    if ( apath ) {
      this.setData(Analyse.current.data.infos)
      const sep = apath.includes('\\') ? '\\' : '/'
      const parts = apath.split(sep)
      DGet('#metadata_analyse_id').value     = parts[parts.length - 1]
      DGet('#metadata_folder').value         = parts.slice(0, -1).join(sep)
      DGet('#metadata_systems_source').value = '' // dossier « systems » de l'analyse
    }
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
