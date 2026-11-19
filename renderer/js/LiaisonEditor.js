import { DCreate, listen } from './dom.js'
import { invoke } from './api.js'
import { addPanelHead } from './Panneau.js'
import { erreur, message } from './lib/Message.js'
import { t } from './i18n.js'
/**
 * LiaisonEditor
 * -------------
 * Boite d'édition d'une liaison (cf. Liaison.js) : trait, épaisseur,
 * couleur, flèches de début et de fin, écart des flèches, courbure.
 * Chaque réglage s'applique aussitôt.
 * Types de liaison : styles nommés, enregistrés dans les préférences de
 * l'application (communs à toutes les analyses), appliqués par le menu
 * de la boite.
 */
const ARROW_TYPES = ['none', 'full', 'hollow', 'open']

class LiaisonEditorClass {

  async open(liaison){
    this.close()
    this.liaison = liaison
    const T = (k) => t(`ui.panels.liaison.${k}`)
    const st = liaison.style
    const field = (label, input) => DCreate('DIV', {class: 'row', inner: [DCreate('LABEL', {text: label}), DCreate('DIV', {class: 'fields', inner: [input].flat()})]})
    const select = (key, values, labels) => {
      const sel = DCreate('SELECT', {inner: values.map(v => DCreate('OPTION', {value: v, text: labels[v]}))})
      sel.value = st[key]
      listen(sel, 'change', () => liaison.setStyle({[key]: sel.value}))
      return sel
    }
    const arrows = t('ui.panels.liaison.arrows')
    this.fields = {
        line:  select('line', ['solid', 'dashed'], t('ui.panels.liaison.lines'))
      , width: DCreate('INPUT', {type: 'number', min: '1', max: '20', step: '1', value: String(st.width), style: 'width:4em;'})
      , color: DCreate('INPUT', {type: 'color', value: st.color})
      , start: select('start', ARROW_TYPES, arrows)
      , end:   select('end', ARROW_TYPES, arrows)
      , gap:   DCreate('INPUT', {type: 'checkbox', id: 'liaison_gap'})
      , curve: DCreate('INPUT', {type: 'range', min: '-100', max: '100', step: '1', value: String(st.curve)})
    }
    const F = this.fields
    F.gap.checked = !!st.gap
    listen(F.width, 'input', () => Number(F.width.value) > 0 && liaison.setStyle({width: Number(F.width.value)}))
    listen(F.color, 'input', () => liaison.setStyle({color: F.color.value}))
    listen(F.gap, 'change', () => liaison.setStyle({gap: F.gap.checked}))
    listen(F.curve, 'input', () => liaison.setStyle({curve: Number(F.curve.value)}))
    // Types de liaison
    this.types = await this.loadTypes()
    this.typesMenu = DCreate('SELECT')
    this.fillTypesMenu()
    listen(this.typesMenu, 'change', () => {
      const style = this.types[this.typesMenu.value]
      style && this.apply(style)
      this.typesMenu.value = ''
    })
    const typeName = DCreate('INPUT', {type: 'text', placeholder: T('type_name_ph'), style: 'width:12em;'})
    const btnSave  = DCreate('BUTTON', {text: T('save_type')})
    listen(btnSave, 'click', () => this.saveType(typeName.value.trim()) && (typeName.value = ''))
    const panel = DCreate('DIV', {id: 'liaison_editor', inner: [
        DCreate('DIV', {class: 'rows', inner: [
            field(T('type'),  this.typesMenu)
          , field(T('line'),  F.line)
          , field(T('width'), F.width)
          , field(T('color'), F.color)
          , field(T('start'), F.start)
          , field(T('end'),   F.end)
          , field('',         [F.gap, DCreate('LABEL', {for: 'liaison_gap', text: T('gap')})])
          , field(T('curve'), F.curve)
          , field(T('new_type'), [typeName, btnSave])
        ]})
      , DCreate('DIV', {class: 'buttons'})
    ]})
    document.body.appendChild(panel)
    this.panel = panel
    addPanelHead(panel, {title: T('title'), onClose: this.close.bind(this)})
  }

  close(){
    this.panel && this.panel.remove()
    this.panel = null
    this.liaison = null
  }

  // Style +style+ appliqué à la liaison et aux champs
  apply(style){
    this.liaison.setStyle(style)
    const st = this.liaison.style, F = this.fields
    ;['line', 'width', 'color', 'start', 'end', 'curve'].forEach(k => F[k].value = String(st[k]))
    F.gap.checked = !!st.gap
  }

  fillTypesMenu(){
    const names = Object.keys(this.types).sort((a, b) => a.localeCompare(b))
    this.typesMenu.innerHTML = ''
    this.typesMenu.appendChild(DCreate('OPTION', {value: '', text: t(`ui.panels.liaison.${names.length ? 'choose_type' : 'no_type'}`)}))
    names.forEach(n => this.typesMenu.appendChild(DCreate('OPTION', {value: n, text: n})))
    this.typesMenu.value = ''
  }

  async loadTypes(){
    try { return await invoke('liaisons:getTypes') || {} }
    catch(err) { console.error(err) ; return {} }
  }

  // Style courant enregistré sous le nom +name+ (remplace un type de
  // même nom)
  saveType(name){
    if ( !name ) return erreur(t('errors.liaison_type_name')), false
    this.types[name] = this.liaison.style
    invoke('liaisons:saveTypes', {types: this.types})
      .then(() => message(t('messages.liaison_type_saved', {name}), {duration: 3000}))
      .catch(err => erreur(err.message || String(err)))
    this.fillTypesMenu()
    return true
  }
}

export const LiaisonEditor = new LiaisonEditorClass()
