import { DGet } from './dom.js'
import { px } from './handies.js'
import { invoke, onMain, IS_MIRROR } from './api.js'
import { erreur } from './lib/Message.js'
import { on } from './events.js'
import { Current } from './Current.js'
import { AObjet } from './AObjet.js'
import { AMark } from './AMark.js'
import { Systeme } from './Systeme.js'
import { History } from './History.js'
import { Variables } from './Variables.js'
import { setWindowTitle } from './Analyse.js'
/**
 * Split
 * -----
 * Fenêtre scindée (menus « Options > Scinder la fenêtre » et « Fenêtre >
 * Scinder la fenêtre », cf. main.js openSplit) : deux vues de la même
 * analyse, l'une au-dessus de l'autre, chacune avec son propre défilement.
 *
 * La vue du haut est la page de l'application ; celle du bas une seconde
 * page (IS_MIRROR) qui n'enregistre rien elle-même. Chaque modification
 * de l'une (cf. Analyse.setModified) est envoyée à l'autre sous forme de
 * changements depuis le dernier état commun (même forme que l'historique,
 * cf. History.snapshot/diff) : infos, marques, systèmes.
 */
// Délai (ms) après la dernière modification pour l'envoyer
const DELAY = 150

export class Split {

  static init(){
    this.on = IS_MIRROR
    document.documentElement.classList.toggle('mirror', IS_MIRROR)
    onMain('split:state', ({on}) => this.setState(on))
    IS_MIRROR && this.setState(true)
    // Vue active (qui reçoit les commandes des menus) : marquée
    onMain('split:focus', ({split, focused}) => {
      document.documentElement.classList.toggle('split-focused', split && focused)
      document.documentElement.classList.toggle('split-unfocused', split && !focused)
    })
    onMain('split:inset', ({inset, zoom}) => {
      document.documentElement.style.setProperty('--split-inset', px(inset / (zoom || 1)))
    })
    onMain('split:sync', this.receive.bind(this))
    // Vue du haut : la vue du bas, chargée, reçoit l'état actuel
    onMain('split:ready', () => this.sendState())
    on('systems:loaded', () => {
      this.state = History.snapshot()
      IS_MIRROR && invoke('split:ready').catch(err => console.error(err))
    })
  }

  // Fenêtre scindée (+on+) ou non : coche du menu « Options »
  static setState(on){
    this.on = on
    const option = DGet('#options_tool option[value="toggleSplit"]')
    option && (option.dataset.checked = on ? 'true' : 'false')
  }

  static toggle(){
    invoke('split:toggle').catch(err => erreur(err.message))
  }

  // Modification de l'analyse : envoyée un peu plus tard
  static schedule(){
    if ( !this.on || this.applying || !this.state ) return
    clearTimeout(this.timer)
    this.timer = setTimeout(this.send.bind(this), DELAY)
  }

  static send(){
    clearTimeout(this.timer)
    if ( !this.state ) return
    const current = History.snapshot()
    const diff = History.diff(this.state, current)
    if ( !diff ) return
    this.state = current
    invoke('split:sync', {diff}).catch(err => console.error(err))
  }

  // État complet (vue du bas qui vient de se charger)
  static sendState(){
    this.send()
    this.state && invoke('split:sync', {state: this.state}).catch(err => console.error(err))
  }

  /**
   * Changements reçus de l'autre vue (+diff+, ou +state+ complet) :
   * appliqués ici. La vue du haut marque l'analyse modifiée (à
   * enregistrer, étape de l'historique).
   */
  static receive({diff, state}){
    if ( !this.state || !Current.analyse ) return
    if ( state ) diff = History.diff(History.snapshot(), state)
    if ( !diff ) return
    clearTimeout(this.timer)
    this.applying = true
    try {
      this.applyInfos(diff.infos)
      this.applySystems(diff.systems)
      this.applyMarks(diff.marks)
    } catch(err) {
      console.error(err)
    } finally {
      this.applying = false
    }
    this.state = History.snapshot()
    IS_MIRROR || Current.analyse.setModified()
  }

  static applyInfos(infos){
    if ( !infos ) return
    const all = Current.analyse.infos
    Object.entries(infos).forEach(([k, v]) => null === v ? delete all[k] : (all[k] = v))
    setWindowTitle(all)
    Variables.refresh()
  }

  static applySystems(systems){
    if ( !systems ) return
    Object.entries(systems).forEach(([name, data]) => {
      const sys = data && Systeme.all.find(s => s.image_name == name)
      if ( !sys ) return
      undefined !== data.top  && sys.positionne(data.top, /* onlySystem = */ true)
      undefined !== data.left && data.left != sys.left && (sys.left = data.left)
      sys.data.measures_end = data.measures_end
    })
  }

  // Marques modifiées ou supprimées retirées, nouvelles versions
  // construites
  static applyMarks(marks){
    if ( !marks ) return
    const analyse = Current.analyse
    Object.entries(marks).forEach(([id, data]) => {
      const old = AObjet.get(id)
      old && this.removeMark(old)
      if ( !data ) return
      const mark = AMark.instanciate(analyse, data)
      mark.build_and_observe()
      analyse._lastId = Math.max(analyse._lastId || 0, Number(id))
    })
    Variables.refresh()
  }

  static removeMark(ao){
    ao.isSelected && AObjet.removeFromSelection(ao)
    AObjet.items = AObjet.items.filter(o => o !== ao)
    delete AObjet.table[ao.id]
    Systeme.all.forEach(sys => sys._objets && (sys._objets = sys._objets.filter(o => o !== ao)))
    ao.obj && ao.obj.remove()
    ao.destroyed = true
  }
}
