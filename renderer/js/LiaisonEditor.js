import { DCreate, listen } from './dom.js'
import { invoke } from './api.js'
import { addPanelHead } from './Panneau.js'
import { erreur, message } from './lib/Message.js'
import { t } from './i18n.js'
import { gapOf } from './Liaison.js'
import { RangeField } from './RangeField.js'
/**
 * LiaisonEditor
 * -------------
 * Boite d'édition d'une liaison (cf. Liaison.js) : trait, épaisseur,
 * courbure, couleur, flèches de début et de fin, écart des flèches.
 * Chaque réglage est montré aussitôt, gardé seulement par « OK »
 * (« Renoncer » : la liaison reprend son état initial).
 * Types de liaison : styles nommés, enregistrés dans les préférences de
 * l'application (communs à toutes les analyses), appliqués par le menu
 * de la boite.
 */
const ARROW_TYPES = ['none', 'full', 'hollow', 'open']

// Ligne « libellé : champ(s) » des boites d'édition (aussi BorderEditor)
export const editorField = (label, input) => DCreate('DIV', {class: 'row', inner: [DCreate('LABEL', {text: label}), DCreate('DIV', {class: 'fields', inner: [input].flat()})]})

class LiaisonEditorClass {

  async open(liaison){
    this.close()
    this.liaison = liaison
    const T = (k) => t(`ui.panels.liaison.${k}`)
    const st = liaison.style
    const field = editorField
    const select = (key, values, labels) => {
      const sel = DCreate('SELECT', {inner: values.map(v => DCreate('OPTION', {value: v, text: labels[v]}))})
      sel.value = st[key]
      listen(sel, 'change', () => liaison.previewStyle({[key]: sel.value}))
      return sel
    }
    const arrows = t('ui.panels.liaison.arrows')
    this.fields = {
        line:  select('line', ['solid', 'dashed'], t('ui.panels.liaison.lines'))
      , width: new RangeField({min: 1, max: 20, value: st.width, onInput: v => liaison.previewStyle({width: v})})
      , curve: new RangeField({min: -100, max: 100, value: st.curve, onInput: v => liaison.previewStyle({curve: v})})
      , color: DCreate('INPUT', {type: 'color', value: st.color})
      , start: select('start', ARROW_TYPES, arrows)
      , end:   select('end', ARROW_TYPES, arrows)
      , gap:   new RangeField({min: 0, max: 30, value: gapOf(st), onInput: v => liaison.previewStyle({gap: v})})
    }
    const F = this.fields
    listen(F.color, 'input', () => liaison.previewStyle({color: F.color.value}))
    // Liaisons mémorisées (types de liaison)
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
    listen(btnSave, 'click', async () => {
      if ( await this.saveType(typeName.value.trim()) ) typeName.value = ''
      else { typeName.focus() ; typeName.select() }
    })
    const btnCancel = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.renounce'), style: 'float:left;'})
    const btnOk     = DCreate('BUTTON', {class: 'btn-default', text: t('ui.buttons.ok')})
    listen(btnCancel, 'click', this.close.bind(this))
    listen(btnOk, 'click', () => { liaison.confirmStyle() ; this.close() })
    const panel = DCreate('DIV', {id: 'liaison_editor', inner: [
        DCreate('DIV', {class: 'rows', inner: [field(T('type'), this.typesMenu)]})
      , DCreate('DIV', {class: 'rows', inner: [
            field(T('line'),  F.line)
          , field(T('width'), F.width.elements)
          , field(T('curve'), F.curve.elements)
          , field(T('color'), F.color)
          , field(T('start'), F.start)
          , field(T('end'),   F.end)
          , field(T('gap'),   F.gap.elements)
        ]})
      , DCreate('DIV', {class: 'rows', inner: [field(T('new_type'), [typeName, btnSave])]})
      , DCreate('DIV', {class: 'buttons', inner: [btnCancel, btnOk]})
    ]})
    document.body.appendChild(panel)
    this.panel = panel
    addPanelHead(panel, {title: T('title'), onClose: this.close.bind(this), target: liaison.obj && (liaison.obj.querySelector('path') || liaison.obj)})
  }

  // Fermeture sans OK (Renoncer, croix…) : la liaison reprend son style
  close(){
    this.liaison && this.liaison.cancelStyle()
    this.panel && this.panel.remove()
    this.panel = null
    this.liaison = null
  }

  // Style +style+ appliqué (aperçu) à la liaison et aux champs
  apply(style){
    this.liaison.previewStyle(style)
    const st = this.liaison.style, F = this.fields
    ;['line', 'width', 'color', 'start', 'end', 'curve'].forEach(k => F[k].value = String(st[k]))
    F.gap.value = String(gapOf(st))
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

  // Style courant mémorisé sous le nom +name+ (même nom : remplacement
  // après confirmation)
  // @return true s'il est mémorisé
  async saveType(name){
    if ( !name ) return erreur(t('errors.liaison_type_name')), false
    if ( this.types[name] && !await invoke('liaisons:confirmReplace', {name}) ) return false
    this.types[name] = this.liaison.style
    try {
      await invoke('liaisons:saveTypes', {types: this.types})
      message(t('messages.liaison_type_saved', {name}), {duration: 3000})
    } catch(err) { erreur(err.message || String(err)) }
    this.fillTypesMenu()
    return true
  }
}

export const LiaisonEditor = new LiaisonEditorClass()
