import { DCreate, listen } from './dom.js'
import { addPanelHead } from './Panneau.js'
import { t } from './i18n.js'
import { editorField } from './LiaisonEditor.js'
import { RangeField, toPrefsButton } from './RangeField.js'
import { Preferences } from './Preferences.js'
import { PreferencesPanel } from './PreferencesPanel.js'
/**
 * BorderEditor
 * ------------
 * Boite « Bord/trait… » des marques à bord (cf. AMark#borderTarget),
 * réglages communs à toutes (valeurs de départ : celles de la première).
 * Intensité : 0 (blanc) à 100 (noir). « → préfs » : épaisseur et
 * intensité deviennent celles des préférences. : épaisseur (curseur) et type de trait (continu,
 * pointillé). Chaque réglage est montré aussitôt, gardé seulement par
 * « OK » (« Renoncer » : la marque reprend ses bords), comme pour une
 * liaison (cf. LiaisonEditor.js). « Valeur par défaut » : bords des
 * préférences.
 */
class BorderEditorClass {

  open(marks){
    this.close()
    marks = [marks].flat().filter(m => m.borderTarget)
    if ( !marks.length ) return
    this.marks = marks
    const mark = {
        previewBorder: (v) => marks.forEach(m => m.previewBorder(v))
      , confirmBorder: () => marks.forEach(m => m.confirmBorder())
      , get border(){ return marks[0].border }
    }
    const T = (k) => t(`ui.panels.liaison.${k}`)
    const st = mark.border
    const line  = DCreate('SELECT', {inner: ['solid', 'dashed'].map(v => DCreate('OPTION', {value: v, text: T('lines')[v]}))})
    line.value = st.line
    const width = new RangeField({min: 1, max: 20, value: st.width, onInput: v => v > 0 && mark.previewBorder({width: v})})
    const intensity = new RangeField({min: 0, max: 100, value: st.intensity, onInput: v => v >= 0 && v <= 100 && mark.previewBorder({intensity: v})})
    this.width = width
    this.intensity = intensity
    listen(line, 'change', () => mark.previewBorder({line: line.value}))
    const btnDefault = DCreate('BUTTON', {text: t('ui.panels.border.default')})
    listen(btnDefault, 'click', () => {
      mark.previewBorder({width: null, line: null, intensity: null})
      const cur = mark.border
      line.value  = cur.line
      width.value = cur.width
      intensity.value = cur.intensity
    })
    const btnCancel = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.renounce'), style: 'float:left;'})
    const btnOk     = DCreate('BUTTON', {class: 'btn-default', text: t('ui.buttons.ok')})
    listen(btnCancel, 'click', this.close.bind(this))
    listen(btnOk, 'click', () => { mark.confirmBorder() ; this.close() })
    const panel = DCreate('DIV', {id: 'border_editor', inner: [
        DCreate('DIV', {class: 'rows', inner: [
            editorField(T('width'), [...width.elements, DCreate('SPAN', {text: 'px'})])
          , editorField(t('ui.panels.border.intensity'), intensity.elements)
          , editorField(T('line'),  line)
          , editorField('', [btnDefault, toPrefsButton(() => this.toPrefs())])
        ]})
      , DCreate('DIV', {class: 'buttons', inner: [btnCancel, btnOk]})
    ]})
    document.body.appendChild(panel)
    this.panel = panel
    addPanelHead(panel, {title: t('ui.panels.border.title'), onClose: this.close.bind(this), target: marks.map(m => m.obj)})
  }

  /**
   * « → préfs » : épaisseur et intensité réglées devenues celles des
   * préférences de chaque type des marques éditées, appliquées (cf.
   * PreferencesPanel#applyBorder) ; ces marques suivent désormais les
   * préférences
   */
  async toPrefs(){
    const values = {width: this.width.value, intensity: this.intensity.value}
    if ( !(values.width > 0) || !(values.intensity >= 0 && values.intensity <= 100) ) return
    for ( const prop of ['width', 'intensity'] ) {
      const keys = [...new Set(this.marks.map(m => m.borderPrefKeyOf(prop)))]
      for ( const key of keys ) {
        const old = Preferences.get(key)
        Preferences.set(key, values[prop])
        Preferences.saveData(key, values[prop])
        await PreferencesPanel.applyBorder(key, old)
      }
    }
    this.marks && this.marks.forEach(m => m.previewBorder({width: null, intensity: null}))
  }

  // Fermeture sans OK (Renoncer, croix…) : les marques reprennent leurs
  // bords
  close(){
    this.marks && this.marks.forEach(m => m.cancelBorder())
    this.panel && this.panel.remove()
    this.panel = null
    this.marks = null
  }
}

export const BorderEditor = new BorderEditorClass()
