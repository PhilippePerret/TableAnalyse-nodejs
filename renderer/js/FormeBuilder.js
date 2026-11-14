import { DCreate, DGet } from './dom.js'
import { message } from './lib/Message.js'
import { px } from './handies.js'
import { AObjet } from './AObjet.js'
import { Systeme } from './Systeme.js'
import { pref } from './Preferences.js'
import { Forme } from './Forme.js'
import { UI } from './UI.js'
import { TYPES_FORME } from './Constants.js'
import { t } from './i18n.js'
/**

  FormeBuilder
  ------------
  Construction de la forme de la pièce sur la table d'analyse, avant ou
  après la partition (préférence form_position), sur sa propre page à
  l'export (cf. Exporter).

  Proportionnalité : une même largeur par mesure pour toute la forme
  (largeur des systèmes / nombre de mesures de la pièce). Une portion
  occupe donc une largeur proportionnelle à son nombre de mesures.

  Une rangée par niveau (parties, sections, segments) et, selon les
  réglages, les numéros de mesure des débuts de portion et les
  tonalités (marques de modulation).

  Noir et blanc par défaut ; en mode couleur, les couleurs des marques
  de partie, de section, de segment et de modulation (préférences) s'y
  appliquent.

  La forme est redessinée à chaque ouverture de l'analyse (préférence
  form_built), donc toujours à jour des marques de forme.

*/

const GAP     = 300   // distance (px) entre la forme et la partition
const MIN_GAP = 30    // distance minimale (px) entre deux numéros

export class FormeBuilder {

  /**
   * Construit (ou reconstruit) la forme
   * @return true si la forme a été construite
   */
  static build(){
    this.remove()
    const last = Forme.lastMeasure
    if ( !last ) { message(t('messages.no_measure_number')) ; return false }
    const portions = this.portions(last)
    if ( !portions.length ) { message(t('messages.no_form_mark')) ; return false }
    const first = Systeme.first
    const width = Number(pref('systeme_width'))
    const unit  = width / last // largeur d'une mesure
    const o = DCreate('DIV', {id: 'form-diagram', class: 'form-diagram', 'data-position': pref('form_position')})
    o.style.left  = px(first ? first.left : 0)
    o.style.width = px(width)
    o.appendChild(DCreate('DIV', {class: 'ftitle', text: t('ui.form_diagram.title')}))
    ;[1, 2, 3].forEach(level => {
      const items = portions.filter(p => p.level == level)
      if ( !items.length ) return
      o.appendChild(DCreate('DIV', {class: `frow level${level}`, inner: items.map(p => {
        const box = DCreate('DIV', {class: `portion ${p.subtype}`, title: p.name, inner: [DCreate('SPAN', {text: p.name})]})
        box.style.left  = px(p.from * unit)
        box.style.width = px((p.to - p.from) * unit)
        return box
      })}))
    })
    pref('form_build_measures') && o.appendChild(this.measuresRow(portions, last, unit))
    pref('form_build_keys')     && o.appendChild(this.keysRow(unit))
    UI.TableAnalyse.appendChild(o)
    this.fitNames(o)
    this.spreadKeys(o)
    this.place(o)
    return true
  }

  // Nom trop long pour sa portion : police réduite (jusqu'à 12 px)
  static fitNames(o){
    o.querySelectorAll('div.portion span').forEach(span => {
      const room = span.parentElement.clientWidth - 2
      let size = parseFloat(getComputedStyle(span).fontSize)
      span.style.maxWidth = 'none' // largeur naturelle
      while ( span.offsetWidth > room && size > 12 ) {
        span.style.fontSize = px(--size)
      }
      span.style.maxWidth = ''
    })
  }

  // Tonalités qui se chevauchent : décalées vers la droite
  static spreadKeys(o){
    let right = -Infinity
    o.querySelectorAll('span.fkey').forEach(span => {
      const left = Math.max(span.offsetLeft, right + 10)
      span.style.left = px(left)
      right = left + span.offsetWidth
    })
  }

  static remove(){
    const o = DGet('#form-diagram')
    o && o.remove()
  }

  static scrollTo(){
    const o = DGet('#form-diagram')
    o && window.scrollTo({top: o.offsetTop - 100})
  }

