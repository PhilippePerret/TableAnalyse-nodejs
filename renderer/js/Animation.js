import { DCreate, listen } from './dom.js'
import { erreur } from './lib/Message.js'
import { addPanelHead } from './Panneau.js'
import { Preferences } from './Preferences.js'
import { Analyse } from './Analyse.js'
import { AObjet } from './AObjet.js'
import { AMark } from './AMark.js'
import { Systeme } from './Systeme.js'
import { t } from './i18n.js'
/**

  Animation
  ---------
  Animation de l'analyse (menu « Outils > Lancer l'animation ») : les
  marques sont masquées puis réaffichées une à une, dans l'ordre de la
  partition (système, puis de gauche à droite). Les numéros de mesure
  de la ligne des numéros restent affichés.

  Boite de contrôle : pause/reprise, pas à pas (marque suivante), arrêt
  (retour au début), vitesse (préférence vitesse_relecture) et fin
  définitive (toutes les marques réaffichées, boite fermée).

*/
class AnimationClass {

  start(){
    if ( !Analyse.current ) return erreur(t('errors.no_analyse_open'))
    this.finish()
    const order = (m) => { const sys = Systeme.getSystemeAssociated(m) ; return sys ? sys.index : 0 }
    this.marks = AObjet.items
      .filter(ao => ao instanceof AMark && ao.obj && !(ao.data && ao.data.line))
      .sort((a, b) => (order(a) - order(b)) || (a.left - b.left) || (a.top - b.top))
    if ( !this.marks.length ) return erreur(t('ui.panels.animation.no_marks'))
    AObjet.deselectAll()
    this.buildBox()
    this.rewind()
    this.play()
  }

  /* --- Contrôles --- */

  play(){
    if ( this.ended ) return
    this.stepMode = false
    this.playing = true
    this.schedule()
    this.updateBox()
  }

  pause(){
    this.playing = false
    clearTimeout(this.timer)
    this.updateBox()
  }

  togglePause(){ this.playing ? this.pause() : this.play() }

  // Pas à pas : l'animation s'arrête, chaque clic sur « Suivante »
  // affiche la marque suivante
  toggleStepMode(){
    this.pause()
    this.stepMode = !this.stepMode
    this.updateBox()
  }

  // Arrêt : retour au début (toutes les marques masquées)
  stop(){
    this.pause()
    this.rewind()
  }

  // Fin définitive : toutes les marques réaffichées, boite fermée
  finish(){
    clearTimeout(this.timer)
    this.playing = false
    this.marks && this.marks.forEach(m => m.obj && (m.obj.style.visibility = ''))
    this.marks = null
    this.box && this.box.remove()
    this.box = null
  }

  /* --- Fonctionnement --- */

  rewind(){
    this.index = 0
    this.ended = false
    this.marks.forEach(m => m.obj.style.visibility = 'hidden')
    this.updateBox()
  }

  // Délai entre deux marques : vitesse 1 → ~5 s, vitesse 100 → 20 ms
  get delay(){
    const speed = Math.min(100, Math.max(1, Number(Preferences.get('vitesse_relecture')) || 20))
    return Math.max(20, (100 - speed) * 50)
  }

  schedule(){
    clearTimeout(this.timer)
    this.timer = setTimeout(() => { this.next() ; this.playing && !this.ended && this.schedule() }, this.delay)
  }

  next(){
    const mark = this.marks && this.marks[this.index]
    if ( !mark ) return
    mark.obj.style.visibility = ''
    const r = mark.obj.getBoundingClientRect()
    if ( r.top < 40 || r.bottom > window.innerHeight - 20 ) mark.obj.scrollIntoView({block: 'center', behavior: 'smooth'})
    ++ this.index
    if ( this.index >= this.marks.length ) { this.ended = true ; this.playing = false }
    this.updateBox()
  }

  /* --- Boite de contrôle --- */

  buildBox(){
    const T = (k) => t(`ui.panels.animation.${k}`)
    this.btnPause = DCreate('BUTTON', {class: 'btn-pause'})
    this.btnStep  = DCreate('BUTTON', {class: 'btn-step', text: T('step')})
    this.btnNext  = DCreate('BUTTON', {class: 'btn-next', text: T('next')})
    this.btnStop  = DCreate('BUTTON', {class: 'btn-stop', text: T('stop')})
    const btnFinish = DCreate('BUTTON', {class: 'btn-default', text: T('finish')})
    this.speed = DCreate('INPUT', {type: 'range', min: '1', max: '100', value: String(Preferences.get('vitesse_relecture'))})
    this.counter = DCreate('SPAN', {class: 'anim-counter'})
    const box = DCreate('DIV', {id: 'animation_box', inner: [
        DCreate('DIV', {class: 'anim-row', inner: [this.btnPause, this.btnStep, this.btnNext, this.btnStop]})
      , DCreate('DIV', {class: 'anim-row', inner: [DCreate('LABEL', {text: T('speed')}), this.speed, this.counter]})
      , DCreate('DIV', {class: 'buttons', inner: [btnFinish]})
    ]})
    document.body.appendChild(box)
    this.box = box
    addPanelHead(box, {title: T('title'), onClose: this.finish.bind(this)})
    listen(box, 'click', (e) => e.stopPropagation())
    listen(box, 'dblclick', (e) => e.stopPropagation())
    listen(this.btnPause, 'click', this.togglePause.bind(this))
    listen(this.btnStep,  'click', this.toggleStepMode.bind(this))
    listen(this.btnNext,  'click', this.next.bind(this))
    listen(this.btnStop,  'click', this.stop.bind(this))
    listen(btnFinish,     'click', this.finish.bind(this))
    listen(this.speed, 'input', () => {
      Preferences.set('vitesse_relecture', Number(this.speed.value))
      Preferences.saveData('vitesse_relecture', this.speed.value)
      this.playing && this.schedule()
    })
  }

  updateBox(){
    if ( !this.box ) return
    const T = (k) => t(`ui.panels.animation.${k}`)
    this.btnPause.textContent = T(this.playing ? 'pause' : (this.index ? 'resume' : 'play'))
    this.btnPause.disabled = this.ended
    this.btnStep.classList.toggle('active', !!this.stepMode)
    this.btnNext.disabled = this.playing || this.ended
    this.counter.textContent = `${this.index} / ${this.marks.length}`
  }
}

export const Animation = new AnimationClass()
