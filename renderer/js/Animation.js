import { DCreate, listen } from './dom.js'
import { px } from './handies.js'
import { erreur } from './lib/Message.js'
import { addPanelHead } from './Panneau.js'
import { Preferences } from './Preferences.js'
import { Analyse } from './Analyse.js'
import { AObjet } from './AObjet.js'
import { AMark } from './AMark.js'
import { Systeme } from './Systeme.js'
import { UI } from './UI.js'
import { t } from './i18n.js'
/**

  Animation
  ---------
  Animation de l'analyse (menu « Outils > Lancer l'animation »), comme
  si on jouait la partition : un curseur (ligne verticale) parcourt
  chaque système de gauche à droite, à vitesse constante, et les marques
  apparaissent quand il les atteint. Les numéros de mesure de la ligne
  des numéros restent affichés.

  Le curseur va de la démarcation au-dessus du système (ou du haut de la
  table) à la démarcation au-dessous, placée là où est (ou serait) la
  ligne des numéros de mesure.

  Durée d'un système : nombre de mesures × temps par mesure × durée
  d'un temps (tempo, préférence animation_tempo). Métrique 4/4 (non
  définie dans l'analyse) ; 4 mesures pour un système sans numéros.

  Pendant l'animation, la table ne peut pas être défilée (elle suit le
  curseur). Boite de contrôle au centre, en bas, masquée tant que la
  souris n'approche pas du bas de la fenêtre. L'animation n'est lancée
  que par l'utilisateur (▶). Pas à pas : ← marque précédente, → marque
  suivante (les « pas » sont les marques dans l'ordre d'apparition).
  ■ : retour au début. « Quitter l'animation » : tout réaffiché.

*/
const BEATS_PER_MEASURE = 4       // métrique par défaut (4/4)
const DEFAULT_MEASURES  = 4       // système sans numéros de mesure
const BOTTOM_ZONE       = 90      // hauteur (px) du bas de la fenêtre qui fait apparaitre la boite
const HIDE_DELAY        = 1200    // ms avant de masquer la boite

class AnimationClass {

  start(){
    if ( !Analyse.current ) return erreur(t('errors.no_analyse_open'))
    this.finish()
    this.systems = Systeme.all.slice()
    const marks = AObjet.items.filter(ao => ao instanceof AMark && ao.obj && !(ao.data && ao.data.line))
    if ( !marks.length || !this.systems.length ) return erreur(t('ui.panels.animation.no_marks'))
    // Marques de chaque système, dans l'ordre horizontal
    this.marksBySys = this.systems.map(() => [])
    this.marks = marks
    marks.forEach(m => {
      const sys = Systeme.getSystemeAssociated(m) || this.systems[0]
      this.marksBySys[this.systems.indexOf(sys)].push(m)
    })
    this.marksBySys.forEach(list => list.sort((a, b) => a.left - b.left))
    // Les « pas » : les marques dans l'ordre de leur apparition
    this.sequence = this.marksBySys.flatMap((list, isys) => list.map(mark => ({mark, isys})))
    AObjet.deselectAll()
    this.lockScroll()
    this.buildCursor()
    this.buildBox()
    this.rewind()
  }

  /* --- Contrôles --- */

  play(){
    if ( this.ended ) return
    this.stepMode = false
    this.playing = true
    this.lastFrame = null
    cancelAnimationFrame(this.raf)
    this.raf = requestAnimationFrame(this.frame.bind(this))
    this.updateBox()
  }

  pause(){
    this.playing = false
    cancelAnimationFrame(this.raf)
    this.updateBox()
  }

  togglePause(){ this.playing ? this.pause() : this.play() }

  // Pas à pas : l'animation s'arrête, chaque clic sur « Suivante » mène
  // le curseur à la marque suivante (et l'affiche)
  toggleStepMode(){
    this.pause()
    this.stepMode = !this.stepMode
    this.updateBox()
  }

  // Pas suivant : marque suivante affichée, curseur sur elle
  next(){
    const step = this.sequence.find(st => st.mark.obj.style.visibility == 'hidden')
    if ( !step ) return this.end()
    step.mark.obj.style.visibility = ''
    this.moveCursorTo(step)
  }

  // Pas précédent : dernière marque affichée masquée, curseur sur la
  // marque d'avant (ou au début)
  previous(){
    const shown = this.sequence.filter(st => st.mark.obj.style.visibility != 'hidden')
    const last = shown.pop()
    if ( !last ) return
    last.mark.obj.style.visibility = 'hidden'
    this.ended = false
    const before = shown.pop()
    if ( before ) this.moveCursorTo(before)
    else { this.isys = 0 ; this.progress = 0 ; this.followSystem() ; this.placeCursor() }
  }

