import { DCreate, DGet, listen } from './dom.js'
import { onRelease } from './KeyRelease.js'
import { px } from './handies.js'
import { invoke, onMain, IS_MIRROR } from './api.js'
import { erreur } from './lib/Message.js'
import { on } from './events.js'
import { t } from './i18n.js'
import { Systeme } from './Systeme.js'
import { Editeur } from './Editeur.js'
import { Forme } from './Forme.js'
import { keepPanelsInView } from './Panneau.js'
import { isSplitShortcut, splitAccelerator } from './KeyboardEvents.js'
/**
 * Split
 * -----
 * Fenêtre scindée (menus « Options > Scinder la fenêtre » et « Fenêtre >
 * Scinder la fenêtre », cf. main.js openSplit) : en haut, une vue de
 * visualisation de l'analyse ENREGISTRÉE ; en bas, la page de
 * l'application (vue d'édition). Chacune a son propre défilement.
 *
 * La vue de visualisation (IS_MIRROR) n'enregistre rien et n'accepte
 * aucune action (voile, touches arrêtées), sauf le défilement et son
 * bouton « Actualiser », qui la recharge en gardant sa position. Aucune
 * synchronisation entre les deux vues.
 */
// Mesures affichées avant la première mesure visible de la vue
// d'édition (numéro proposé à l'ouverture)
const MEASURES_BEFORE = 6
// Clé (sessionStorage) de la position gardée au rechargement
const SCROLL_KEY = 'split-scroll'
// Touches de défilement laissées à la vue de visualisation
const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' ']

export class Split {

  static init(){
    this.on = IS_MIRROR
    document.documentElement.classList.toggle('mirror', IS_MIRROR)
    if ( IS_MIRROR ) return this.initViewer()
    onMain('split:state', ({on}) => this.setState(on))
    // Place cachée en haut par la vue de visualisation et la barre
    onMain('split:inset', ({inset, zoom}) => {
      document.documentElement.style.setProperty('--split-inset', px(inset / (zoom || 1)))
      keepPanelsInView()
    })
    this.sendTitlebarHeight()
    window.addEventListener('resize', this.sendTitlebarHeight.bind(this))
    this.setAccelerator()
  }

  // Raccourci affiché « ⌘/ » dans les menus « Options » et « Fenêtre »
  // (#252, cf. splitAcceleratorFor)
  static async setAccelerator(){
    const accelerator = await splitAccelerator()
    const option = DGet('#options_tool option[value="toggleSplit"]')
    option && (option.dataset.accelerator = accelerator)
    invoke('menu:splitAccelerator', {accelerator}).catch(err => console.error(err))
  }

  // Hauteur de la bande supérieure (place de la vue de visualisation,
  // cf. main.js layoutSplit)
  static sendTitlebarHeight(){
    const band = DGet('#titlebar')
    const height = band && band.getBoundingClientRect().bottom
    height && height != this.titlebarHeight && invoke('split:titlebar', {height}).catch(err => console.error(err))
    this.titlebarHeight = height
  }

  // Fenêtre scindée (+on+) ou non : coche du menu « Options »
  static setState(on){
    this.on = on
    const option = DGet('#options_tool option[value="toggleSplit"]')
    option && (option.dataset.checked = on ? 'true' : 'false')
  }

  /**
   * Fermeture, ou ouverture après demande du numéro de la mesure à
   * afficher en haut (sans numéros de mesure : début de la partition)
   */
  static toggle(){
    if ( this.on ) return this.open()
    const mesures = Forme.measureMarks
    if ( !mesures.length ) return this.open()
    const last = Math.max(...mesures.map(m => m.number))
    this.editor = this.editor || new Editeur({data: {}}, {setMethod: this.onMeasure.bind(this)})
    this.editor.value = String(this.defaultMeasure(mesures))
    this.editor.show({top: 120, left: Math.round(window.innerWidth / 2) - 100, fixed: true}, t('messages.split_measure_prompt', {last}))
  }
  static onMeasure(value){
    if ( null == value || String(value).trim() == '' ) return
    const num = Number(String(value).trim())
    if ( isNaN(num) ) return
    this.open(num)
  }
  static open(measure){
    invoke('split:toggle', {measure}).catch(err => erreur(err.message))
  }

  /**
   * Numéro proposé : MEASURES_BEFORE mesures avant la première mesure
   * visible de la vue d'édition (ou la première mesure)
   */
  static defaultMeasure(mesures){
    const first = Math.min(...mesures.map(m => m.number))
    const band = DGet('#titlebar')
    const top = band ? band.getBoundingClientRect().bottom : 0
    const systems = [...(Systeme.all || [])].filter(sys => sys.obj).sort((a, b) => a.top - b.top)
    for ( const sys of systems ) {
      if ( sys.obj.getBoundingClientRect().bottom <= top ) continue
      const nums = Forme.measureMarksOf(sys).map(m => Number(String(m.content).trim())).filter(n => !isNaN(n))
      if ( nums.length ) return Math.max(first, Math.min(...nums) - MEASURES_BEFORE)
    }
    return first
  }

  /* --- Vue de visualisation --- */

  static initViewer(){
    // Voile : aucun clic n'atteint l'analyse (le défilement passe)
    document.body.appendChild(DCreate('DIV', {id: 'split-veil'}))
    const button = DCreate('BUTTON', {id: 'split-refresh', inner: [
        DCreate('SPAN', {class: 'picto', text: '↻'})
      , DCreate('SPAN', {text: t('ui.buttons.refresh')})
    ]})
    button.title = t('ui.buttons.refresh_view')
    listen(button, 'click', this.refresh.bind(this))
    document.body.appendChild(button)
    // Souris et clavier arrêtés avant tout autre gestionnaire (touches
    // de défilement : défilement seul)
    ;['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu'].forEach(type => {
      window.addEventListener(type, (e) => {
        if ( e.target instanceof Element && e.target.closest('#split-refresh') ) return
        e.stopImmediatePropagation()
        type == 'contextmenu' && e.preventDefault()
      }, true)
    })
    ;['keydown', 'keypress', 'keyup'].forEach(type => {
      window.addEventListener(type, (e) => {
        e.stopImmediatePropagation()
        // Raccourci de la fenêtre scindée : fermeture
        if ( type == 'keydown' && isSplitShortcut(e) ) return onRelease(e, () => this.open())
        SCROLL_KEYS.includes(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey || e.preventDefault()
      }, true)
    })
    // Menu « Fenêtre > Actualiser la visualisation »
    onMain('split:refresh', this.refresh.bind(this))
    on('systems:loaded', () => requestAnimationFrame(this.placeViewer.bind(this)))
  }

  // Position gardée au rechargement, sinon mesure demandée à l'ouverture
  static placeViewer(){
    let pos = null
    try {
      pos = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || 'null')
      sessionStorage.removeItem(SCROLL_KEY)
    } catch(err) { pos = null }
    if ( pos ) return window.scrollTo(pos.x, pos.y)
    const measure = Number(new URLSearchParams(location.search).get('measure'))
    measure && Forme.gotoMeasureNumber(measure, /* afterGap = */ true)
  }

  // « Actualiser » : rechargement de l'analyse enregistrée, à la même
  // position
  static refresh(){
    try {
      sessionStorage.setItem(SCROLL_KEY, JSON.stringify({x: window.scrollX, y: window.scrollY}))
    } catch(err) { /* position perdue */ }
    location.reload()
  }
}
