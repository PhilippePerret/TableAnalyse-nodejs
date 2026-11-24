/**
 * Vérifications de l'analyse (#237)
 * ---------------------------------
 * Pour le moment : accords qui se chevauchent (p.e. en passant de
 * l'écriture batave à l'écriture italienne, plus large). Seuls les
 * accords sont contrôlés, d'autres chevauchements étant voulus.
 *
 *  - les accords qui se chevauchent sont écrits en rouge (classe
 *    « chord-overlap », jamais exportée) ;
 *  - un « ! » rouge, à droite de la bande du haut, ouvre la liste des
 *    erreurs ; chaque erreur peut en être retirée à la main (elle n'est
 *    alors plus signalée, préférence cachée « checks_dismissed ») ;
 *  - contrôle relancé après chaque modification de l'analyse, changement
 *    de préférence d'affichage et au chargement (cf. schedule).
 */
import { DCreate, DGet, listen } from './dom.js'
import { AObjet } from './AObjet.js'
import { Forme } from './Forme.js'
import { Preferences } from './Preferences.js'
import { addPanelHead } from './Panneau.js'
import { setModified } from './Current.js'
import { t } from './i18n.js'

const CLASS_OVERLAP = 'chord-overlap'
const DELAY = 300
const TOLERANCE = 1 // px (écran) de recouvrement toléré

class VerificationsClass {

  constructor(){
    this.errors = []
  }

  // Contrôle différé (après la mise en page) ; regroupe les demandes
  schedule(){
    clearTimeout(this.timer)
    this.timer = setTimeout(() => document.fonts.ready.then(() => requestAnimationFrame(() => this.check())), DELAY)
  }

  // Erreurs retirées à la main (clés)
  get dismissed(){
    try { return new Set(JSON.parse(Preferences.get('checks_dismissed') || '[]')) }
    catch(err) { return new Set() }
  }
  dismiss(key){
    const set = this.dismissed
    set.add(key)
    Preferences.set('checks_dismissed', JSON.stringify([...set]))
    Preferences.saveData('checks_dismissed', JSON.stringify([...set]))
    setModified()
    this.check()
  }

  /**
   * Contrôle complet : erreurs, accords en rouge, marqueur
   * @return la liste des erreurs signalées
   */
  check(){
    clearTimeout(this.timer)
    const dismissed = this.dismissed
    const chords = AObjet.select(ao => ao.isMark && ao.type == 'acc' && ao.obj && ao.obj.isConnected && ao.obj.style.display != 'none')
    const rects = new Map(chords.map(m => [m, m.textRect]))
    const errors = []
    for ( let i = 0 ; i < chords.length ; ++i ) {
      for ( let j = i + 1 ; j < chords.length ; ++j ) {
        const a = chords[i], b = chords[j]
        if ( !this.overlap(rects.get(a), rects.get(b)) ) continue
        const [first, second] = a.left <= b.left ? [a, b] : [b, a]
        const key = `acc-overlap:${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`
        if ( dismissed.has(key) ) continue
        const num = Forme.measureOf(first)
        errors.push({key, marks: [first, second], message: t('ui.checks.chords_overlap', {a: first.content, b: second.content, num: null === num ? '?' : num})})
      }
    }
    this.errors = errors
    const bad = new Set(errors.flatMap(e => e.marks))
    AObjet.each(ao => ao.obj && ao.isMark && ao.obj.classList.toggle(CLASS_OVERLAP, bad.has(ao)))
    this.updateFlag()
    this.panel && this.buildList()
    return errors
  }

  overlap(r1, r2){
    if ( !r1 || !r2 || !r1.width || !r2.width ) return false
    return Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left) > TOLERANCE
        && Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top) > TOLERANCE
  }

  /* --- Marqueur (bande du haut) --- */

  get flag(){
    if ( !this._flag ) {
      this._flag = DCreate('DIV', {id: 'check-flag', class: 'hidden', text: '!', title: t('ui.checks.flag_title')})
      listen(this._flag, 'click', (e) => { e.stopPropagation() ; this.togglePanel() })
      const band = DGet('#titlebar')
      band && band.insertBefore(this._flag, DGet('#red-light'))
    }
    return this._flag
  }
  updateFlag(){
    this.flag.classList.toggle('hidden', this.errors.length == 0)
    this.flag.title = t('ui.checks.flag_title') + ` (${this.errors.length})`
    this.errors.length || this.closePanel()
  }

  /* --- Liste des erreurs --- */

  togglePanel(){ this.panel ? this.closePanel() : this.openPanel() }

  openPanel(){
    if ( this.panel || !this.errors.length ) return
    this.list = DCreate('UL', {class: 'checks-list'})
    const btnClose = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.close')})
    this.panel = DCreate('DIV', {id: 'checks-panel', inner: [this.list, DCreate('DIV', {class: 'buttons', inner: [btnClose]})]})
    document.body.appendChild(this.panel)
    addPanelHead(this.panel, {title: t('ui.checks.title'), onClose: this.closePanel.bind(this), target: this.flag})
    listen(btnClose, 'click', (e) => { e.stopPropagation() ; this.closePanel() })
    this.buildList()
  }

  buildList(){
    this.list.innerHTML = ''
    this.errors.forEach(err => {
      const msg = DCreate('SPAN', {class: 'check-message', text: err.message, title: t('ui.checks.goto')})
      const del = DCreate('SPAN', {class: 'check-dismiss', text: '×', title: t('ui.checks.dismiss')})
      listen(msg, 'click', () => this.show(err))
      listen(del, 'click', (e) => { e.stopPropagation() ; this.dismiss(err.key) })
      this.list.appendChild(DCreate('LI', {inner: [del, msg]}))
    })
  }

  // Les accords de l'erreur : amenés dans la fenêtre et sélectionnés
  show(err){
    const [a] = err.marks
    a.obj.scrollIntoView({block: 'center', inline: 'nearest'})
    AObjet.deselectAll()
    err.marks.forEach(m => AObjet.addToSelection(m))
  }

  closePanel(){
    this.panel && this.panel.remove()
    this.panel = null
  }
}

export const Verifications = new VerificationsClass()