  moveCursorTo({mark, isys}){
    if ( isys != this.isys ) { this.isys = isys ; this.followSystem() }
    this.progress = Math.min(1, Math.max(0, (mark.left - this.sysLeft) / this.sysWidth))
    this.placeCursor()
  }

  // Arrêt : retour au début (toutes les marques masquées)
  stop(){
    this.pause()
    this.rewind()
  }

  // Fin définitive : toutes les marques réaffichées, boite et curseur
  // retirés, défilement rétabli
  finish(){
    cancelAnimationFrame(this.raf)
    clearTimeout(this.hideTimer)
    this.playing = false
    this.marks && this.marks.forEach(m => m.obj && (m.obj.style.visibility = ''))
    this.marks = null
    this.cursor && this.cursor.remove()
    this.cursor = null
    this.box && this.box.remove()
    this.box = null
    this.unlockScroll()
  }

  /* --- Fonctionnement --- */

  rewind(){
    this.ended = false
    this.isys = 0
    this.progress = 0
    // Marques masquées AVANT le retour en haut de la table
    this.marks.forEach(m => m.obj.style.visibility = 'hidden')
    window.scrollTo({top: 0, behavior: 'instant'})
    this.followSystem()
    this.update()
  }

  get tempo(){
    return Math.min(240, Math.max(20, Number(Preferences.get('animation_tempo')) || 60))
  }

  // Durée (ms) du système courant
  get sysDuration(){
    const sys = this.systems[this.isys]
    const measures = Systeme.measureMarksOf(sys).length || DEFAULT_MEASURES
    return measures * BEATS_PER_MEASURE * 60000 / this.tempo
  }

  get sysLeft(){ return this.systems[this.isys].left }
  get sysWidth(){ return this.systems[this.isys].obj.offsetWidth || 1 }

  frame(now){
    if ( !this.playing ) return
    if ( this.lastFrame !== null ) {
      this.progress += (now - this.lastFrame) / this.sysDuration
      if ( this.progress >= 1 ) {
        this.update() // marques du bout du système
        if ( this.isys + 1 >= this.systems.length ) return this.end()
        ++ this.isys
        this.progress = 0
        this.followSystem()
      }
    }
    this.lastFrame = now
    this.update()
    this.raf = requestAnimationFrame(this.frame.bind(this))
  }

  end(){
    this.progress = 1
    this.update()
    this.marks.forEach(m => m.obj.style.visibility = '')
    this.ended = true
    this.playing = false
    cancelAnimationFrame(this.raf)
    this.updateBox()
  }

  // Curseur placé et marques atteintes affichées
  update(){
    const x = this.placeCursor()
    this.marksBySys[this.isys].forEach(m => { if ( m.left <= x ) m.obj.style.visibility = '' })
    this.updateBox()
  }

  placeCursor(){
    const x = this.sysLeft + this.progress * this.sysWidth
    this.cursor.style.left = px(Math.round(x))
    this.updateBox()
    return x
  }

  /**
   * Démarcations au-dessus et au-dessous du système +i+ : ligne des
   * numéros de mesure (ou sa place) ; haut de la table pour le premier
   */
  demarcation(i){
    const sys = this.systems[i]
    return sys.top + sys.obj.offsetHeight + Systeme.measureLineOffset
  }

  // Curseur sur la bande du système courant, table défilée pour la montrer
  followSystem(){
    const top    = this.isys == 0 ? 0 : this.demarcation(this.isys - 1)
    const bottom = this.demarcation(this.isys)
    Object.assign(this.cursor.style, {top: px(top), height: px(bottom - top)})
    const r = this.cursor.getBoundingClientRect()
    const y = window.scrollY + r.top + r.height / 2 - window.innerHeight / 2
    window.scrollTo({top: Math.max(0, this.isys == 0 ? 0 : y), behavior: 'smooth'})
  }

  buildCursor(){
    this.cursor = DCreate('DIV', {id: 'animation_cursor'})
    UI.TableAnalyse.appendChild(this.cursor)
  }

  /* --- Table non défilable pendant l'animation --- */

