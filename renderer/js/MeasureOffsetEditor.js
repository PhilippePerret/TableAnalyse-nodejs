import { DCreate, listen } from './dom.js'
import { addPanelHead } from './Panneau.js'
import { t } from './i18n.js'
import { editorField } from './LiaisonEditor.js'
import { RangeField } from './RangeField.js'
import { setModified } from './Current.js'
import { Systeme } from './Systeme.js'
/**
 * MeasureOffsetEditor
 * -------------------
 * « Distance avec la numérotation… » (menu contextuel d'un système, #292) :
 * distance (px) entre le système et sa ligne des numéros de mesure,
 * en partant de la distance actuelle. Aperçu immédiat, gardée par
 * « OK » (« Renoncer » : distance reprise). Une fois définie, elle est
 * fixe : les préférences n'y touchent plus.
 */
class MeasureOffsetEditorClass {

  open(sys){
    this.close()
    this.sys = sys
    this.initial = sys.data.measure_offset
    // Tout ce qui suit la ligne est décalé d'autant (#300)
    const setOffset = v => Systeme.changeMeasureOffsets(() => { sys.data.measure_offset = v })
    const preview = v => setOffset(v)
    const field = new RangeField({min: 0, max: 2000, value: sys.measureOffset, onInput: v => v >= 0 && preview(v)})
    this.field = field
    const btnCancel = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.renounce'), style: 'float:left;'})
    const btnOk     = DCreate('BUTTON', {class: 'btn-default', text: t('ui.buttons.ok')})
    listen(btnCancel, 'click', this.close.bind(this))
    listen(btnOk, 'click', () => {
      preview(field.value)
      this.sys = null
      setModified()
      this.close()
    })
    const panel = DCreate('DIV', {id: 'measure_offset_editor', inner: [
        DCreate('DIV', {class: 'rows', inner: [
            editorField(t('ui.panels.measure_offset.distance'), [...field.elements, DCreate('SPAN', {text: 'px'})])
        ]})
      , DCreate('DIV', {class: 'buttons', inner: [btnCancel, btnOk]})
    ]})
    document.body.appendChild(panel)
    this.panel = panel
    addPanelHead(panel, {title: t('ui.panels.measure_offset.title'), onClose: this.close.bind(this)})
  }

  // Fermeture sans OK : distance reprise
  close(){
    if ( this.sys ) {
      const sys = this.sys
      const initial = this.initial
      Systeme.changeMeasureOffsets(() => { null == initial ? delete sys.data.measure_offset : (sys.data.measure_offset = initial) })
    }
    this.sys = null
    this.panel && this.panel.remove()
    this.panel = null
  }
}

export const MeasureOffsetEditor = new MeasureOffsetEditorClass()
