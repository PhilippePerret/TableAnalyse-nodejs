import { DCreate, listen } from './dom.js'
import { addPanelHead } from './Panneau.js'
import { t } from './i18n.js'
import { editorField } from './LiaisonEditor.js'
import { RangeField, toPrefsButton } from './RangeField.js'
import { Preferences } from './Preferences.js'
import { PreferencesPanel } from './PreferencesPanel.js'
import { setModified } from './Current.js'
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
    // « Aspect » : marques à trait et texte, taille du texte en plus (#287)
    const withText = marks.every(m => m.hasAspectText)
    const mark = {
        previewBorder: (v) => marks.forEach(m => m.previewBorder(v))
      , confirmBorder: () => marks.forEach(m => { m.confirmBorder() ; withText && m.confirmTextSize() })
      , get border(){ return marks[0].border }
    }
    const text = withText && new RangeField({min: 6, max: 120, value: marks[0].textSize, onInput: v => v > 0 && marks.forEach(m => m.previewTextSize(v))})
    this.withText = withText
    // Motifs : alignement du nom (à gauche, au centre, à droite)
    const withAlign = marks.every(m => m.type == 'mot')
    const ALIGNS = ['left', 'center', 'right']
    const alignOf = m => ALIGNS.includes(m.data.align) ? m.data.align : 'center'
    const previewAlign = v => marks.forEach(m => { ALIGNS.forEach(a => m.spanContent.classList.toggle(a, a == v)) })
    // Choix par boutons radio, chacun avec son picto (#299)
    const PICTO = {
        left:   [[2, 14], [2, 10], [2, 14], [2, 8]]
      , center: [[2, 14], [5, 11], [2, 14], [6, 10]]
      , right:  [[2, 14], [6, 14], [2, 14], [8, 14]]
    }
    const picto = v => {
      const NS = 'http://www.w3.org/2000/svg'
      const svg = document.createElementNS(NS, 'svg')
      svg.setAttribute('viewBox', '0 0 16 16') ; svg.setAttribute('width', '16') ; svg.setAttribute('height', '16')
      svg.setAttribute('class', 'align-picto')
      PICTO[v].forEach(([x1, x2], i) => {
        const l = document.createElementNS(NS, 'line')
        Object.entries({x1, x2, y1: 3 + i * 3.5, y2: 3 + i * 3.5, stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round'}).forEach(([k, val]) => l.setAttribute(k, String(val)))
        svg.appendChild(l)
      })
      return svg
    }
    const radios = withAlign && ALIGNS.map(v => {
      const input = DCreate('INPUT', {type: 'radio', name: 'mark-align', value: v})
      input.checked = v == alignOf(marks[0])
      listen(input, 'change', () => input.checked && previewAlign(v))
      return DCreate('LABEL', {class: `align-choice align-${v}`, inner: [input, picto(v), DCreate('SPAN', {text: t(`ui.panels.border.align_${v}`)})]})
    })
    const align = radios && {
        get value(){ const c = radios.map(r => r.querySelector('input')).find(i => i.checked) ; return c ? c.value : 'center' }
      , set value(v){ radios.forEach(r => { const i = r.querySelector('input') ; i.checked = i.value == v }) }
    }
    // Motifs : position du nom, au-dessus ou au-dessous du cadre (#304)
    const POSITIONS = ['above', 'below']
    const posOf = m => m.data.name_pos == 'below' ? 'below' : 'above'
    const previewPos = v => marks.forEach(m => m.spanContent.classList.toggle('below', v == 'below'))
    const posPicto = v => {
      const NS = 'http://www.w3.org/2000/svg'
      const svg = document.createElementNS(NS, 'svg')
      svg.setAttribute('viewBox', '0 0 16 16') ; svg.setAttribute('width', '16') ; svg.setAttribute('height', '16')
      svg.setAttribute('class', 'align-picto')
      const rect = (attrs) => { const r = document.createElementNS(NS, 'rect') ; Object.entries(attrs).forEach(([k, val]) => r.setAttribute(k, String(val))) ; svg.appendChild(r) }
      rect({x: 2, y: 5, width: 12, height: 6, fill: 'none', stroke: 'currentColor', 'stroke-width': '1.2'})
      rect({x: 5.5, y: v == 'above' ? 1 : 12.5, width: 5, height: 2.5, fill: 'currentColor'})
      return svg
    }
    const posRadios = withAlign && POSITIONS.map(v => {
      const input = DCreate('INPUT', {type: 'radio', name: 'mark-name-pos', value: v})
      input.checked = v == posOf(marks[0])
      listen(input, 'change', () => input.checked && previewPos(v))
      return DCreate('LABEL', {class: `align-choice pos-${v}`, inner: [input, posPicto(v), DCreate('SPAN', {text: t(`ui.panels.border.pos_${v}`)})]})
    })
    const pos = posRadios && {
        get value(){ const c = posRadios.map(r => r.querySelector('input')).find(i => i.checked) ; return c ? c.value : 'above' }
      , set value(v){ posRadios.forEach(r => { const i = r.querySelector('input') ; i.checked = i.value == v }) }
    }
    if ( align ) {
      this.restoreAlign = () => marks.forEach(m => {
        ALIGNS.forEach(a => m.spanContent.classList.toggle(a, a == m.data.align))
        m.spanContent.classList.toggle('below', m.data.name_pos == 'below')
      })
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
      if ( text ) { marks.forEach(m => m.previewTextSize(null)) ; text.value = marks[0].textSize }
      if ( align ) { align.value = 'center' ; previewAlign('center') }
      if ( pos ) { pos.value = 'above' ; previewPos('above') }
    })
    const btnCancel = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.renounce'), style: 'float:left;'})
    const btnOk     = DCreate('BUTTON', {class: 'btn-default', text: t('ui.buttons.ok')})
    listen(btnCancel, 'click', this.close.bind(this))
    listen(btnOk, 'click', () => {
      mark.confirmBorder()
      align && marks.forEach(m => { m.data.align = align.value ; setModified() })
      pos && marks.forEach(m => { pos.value == 'below' ? (m.data.name_pos = 'below') : delete m.data.name_pos ; setModified() })
      this.restoreAlign = null
      this.close()
    })
    const panel = DCreate('DIV', {id: 'border_editor', inner: [
        DCreate('DIV', {class: 'rows', inner: [
            editorField(T('width'), [...width.elements, DCreate('SPAN', {text: 'px'})])
          , editorField(t('ui.panels.border.intensity'), intensity.elements)
          , editorField(T('line'),  line)
          , ...(text ? [editorField(t('ui.panels.border.text'), [...text.elements, DCreate('SPAN', {text: 'px'})])] : [])
          , ...(radios ? [editorField(t('ui.panels.border.align'), radios)] : [])
          , ...(posRadios ? [editorField(t('ui.panels.border.position'), posRadios)] : [])
          , editorField('', [btnDefault, toPrefsButton(() => this.toPrefs())])
        ]})
      , DCreate('DIV', {class: 'buttons', inner: [btnCancel, btnOk]})
    ]})
    document.body.appendChild(panel)
    this.panel = panel
    addPanelHead(panel, {title: t(withText ? 'ui.panels.border.aspect' : 'ui.panels.border.title'), onClose: this.close.bind(this), target: marks.map(m => m.obj)})
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
    this.marks && this.marks.forEach(m => { m.cancelBorder() ; m.cancelTextSize() })
    this.restoreAlign && this.restoreAlign()
    this.restoreAlign = null
    this.panel && this.panel.remove()
    this.panel = null
    this.marks = null
  }
}

export const BorderEditor = new BorderEditorClass()
