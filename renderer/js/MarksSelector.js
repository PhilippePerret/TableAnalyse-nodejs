import { DCreate, listen } from './dom.js'
import { addPanelHead } from './Panneau.js'
import { AObjet } from './AObjet.js'
import { AMark } from './AMark.js'
import { t } from './i18n.js'
/**

  MarksSelector
  -------------
  Panneau de sélection des marques par type (menu « Sélection >
  Sélectionner des marques… »).

  Pour chaque type de marque présent dans l'analyse : une case à cocher
  et un filtre, soit une expression régulière sur le texte de la marque,
  soit (types aux valeurs fixes) un menu à choix multiple des valeurs.
  Le nombre de marques trouvées est actualisé à chaque réglage.

*/
// Types aux valeurs fixes : valeur = sous-type, libellés dans ui.marks.<liste>
const FIXED_VALUES = {not: 'notes', cad: 'cadences'}

class MarksSelectorClass {

  show(){
    this.close()
    const marks = AObjet.select(ao => ao instanceof AMark)
    const types = Object.keys(t('ui.marks.types')).filter(type => marks.some(m => m.type == type))
    this.rows = types.map(type => this.buildRow(type, marks.filter(m => m.type == type)))
    this.count = DCreate('DIV', {class: 'marks-count'})
    const btnCancel = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.cancel'), style: 'float:left;'})
    const btnSelect = DCreate('BUTTON', {class: 'btn-default', text: t('ui.panels.select_marks.select')})
    const panel = DCreate('DIV', {id: 'marks_selector', inner: [
        DCreate('DIV', {class: 'marks-rows', inner: this.rows.map(r => r.dom)})
      , this.count
      , DCreate('DIV', {class: 'buttons', inner: [btnCancel, btnSelect]})
    ]})
    document.body.appendChild(panel)
    this.panel = panel
    addPanelHead(panel, {title: t('ui.panels.select_marks.title'), onClose: this.close.bind(this)})
    listen(panel, 'click', (e) => e.stopPropagation())
    listen(panel, 'dblclick', (e) => e.stopPropagation())
    listen(btnCancel, 'click', this.close.bind(this))
    listen(btnSelect, 'click', this.select.bind(this))
    this.update()
  }

  close(){
    this.panel && this.panel.remove()
    this.panel = null
  }

  buildRow(type, marks){
    const row = {type, marks}
    const cb = DCreate('INPUT', {type: 'checkbox', id: `selmark-${type}`})
    const label = DCreate('LABEL', {for: cb.id, text: ` ${t(`ui.marks.types.${type}.name`).replace(/…$/, '')} (${marks.length})`})
    let filter
    if ( FIXED_VALUES[type] ) {
      // Menu à choix multiple des valeurs présentes (aucune choisie = toutes)
      const values = t(`ui.marks.${FIXED_VALUES[type]}`)
      const present = Object.keys(values).filter(v => marks.some(m => m.subtype == v))
      filter = DCreate('SELECT', {multiple: true, size: String(Math.min(present.length, 5)), inner: present.map(v => DCreate('OPTION', {value: v, text: values[v]}))})
      row.match = (m) => {
        const chosen = Array.from(filter.selectedOptions).map(o => o.value)
        return chosen.length == 0 || chosen.includes(m.subtype)
      }
    } else {
      // Expression régulière sur le texte (vide = toutes)
      filter = DCreate('INPUT', {type: 'text', placeholder: t('ui.panels.select_marks.regex_ph')})
      row.match = (m) => {
        if ( filter.value == '' ) return true
        if ( !row.regex ) return false
        return row.regex.test(String(m.content ?? ''))
      }
      listen(filter, 'input', () => {
        try { row.regex = new RegExp(filter.value) ; filter.classList.remove('invalid') }
        catch(err) { row.regex = null ; filter.classList.add('invalid') }
      })
    }
    // Régler un filtre coche le type
    listen(filter, 'input', () => { cb.checked = true ; this.update() })
    listen(filter, 'change', () => { cb.checked = true ; this.update() })
    listen(cb, 'change', this.update.bind(this))
    row.cb = cb
    row.dom = DCreate('DIV', {class: 'marks-row', inner: [DCreate('SPAN', {inner: [cb, label]}), filter]})
    return row
  }

  // Marques trouvées avec les réglages courants
  get found(){
    return this.rows.filter(r => r.cb.checked).flatMap(r => r.marks.filter(m => r.match(m)))
  }

  update(){
    const n = this.found.length
    this.count.textContent = t(`ui.panels.select_marks.${n > 1 ? 'count_many' : 'count_one'}`, {n})
  }

  select(){
    const found = this.found
    AObjet.deselectAll()
    found.forEach(m => AObjet.addToSelection(m))
    this.close()
  }
}

export const MarksSelector = new MarksSelectorClass()
