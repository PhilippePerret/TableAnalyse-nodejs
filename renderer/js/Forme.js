import { DCreate, DGet, listen } from './dom.js'
import { message } from './lib/Message.js'
import { Panneau } from './Panneau.js'
import { pref } from './Preferences.js'
import { AObjet } from './AObjet.js'
import { Systeme } from './Systeme.js'
import { Editeur } from './Editeur.js'
import { t } from './i18n.js'
/**

  Forme
  -----
  Menu « Forme » de la barre de menus : aller à une mesure, voir
  (déplier) les marques de forme, construire la forme.

*/
export class Forme {

  /**
   * Marques de forme dépliées (« Voir la forme »). Repliées par défaut.
   */
  static shown = false

  /**
   * « Aller à la mesure… » : demande le numéro de la mesure et fait
   * défiler la table jusqu'à son système
   */
  static gotoMeasure(){
    const mesures = this.measureMarks
    if ( mesures.length == 0 ) return message(t('messages.no_measure_number'))
    const last = Math.max(...mesures.map(m => m.number))
    this.editor = this.editor || new Editeur({data: {}}, {setMethod: this.onGotoMeasure.bind(this)})
    this.editor.value = ''
    this.editor.show({top: 120, left: Math.round(window.innerWidth / 2) - 100, fixed: true}, t('messages.goto_measure_prompt', {last}))
  }
  static onGotoMeasure(value){
    if ( null == value || value.trim() == '' ) return
    const num = Number(value.trim())
    const found = this.measureMarks.find(m => m.number == num)
    if ( !found ) return message(t('messages.measure_not_found', {num: value.trim()}))
    const mark = found.mark
    const sys = Systeme.getSystemeAssociated(mark)
    window.scrollTo({top: (sys ? sys.top : mark.top) - 100})
    mark.clignote()
  }

  // Numéros de mesure de la table : {mark, number}
  static get measureMarks(){
    return AObjet.select(ao => ao.subtype == 'mes')
      .map(mark => ({mark, number: Number(String(mark.content).trim())}))
      .filter(m => !isNaN(m.number))
  }

  /**
   * « Voir la forme » : déplie (+on+ true) ou replie les marques de
   * forme
   */
  static show(on){
    this.shown = on
    AObjet.items.forEach(ao => ao.isForme && ao.obj && ao.toggleExpanded(on))
  }

  /**
   * « Construire la forme » : panneau du choix de l'emplacement (avant
   * ou après la partition, préférence form_position par défaut)
   */
  static openBuildPanel(){
    this.panneau.isOpened || this.panneau.show()
  }
  static get panneau(){
    return this._pano || (this._pano = new Panneau({
        panneauId:    'form-build-panel'
      , panneauTitle: t('ui.panels.form_build.title')
      , build:        this.buildPanel.bind(this)
      , onOpen:       () => { DGet('#form-build-position').value = pref('form_position') }
    }))
  }
  static buildPanel(){
    const menu = DCreate('SELECT', {id: 'form-build-position', inner: ['before', 'after'].map(value =>
      DCreate('OPTION', {value, text: t(`ui.form_position.${value}`)})
    )})
    const btn = DCreate('BUTTON', {class: 'btn-default', text: t('ui.panels.form_build.build')})
    listen(btn, 'click', () => this.build(menu.value))
    const o = DCreate('DIV', {id: 'form-build-panel', class: 'panneau hidden', style: 'width:420px;left:calc(50% - 210px);', inner: [
        DCreate('DIV', {class: 'row', inner: [DCreate('LABEL', {text: t('ui.panels.form_build.position') + ' '}), menu]})
      , DCreate('DIV', {class: 'buttons', inner: [btn]})
    ]})
    document.body.appendChild(o)
  }

  /**
   * Construira la forme sur une nouvelle page, avant ou après la
   * partition (+position+ : 'before' ou 'after')
   */
  static build(position){
    this.panneau.hide()
    message(t('messages.cannot_build_form'))
  }
}