  /**
   * Portions de la forme, en mesures : de +from+ (début de la mesure de
   * départ, 0 = début de la pièce) à +to+ (fin de la dernière mesure),
   * cf. Forme.endOf pour la fin
   */
  static portions(last){
    return Forme.sorted(AObjet.select(ao => ao.isForme && !!TYPES_FORME[ao.subtype].level)).map(start => {
      const begin = Forme.measureOf(start)
      if ( null === begin ) return null
      const from = begin - 1
      const end  = Forme.endOf(start)
      let to = last
      if ( end ) {
        const m = Forme.measureOf(end)
        if ( null !== m ) to = end.data.start == start.id ? m : m - 1
      }
      return {
          name:     start.content || TYPES_FORME[start.subtype].name
        , subtype:  start.subtype
        , level:    TYPES_FORME[start.subtype].level
        , from
        , to:       Math.max(to, from + 1)
      }
    }).filter(Boolean)
  }

  /**
   * Numéros de mesure : celui du début de chaque portion et le dernier
   * de la pièce (pas deux numéros trop proches)
   */
  static measuresRow(portions, last, unit){
    const row = DCreate('DIV', {class: 'frow fmeasures'})
    const marks = [...new Set(portions.map(p => p.from))].sort((a, b) => a - b)
      .map(from => ({x: from * unit, text: String(from + 1)}))
    marks.push({x: last * unit, text: String(last), last: true})
    let prev = -Infinity
    marks.forEach((m, i) => {
      if ( m.x - prev < MIN_GAP ) {
        if ( !m.last ) return
        row.lastChild && i > 1 && row.lastChild.remove() // le dernier numéro l'emporte
      }
      // Premier numéro aligné à gauche, dernier à droite (cf. Forme.css)
      const css = i == 0 ? ' first' : (m.last ? ' last' : '')
      const span = DCreate('SPAN', {class: 'fnum' + css, text: m.text})
      span.style.left = px(m.x)
      row.appendChild(span)
      prev = m.x
    })
    return row
  }

  // Tonalités : les modulations, au début de leur mesure (une même
  // tonalité répétée n'est écrite qu'une fois)
  static keysRow(unit){
    const row = DCreate('DIV', {class: 'frow fkeys'})
    let prev = null
    AObjet.select(ao => ao.type == 'mod')
      .map(mod => ({key: mod.content, m: Forme.measureOf(mod)}))
      .filter(k => null !== k.m)
      .sort((a, b) => a.m - b.m)
      .forEach(k => {
        if ( k.key == prev ) return
        const span = DCreate('SPAN', {class: 'fkey', text: k.key})
        span.style.left = px((k.m - 1) * unit)
        row.appendChild(span)
        prev = k.key
      })
    return row
  }

  /**
   * Place la forme après la partition, ou avant : la partition est
   * alors descendue si la place manque
   */
  static place(o){
    const {top, bottom} = this.tableExtent(o)
    if ( o.dataset.position == 'before' ) {
      const y = Number(pref('top_first_system')) || 100
      o.style.top = px(y)
      const delta = y + o.offsetHeight + GAP - top
      if ( delta > 0 ) {
        AObjet.items.forEach(ao => ao.top = ao.top + delta)
        Systeme.placeMeasureNumbers()
      }
    } else {
      o.style.top = px(bottom + GAP)
    }
    UI.TableAnalyse.style.height = px(Math.max(UI.TableAnalyse.offsetHeight, o.offsetTop + o.offsetHeight + GAP))
  }

  // Étendue verticale (px de la table) de tout ce qui est sur la table,
  // hors de la forme +o+
  static tableExtent(o){
    const base = UI.TableAnalyse.getBoundingClientRect()
    const z = UI.TableAnalyse.currentCSSZoom || 1
    let top = Infinity, bottom = 0
    Array.from(UI.TableAnalyse.children).forEach(el => {
      if ( el === o || el.offsetParent === null ) return
      const r = el.getBoundingClientRect()
      if ( !r.height ) return
      top    = Math.min(top, (r.top - base.top) / z)
      bottom = Math.max(bottom, (r.bottom - base.top) / z)
    })
    return {top: top == Infinity ? 0 : top, bottom}
  }
}
