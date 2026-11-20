import { DCreate, listen } from './dom.js'
import { addPanelHead } from './Panneau.js'
import { t } from './i18n.js'
import { editorField } from './LiaisonEditor.js'
/**
 * BorderEditor
 * ------------
 * Boite « Bord/trait… » des marques à bord (cf. AMark#borderTarget),
 * réglages communs à toutes (valeurs de départ : celles de la première) : épaisseur (curseur) et type de trait (continu,
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
    const width = DCreate('INPUT', {type: 'range', min: '1', max: '20', step: '1', value: String(st.width)})
    const value = DCreate('SPAN', {text: `${st.width} px`})
    listen(line, 'change', () => mark.previewBorder({line: line.value}))
    listen(width, 'input', () => {
      value.textContent = `${width.value} px`
      mark.previewBorder({width: Number(width.value)})
    })
    const btnDefault = DCreate('BUTTON', {text: t('ui.panels.border.default')})
    listen(btnDefault, 'click', () => {
      mark.previewBorder({width: null, line: null})
      const cur = mark.border
      line.value  = cur.line
      width.value = String(cur.width)
      value.textContent = `${cur.width} px`
    })
    const btnCancel = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.renounce'), style: 'float:left;'})
    const btnOk     = DCreate('BUTTON', {class: 'btn-default', text: t('ui.buttons.ok')})
    listen(btnCancel, 'click', this.close.bind(this))
    listen(btnOk, 'click', () => { mark.confirmBorder() ; this.close() })
    const panel = DCreate('DIV', {id: 'border_editor', inner: [
        DCreate('DIV', {class: 'rows', inner: [
            editorField(T('width'), [width, value])
          , editorField(T('line'),  line)
          , editorField('', btnDefault)
        ]})
      , DCreate('DIV', {class: 'buttons', inner: [btnCancel, btnOk]})
    ]})
    document.body.appendChild(panel)
    this.panel = panel
    addPanelHead(panel, {title: t('ui.panels.border.title'), onClose: this.close.bind(this)})
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
