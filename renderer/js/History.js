import { DCreate, listen } from './dom.js'
import { invoke, IS_MIRROR } from './api.js'
import { erreur } from './lib/Message.js'
import { AObjet } from './AObjet.js'
import { Current } from './Current.js'
import { Systeme } from './Systeme.js'
import { addPanelHead } from './Panneau.js'
import { AMARQUES_TYPES } from './Constants.js'
import { on } from './events.js'
import { t } from './i18n.js'
/**
 * History
 * -------
 * Historique de la construction de l'analyse, conservé dans son
 * dossier (history.jsonl, cf. main/Analyse.js) : infos, marques
 * (créations, modifications, suppressions) et systèmes (positions).
 * Ni les préférences, ni les options, ni les sélections, ni les
 * verrouillages.
 *
 * Étapes : {time, kind, state} (état initial) ou {time, kind, diff}
 * (changements depuis l'étape précédente). kind : 'initial', 'change',
 * 'outside' (changements faits hors de l'application ou non
 * enregistrés), 'restore' (retour à une étape, +to+ : son index).
 *
 * Menu « Fichier > Historique de l'analyse… » : liste des étapes ; un
 * clic ramène l'analyse à l'état de cette étape (nouvelle étape, donc
 * rien n'est perdu).
 */

// Infos de l'analyse qui font partie de sa construction
const INFOS_KEYS = ['piece_title', 'composer', 'analyse_title', 'analyst', 'form']
// Données des marques qui n'en changent pas l'aspect
const MARK_IGNORED = ['locked']
// Délai (ms) après la dernière modification pour mémoriser l'étape
const DELAY = 800

