import { DCreate, DGet, listen } from './dom.js'
import { message } from './lib/Message.js'
import { Panneau } from './Panneau.js'
import { pref, Preferences } from './Preferences.js'
import { on } from './events.js'
import { FormeBuilder } from './FormeBuilder.js'
import { AObjet } from './AObjet.js'
import { Systeme } from './Systeme.js'
import { Editeur } from './Editeur.js'
import { TYPES_FORME, formLevel } from './Constants.js'
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
   * Au lancement : forme construite (préférence form_built) redessinée
   * dès que les systèmes sont chargés
   */
  static init(){
    on('systems:loaded', () => pref('form_built') && FormeBuilder.build())
  }

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
   * Marques de forme dans l'ordre de la partition (système, puis
   * position horizontale)
   */
  static sorted(marks){
    const key = m => {
      const sys = Systeme.getSystemeAssociated(m)
      return [sys ? sys.top : m.top, m.left]
    }
    return marks
      .map(m => ({m, k: key(m)}))
      .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1])
      .map(o => o.m)
  }

  // Numéros de mesure du système +sys+, de gauche à droite
  static measureMarksOf(sys){
    return AObjet.select(ao => ao.subtype == 'mes' && ao.obj && Systeme.getSystemeAssociated(ao) === sys)
      .sort((a, b) => a.left - b.left)
  }

  /**
   * Numéro de mesure le plus proche horizontalement de la marque, dans
   * le même système (marque de mesure, ou undefined)
   */
  static nearestMeasureMark(mark){
    let best, ecart = Infinity
    this.measureMarksOf(Systeme.getSystemeAssociated(mark)).forEach(ao => {
      const d = Math.abs(ao.left - mark.left)
      if ( d < ecart ) { ecart = d ; best = ao }
    })
    return best
  }

  /**
   * Place la marque de forme +mark+ sur sa mesure : borne alignée à
   * gauche sur le début de la mesure (numéro de mesure) pour un début
   * de portion, à droite sur sa fin (mesure suivante ou, pour la
   * dernière, dernière barre relevée par la découpe, sinon bout du
   * système) pour une fin de portion.
   * La mesure est celle qui contient +x+ (abscisse à l'écran, p.e. le
   * clic) ou, par défaut, le milieu de la borne.
   * @return true si la marque a été placée
   */
  static placeOnMeasure(mark, x){
    const sys = Systeme.getSystemeAssociated(mark)
    const mesures = this.measureMarksOf(sys)
    if ( !sys || mesures.length == 0 ) return false
    const rect  = this.measureRect
    const borne = DGet('span.borne', mark.obj).getBoundingClientRect()
    undefined === x && (x = borne.left + borne.width / 2)
    let i = mesures.findLastIndex(m => rect(m).left <= x)
    i < 0 && (i = 0)
    let dx
    if ( TYPES_FORME[mark.subtype].startOf ) {
      const right = mesures[i + 1] ? rect(mesures[i + 1]).left : this.systemEndX(sys)
      dx = right - borne.right
    } else {
      dx = rect(mesures[i]).left - borne.left
    }
    mark.left = Math.round(mark.left + dx / (mark.obj.currentCSSZoom || 1))
    return true
  }

  // Rectangle (écran) du numéro de mesure +m+
  static measureRect(m){
    return (DGet('span.content', m.obj) || m.obj).getBoundingClientRect()
  }

  /**
   * Numéro de la mesure du système +sys+ qui contient l'abscisse +x+
   * (écran) ; la première avant le premier numéro. null sans numéros.
   */
  static measureNumberAt(sys, x){
    const mesures = this.measureMarksOf(sys)
    if ( !mesures.length ) return null
    const i = Math.max(0, mesures.findLastIndex(m => this.measureRect(m).left <= x))
    return Number(String(mesures[i].content).trim())
  }

  /**
   * Numéro de la mesure d'une marque : celle où commence la borne d'un
   * début de portion, où finit celle d'une fin, où commence toute autre
   * marque (p.e. une modulation)
   */
  static measureOf(mark){
    const sys = Systeme.getSystemeAssociated(mark)
    if ( !sys ) return null
    const r = (DGet('span.borne', mark.obj) || mark.obj).getBoundingClientRect()
    const isEnd = mark.isForme && TYPES_FORME[mark.subtype].startOf
    return this.measureNumberAt(sys, isEnd ? r.right - 2 : r.left + 2)
  }

  // Dernier numéro de mesure de la pièce
  static get lastMeasure(){
    const nums = this.measureMarks.map(m => m.number)
    return nums.length ? Math.max(...nums) : null
  }

  // Abscisse (écran) de la fin de la dernière mesure du système
  static systemEndX(sys){
    const r = sys.obj.getBoundingClientRect()
    const end = Number(sys.data.measures_end)
    return end > 0 ? r.left + end * r.width : r.right
  }

  /**
   * Replace la marque de forme +mark+ à sa hauteur : bas de la borne à
   * la distance (préférence form_height_<niveau>) au-dessus de son
   * système
   * @return true si la marque a été placée
   */
  static placeAtHeight(mark){
    const sys = Systeme.getSystemeAssociated(mark)
    if ( !sys ) return false
    const h = Number(pref(`form_height_${formLevel(mark.subtype)}`))
    const z = mark.obj.currentCSSZoom || 1
    const dy = sys.obj.getBoundingClientRect().top - DGet('span.borne', mark.obj).getBoundingClientRect().bottom
    mark.top = Math.round(mark.top + dy / z - h)
    mark.associateWithSystem()
    return true
  }

  // Libellé d'une marque de forme : nom et mesure (si trouvée)
  static labelOf(mark){
    const mes = this.nearestMeasureMark(mark)
    const name = mark.content || TYPES_FORME[mark.subtype].name
    return mes ? t('ui.marks.forms.at_measure', {name, num: String(mes.content).trim()}) : name
  }

  /**
   * Fin de la portion qui commence à la marque +start+ (pour la
   * construction de la forme) :
   *  1. la marque de fin associée à ce début (data.start), si elle
   *     existe ;
   *  2. sinon le premier début de portion suivant, de même niveau ou
   *     de niveau supérieur (une partie termine aussi une section) ;
   *  3. sinon la fin de la pièce (retour null).
   */
  static endOf(start){
    const forms = AObjet.select(ao => ao.isForme)
    const end = forms.find(m => m.data.start == start.id)
    if ( end ) return end
    const level = TYPES_FORME[start.subtype].level
    const starts = this.sorted(forms.filter(m => TYPES_FORME[m.subtype].level))
    return starts.slice(starts.indexOf(start) + 1).find(m => TYPES_FORME[m.subtype].level <= level) || null
  }

  // Début de portion renommé : ses marques de fin prennent son nom
  static updateEndsOf(start){
    AObjet.items.forEach(ao => ao.isForme && ao.data.start == start.id && (ao.content = start.content))
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
   * « Construire la forme » : panneau des réglages de la construction
   * (emplacement, éléments à afficher), enregistrés dans les
   * préférences de l'analyse et remis à l'ouverture
   */
  static openBuildPanel(){
    this.panneau.isOpened || this.panneau.show()
  }
  static get panneau(){
    return this._pano || (this._pano = new Panneau({
        panneauId:    'form-build-panel'
      , panneauTitle: t('ui.panels.form_build.title')
      , build:        this.buildPanel.bind(this)
      , onOpen:       () => {
          DGet('#form-build-position').value  = pref('form_position')
          DGet('#form-build-measures').checked = pref('form_build_measures')
          DGet('#form-build-keys').checked     = pref('form_build_keys')
        }
    }))
  }
  static buildPanel(){
    const T = k => t(`ui.panels.form_build.${k}`)
    const menu = DCreate('SELECT', {id: 'form-build-position', inner: ['before', 'after'].map(value =>
      DCreate('OPTION', {value, text: t(`ui.form_position.${value}`)})
    )})
    const checkbox = (id, label) => DCreate('DIV', {class: 'row', inner: [
        DCreate('INPUT', {type: 'checkbox', id})
      , DCreate('LABEL', {for: id, text: ' ' + label})
    ]})
    const btn = DCreate('BUTTON', {class: 'btn-default', text: T('build')})
    listen(btn, 'click', () => this.build())
    const o = DCreate('DIV', {id: 'form-build-panel', class: 'panneau hidden', style: 'width:max-content;left:calc(50% - 200px);', inner: [
        DCreate('DIV', {class: 'row', inner: [DCreate('LABEL', {text: T('position') + ' '}), menu]})
      , checkbox('form-build-measures', T('measures'))
      , checkbox('form-build-keys', T('keys'))
      , DCreate('DIV', {class: 'buttons', inner: [btn]})
    ]})
    document.body.appendChild(o)
  }

  /**
   * Bouton « Construire » : réglages enregistrés, puis construction de
   * la forme à l'emplacement voulu (cf. FormeBuilder)
   */
  static build(){
    const settings = {
        form_position:        DGet('#form-build-position').value
      , form_build_measures:  DGet('#form-build-measures').checked
      , form_build_keys:      DGet('#form-build-keys').checked
    }
    if ( !AObjet.items.some(ao => ao.isForme) ) return message(t('messages.no_form_mark'))
    Object.entries(settings).forEach(([key, value]) => {
      Preferences.set(key, value)
      Preferences.saveData(key, value)
    })
    this.panneau.hide()
    if ( FormeBuilder.build() ) {
      pref('form_built') || Preferences.saveData('form_built', true)
      FormeBuilder.scrollTo()
    }
  }
}
