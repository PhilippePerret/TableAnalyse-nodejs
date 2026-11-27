/**
 * HeldLetter
 * ----------
 * Lettre tenue enfoncée pendant un clic sur la table : création, par
 * SIMPLE clic quelle que soit la préférence de création, d'une marque
 * du type dont cette lettre est le raccourci (liste des types). Maj,
 * lue au clic, distingue « p » de « P ». Lettre sans type : création
 * avec la liste des types (sans le type bloqué).
 *
 * Une fois le clic fait, la lettre (répétitions comprises) ne va plus
 * nulle part jusqu'à son relâchement : elle ne choisit rien dans les
 * listes et ne s'écrit pas dans le champ de l'éditeur ouvert par le
 * clic.
 *
 * Lettre ignorée : avec ⌘, Ctrl ou Option, ou pendant une saisie dans
 * un champ. Tout est oublié quand la fenêtre perd le focus.
 */
import { listen } from './dom.js'
import { inTextField } from './KeyboardEvents.js'
import { AMARQUES_TYPES } from './Constants.js'

const LETTER = /^\p{L}$/u

export const HeldLetter = {

  letter:   null,       // lettre tenue (minuscule), pas encore utilisée
  consumed: new Set(),  // lettres utilisées par un clic, encore tenues

  get active(){ return !!this.letter || this.consumed.size > 0 },

  /**
   * Clic de création : la lettre tenue (avec la casse donnée par Maj),
   * désormais utilisée, ou null
   */
  take(e){
    if ( !this.letter ) return null
    const letter = this.letter
    this.letter = null
    this.consumed.add(letter)
    return e.shiftKey ? letter.toUpperCase() : letter
  },

  // Type de marque dont +char+ est le raccourci (ou null)
  typeOf(char){
    const type = Object.values(AMARQUES_TYPES).find(d => d.shortcut === char)
    return type ? type.value : null
  },

  onKeyDown(e){
    const k = typeof e.key == 'string' ? e.key.toLowerCase() : ''
    if ( this.consumed.has(k) ) return this.swallow(e)
    if ( e.metaKey || e.ctrlKey || e.altKey || inTextField(e) ) return
    if ( LETTER.test(e.key) ) this.letter = k
  },

  onKeyPress(e){
    const k = typeof e.key == 'string' ? e.key.toLowerCase() : ''
    if ( this.consumed.has(k) ) return this.swallow(e)
  },

  onKeyUp(e){
    const k = typeof e.key == 'string' ? e.key.toLowerCase() : ''
    if ( this.letter === k ) this.letter = null
    if ( this.consumed.delete(k) ) return this.swallow(e)
  },

  reset(){
    this.letter = null
    this.consumed.clear()
  },

  swallow(e){
    e.preventDefault()
    e.stopImmediatePropagation()
    return false
  },

  observe(){
    // (phase de capture sur window : avant tout autre gestionnaire)
    window.addEventListener('keydown',  this.onKeyDown.bind(this),  true)
    window.addEventListener('keypress', this.onKeyPress.bind(this), true)
    window.addEventListener('keyup',    this.onKeyUp.bind(this),    true)
    listen(window, 'blur', this.reset.bind(this))
  },
}
