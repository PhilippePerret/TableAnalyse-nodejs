import { DCreate, listen } from './dom.js'
import { t } from './i18n.js'
/**
 * RangeField
 * ----------
 * Réglage d'une valeur numérique : curseur horizontal (réglage rapide)
 * et champ de la valeur précise, synchronisés. La valeur du champ peut
 * sortir des bornes du curseur (le curseur reste alors en butée).
 *
 *    const f = new RangeField({min, max, step, value, onInput})
 *    container.append(...f.elements)
 *    f.value = 12
 *
 * onInput(valeur) : à chaque changement (curseur ou champ).
 * toPrefs(valeur) : valeur réglée par une préférence, bouton discret
 * « → préfs » qui en fait la valeur de la préférence et l'applique.
 */
export class RangeField {

  constructor({min, max, step = 1, value, onInput, toPrefs}){
    this.range = DCreate('INPUT', {type: 'range', min: String(min), max: String(max), step: String(step), value: String(value)})
    this.field = DCreate('INPUT', {type: 'number', class: 'range-value', step: String(step), value: String(value)})
    listen(this.range, 'input', () => {
      this.field.value = this.range.value
      onInput && onInput(Number(this.range.value))
    })
    listen(this.field, 'input', () => {
      const v = Number(this.field.value)
      if ( '' === this.field.value || isNaN(v) ) return
      this.range.value = String(v)
      onInput && onInput(v)
    })
    if ( toPrefs ) {
      this.btnPrefs = DCreate('BUTTON', {class: 'to-prefs', text: t('ui.buttons.to_prefs'), title: t('ui.buttons.to_prefs_title')})
      listen(this.btnPrefs, 'click', (e) => { e.stopPropagation() ; this.btnPrefs.blur() ; toPrefs(this.value) })
    }
    // Entrée : la valeur est prise sans fermer la boite
    listen(this.field, 'keydown', (e) => e.key == 'Enter' && (e.preventDefault(), e.stopPropagation(), this.field.blur()))
  }

  get elements(){ return [this.range, this.field, this.btnPrefs].filter(Boolean) }

  get value(){ return Number(this.field.value) }
  set value(v){
    this.range.value = String(v)
    this.field.value = String(v)
  }
}
