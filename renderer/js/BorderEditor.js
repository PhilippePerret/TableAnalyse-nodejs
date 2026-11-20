import { DCreate, listen } from './dom.js'
import { addPanelHead } from './Panneau.js'
import { t } from './i18n.js'
import { editorField } from './LiaisonEditor.js'
/**
 * BorderEditor
 * ------------
 * Boite « Épaisseur des bords… » d'une marque à bord (cf.
 * AMark#borderTarget) : épaisseur (curseur) et type de trait (continu,
 * pointillé). Chaque réglage est montré aussitôt, gardé seulement par
 * « OK » (« Renoncer » : la marque reprend ses bords), comme pour une
 * liaison (cf. LiaisonEditor.js).
 */
class BorderEditorClass {

  open(mark){
    this.close()
    this.mark = mark
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
    const btnCancel = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.renounce'), style: 'float:left;'})
    const btnOk     = DCreate('BUTTON', {class: 'btn-default', text: t('ui.buttons.ok')})
    listen(btnCancel, 'click', this.close.bind(this))
    listen(btnOk, 'click', () => { mark.confirmBorder() ; this.close() })
    const panel = DCreate('DIV', {id: 'border_editor', inner: [
        DCreate('DIV', {class: 'rows', inner: [
            editorField(T('width'), [width, value])
          , editorField(T('line'),  line)
        ]})
      , DCreate('DIV', {class: 'buttons', inner: [btnCancel, btnOk]})
    ]})
    document.body.appendChild(panel)
    this.panel = panel
    addPanelHead(panel, {title: t('ui.panels.border.title'), onClose: this.close.bind(this)})
  }

  // Fermeture sans OK (Renoncer, croix…) : la marque reprend ses bords
  close(){
    this.mark && this.mark.cancelBorder()
    this.panel && this.panel.remove()
    this.panel = null
    this.mark = null
  }
}

export const BorderEditor = new BorderEditorClass()