  lockScroll(){
    this.scrollLocked = true
    document.documentElement.classList.add('animation-running')
    this.blockScroll || (this.blockScroll = (e) => {
      if ( !this.scrollLocked ) return
      if ( e.type == 'keydown' && !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key) ) return
      if ( e.type == 'keydown' && ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) ) return
      e.preventDefault()
    })
    window.addEventListener('wheel', this.blockScroll, {passive: false})
    window.addEventListener('touchmove', this.blockScroll, {passive: false})
    window.addEventListener('keydown', this.blockScroll, {passive: false})
  }

  unlockScroll(){
    if ( !this.scrollLocked ) return
    this.scrollLocked = false
    document.documentElement.classList.remove('animation-running')
    window.removeEventListener('wheel', this.blockScroll)
    window.removeEventListener('touchmove', this.blockScroll)
    window.removeEventListener('keydown', this.blockScroll)
    document.removeEventListener('mousemove', this.onMouseMove)
  }

  /* --- Boite de contrôle --- */

  buildBox(){
    const T = (k) => t(`ui.panels.animation.${k}`)
    // Boutons de taille fixe (cf. main.css) : pictos qui changent sans
    // que rien ne bouge
    this.btnStep  = DCreate('BUTTON', {class: 'anim-btn btn-step', text: T('step'), title: T('step_desc')})
    this.btnPlay  = DCreate('BUTTON', {class: 'anim-btn anim-icon btn-play'})
    this.btnNext  = DCreate('BUTTON', {class: 'anim-btn anim-icon btn-next', text: '→', title: T('next')})
    this.btnStop  = DCreate('BUTTON', {class: 'anim-btn anim-icon btn-stop', text: '■', title: T('stop')})
    const btnFinish = DCreate('BUTTON', {class: 'btn-default btn-close', text: T('finish')}) // seul bouton de fermeture
    this.tempoField = DCreate('INPUT', {type: 'range', min: '20', max: '240', value: String(this.tempo)})
    this.tempoValue = DCreate('SPAN', {class: 'anim-tempo'})
    const meter = DCreate('SPAN', {class: 'anim-meter', text: T('meter'), title: T('meter_desc')})
    const box = DCreate('DIV', {id: 'animation_box', inner: [
        DCreate('DIV', {class: 'anim-row', inner: [this.btnStep, this.btnPlay, this.btnNext, this.btnStop]})
      , DCreate('DIV', {class: 'anim-row', inner: [DCreate('LABEL', {text: T('tempo')}), this.tempoField, this.tempoValue, meter]})
      , DCreate('DIV', {class: 'buttons', inner: [btnFinish]})
    ]})
    document.body.appendChild(box)
    this.box = box
    addPanelHead(box, {title: T('title'), onClose: this.finish.bind(this)})
    listen(box, 'click', (e) => e.stopPropagation())
    listen(box, 'dblclick', (e) => e.stopPropagation())
    // Lecture/pause ; en pas à pas : pas précédent
    listen(this.btnPlay,  'click', () => this.stepMode ? this.previous() : this.togglePause())
    listen(this.btnStep,  'click', this.toggleStepMode.bind(this))
    listen(this.btnNext,  'click', this.next.bind(this))
    listen(this.btnStop,  'click', this.stop.bind(this))
    listen(btnFinish,     'click', this.finish.bind(this))
    listen(this.tempoField, 'input', () => {
      Preferences.set('animation_tempo', Number(this.tempoField.value))
      Preferences.saveData('animation_tempo', this.tempoField.value)
      this.updateBox()
    })
    // Boite masquée, montrée quand la souris approche du bas de la fenêtre
    this.onMouseMove = this.onMouseMove || ((e) => {
      if ( !this.box ) return
      if ( e.clientY >= window.innerHeight - BOTTOM_ZONE || this.box.contains(e.target) ) this.showBox()
      else this.hideBoxSoon()
    })
    document.addEventListener('mousemove', this.onMouseMove)
    this.showBox()
    this.hideBoxSoon()
  }

  showBox(){
    clearTimeout(this.hideTimer)
    this.box.classList.remove('anim-hidden')
  }

  hideBoxSoon(){
    clearTimeout(this.hideTimer)
    this.hideTimer = setTimeout(() => this.box && this.box.classList.add('anim-hidden'), HIDE_DELAY)
  }

  updateBox(){
    if ( !this.box ) return
    const T = (k, v) => t(`ui.panels.animation.${k}`, v)
    const shown = this.sequence.some(st => st.mark.obj.style.visibility != 'hidden')
    this.btnStep.classList.toggle('active', !!this.stepMode)
    if ( this.stepMode ) {
      Object.assign(this.btnPlay, {textContent: '←', title: T('previous'), disabled: !shown})
    } else {
      Object.assign(this.btnPlay, {textContent: this.playing ? '❚❚' : '▶', title: T(this.playing ? 'pause' : 'play'), disabled: this.ended})
    }
    this.btnNext.disabled = !this.stepMode || this.ended
    this.tempoValue.textContent = T('tempo_value', {tempo: this.tempo})
  }
}

export const Animation = new AnimationClass()