const clone = o => JSON.parse(JSON.stringify(o))
const same  = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export class History {

  /**
   * Chargement de l'historique de l'analyse courante, une fois ses
   * systèmes chargés (positions corrigées, numéros de mesure placés)
   */
  static async init(){
    this.ready = false
    this.steps = []
    // Vue du bas de la fenêtre scindée : historique tenu par celle du haut
    if ( IS_MIRROR ) return
    const analyse = Current.analyse
    await new Promise(ok => {
      on('systems:loaded', ok)
      setTimeout(ok, 4000)
    })
    if ( Current.analyse !== analyse ) return
    try {
      this.steps = await invoke('history:load')
      const current = this.snapshot()
      if ( this.steps.length == 0 ) {
        await this.append({kind: 'initial', state: current})
      } else {
        const diff = this.diff(this.stateAt(this.steps.length - 1), current)
        diff && await this.append({kind: 'outside', diff})
      }
      this.state = current
      this.ready = true
    } catch(err) {
      console.error(err)
    }
  }

  // Modification de l'analyse : étape mémorisée un peu plus tard
  static schedule(){
    if ( !this.ready ) return
    clearTimeout(this.timer)
    this.timer = setTimeout(this.capture.bind(this), DELAY)
  }

  static async capture(){
    clearTimeout(this.timer)
    if ( !this.ready ) return
    const current = this.snapshot()
    const diff = this.diff(this.state, current)
    if ( !diff ) return
    this.state = current
    await this.append({kind: 'change', diff})
  }

  static async append(step){
    step.time = Date.now()
    this.steps.push(step)
    await invoke('history:append', {step})
  }

  /**
   * État actuel de l'analyse : {infos, marks: {id: data}, systems:
   * {image_name: data}}
   */
  static snapshot(){
    const infos = {}
    const all = (Current.analyse && Current.analyse.infos) || {}
    INFOS_KEYS.forEach(k => undefined !== all[k] && (infos[k] = clone(all[k])))
    const marks = {}
    AObjet.each(ao => {
      if ( ao.isSystem || !ao.data || undefined === ao.id ) return
      const data = clone(ao.data)
      MARK_IGNORED.forEach(k => delete data[k])
      marks[ao.id] = data
    })
    const systems = {}
    Systeme.getData().forEach(d => systems[d.image_name] = clone(d))
    return {infos, marks, systems}
  }

  // Changements de +a+ à +b+ (valeur null : supprimé), ou null
  static diff(a, b){
    const diff = {}
    ;['infos', 'marks', 'systems'].forEach(part => {
      const pa = a[part] || {}, pb = b[part] || {}
      const d = {}
      Object.keys(pb).forEach(k => same(pa[k], pb[k]) || (d[k] = pb[k]))
      Object.keys(pa).forEach(k => k in pb || (d[k] = null))
      Object.keys(d).length && (diff[part] = d)
    })
    return Object.keys(diff).length ? diff : null
  }

  // État de l'analyse après l'étape d'index +index+
  static stateAt(index){
    let state = {infos: {}, marks: {}, systems: {}}
    for ( let i = 0 ; i <= index ; ++i ) state = this.applyStep(state, this.steps[i])
    return state
  }

  // État +state+ (modifié) après l'étape +step+
  static applyStep(state, step){
    if ( step.state ) return clone(step.state)
    Object.entries(step.diff || {}).forEach(([part, d]) => {
      state[part] || (state[part] = {})
      Object.entries(d).forEach(([k, v]) => null === v ? delete state[part][k] : (state[part][k] = clone(v)))
    })
    return state
  }

  /**
   * Retour à l'état de l'étape +index+ : enregistré (nouvelle étape),
   * puis analyse rechargée
   */
  static async restore(index){
    try {
      await this.capture()
      const target = this.stateAt(index)
      const diff   = this.diff(this.state, target)
      if ( !diff ) return
      await this.append({kind: 'restore', to: index, diff})
      this.ready = false
      // Marques : verrouillage actuel conservé
      const tags = Object.entries(target.marks).map(([id, data]) => {
        const ao = AObjet.get(id)
        ao && ao.data && ao.data.locked && (data.locked = true)
        return data
      })
      const infos = Object.assign({}, Current.analyse.infos)
      INFOS_KEYS.forEach(k => k in target.infos ? (infos[k] = target.infos[k]) : delete infos[k])
      infos.systems = Systeme.getData().map(d => Object.assign({}, d, target.systems[d.image_name] || {}))
      await invoke('analyse:saveTags', {tags})
      await invoke('analyse:saveInfos', {infos})
      Current.analyse.modified = false
      await invoke('analyse:reload')
    } catch(err) {
      erreur(err.message || err)
    }
  }

  /* --- Panneau de l'historique --- */

  static async show(){
    if ( !Current.analyse ) return erreur(t('errors.no_analyse_open'))
    await this.capture()
    this.panel && this.panel.remove()
    const list = DCreate('DIV', {class: 'history-list'})
    // Descriptions (état précédent de chaque étape, de proche en proche)
    const labels = []
    let state = {infos: {}, marks: {}, systems: {}}
    this.steps.forEach((step, i) => {
      labels.push(this.labelOf(step, state))
      state = this.applyStep(state, step)
    })
    for ( let i = this.steps.length - 1 ; i >= 0 ; --i ) {
      const step = this.steps[i]
      const row = DCreate('DIV', {class: 'history-step' + (i == this.steps.length - 1 ? ' current' : ''), inner: [
          DCreate('SPAN', {class: 'num',   text: String(i + 1)})
        , DCreate('SPAN', {class: 'time',  text: new Date(step.time).toLocaleString()})
        , DCreate('SPAN', {class: 'label', text: labels[i]})
      ]})
      row.title = t('ui.panels.analysis_history.restore_hover')
      i == this.steps.length - 1 || listen(row, 'click', () => { this.panel.remove() ; this.restore(i) })
      list.appendChild(row)
    }
    this.panel = DCreate('DIV', {id: 'analysis_history', inner: [list]})
    document.body.appendChild(this.panel)
    addPanelHead(this.panel, {title: t('ui.panels.analysis_history.title'), onClose: () => this.panel.remove()})
  }

  // Description de l'étape +step+ (+before+ : état précédent)
  static labelOf(step, before){
    const T = (k, p) => t(`ui.panels.analysis_history.${k}`, p)
    switch(step.kind){
      case 'initial': return T('initial')
      case 'restore': return T('restore', {n: step.to + 1})
      case 'outside': return T('outside')
    }
    const d = step.diff || {}, parts = []
    const marks = Object.entries(d.marks || {})
    const added   = marks.filter(([id, v]) => v && !before.marks[id])
    const removed = marks.filter(([id, v]) => !v)
    const changed = marks.filter(([id, v]) => v && before.marks[id])
    const one = (key, [id, v]) => T(`${key}_one`, {name: this.markName(v || before.marks[id])})
    added.length   && parts.push(added.length   == 1 ? one('added', added[0])     : T('added_many',   {n: added.length}))
    changed.length && parts.push(changed.length == 1 ? one('changed', changed[0]) : T('changed_many', {n: changed.length}))
    removed.length && parts.push(removed.length == 1 ? one('removed', removed[0]) : T('removed_many', {n: removed.length}))
    d.systems && parts.push(T('systems', {n: Object.keys(d.systems).length}))
    d.infos   && parts.push(T('infos'))
    return parts.join(' · ')
  }

  static markName(data){
    if ( !data ) return '?'
    const type = AMARQUES_TYPES[data.type]
    const content = String(data.content || '').replace(/__RET__/g, ' ').trim()
    return (type ? type.name : data.type) + (content ? ` «\u00a0${content.length > 30 ? content.slice(0, 30) + '…' : content}\u00a0»` : '')
  }
}
