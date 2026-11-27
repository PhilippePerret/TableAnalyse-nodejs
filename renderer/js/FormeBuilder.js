import { DCreate, DGet, listen } from './dom.js'
import { message } from './lib/Message.js'
import { px } from './handies.js'
import { AObjet } from './AObjet.js'
import { Systeme } from './Systeme.js'
import { pref } from './Preferences.js'
import { Forme } from './Forme.js'
import { UI } from './UI.js'
import { TYPES_FORME } from './Constants.js'
import { t } from './i18n.js'
import { pageUsefulWidthMm } from './Exporter.js'
import { supize, plainSup } from './lib/exposants.js'
/**

  FormeBuilder
  ------------
  Construction de la forme de la pièce sur la table d'analyse, avant ou
  après la partition (préférence form_position), sur sa propre page à
  l'export (cf. Exporter).

  « Forme générale » : une ligne avec les portions du plus haut niveau
  (les parties), d'un bout à l'autre de la pièce. Puis, pour chacune,
  son nom en titre et une ligne de détail (rangée des sections, rangée
  des segments).

  Proportionnalité, ligne par ligne : même largeur de mesure dans une
  ligne ; même largeur de mesure pour toutes les lignes de détail (la
  plus longue portion remplit la ligne).

  Selon les réglages : tonalités au-dessus des blocs (la tonalité
  courante au début de chaque ligne et de chaque partie, puis les
  modulations) et numéros de mesure dessous.

  Noir et blanc par défaut ; en mode couleur, les couleurs des marques
  de partie, de section, de segment et de modulation (préférences) s'y
  appliquent.

  La forme est redessinée à chaque ouverture de l'analyse (préférence
  form_built), donc toujours à jour des marques de forme.

*/

// Texte de l'utilisateur échappé, exposants (« 1^er^ ») compris (#236)
const escapeHTML = s => supize(String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))

const GAP     = 300   // distance (px) entre la forme et la partition
const MIN_GAP = 30    // distance minimale (px) entre deux numéros
// Mm (à l'export) par px de la forme : la forme est construite sur la
// largeur utile de la page d'export (cf. Exporter), les tailles de
// Forme.css correspondant alors à des tailles imprimées lisibles
const MM_PER_PX = 0.18

// Marge (px de la table) entre le bord gauche des systèmes et la forme
// construite (#278)
export const FORM_LEFT_MARGIN = 60

export class FormeBuilder {

  /**
   * Construit (ou reconstruit) la forme, sur la largeur utile +widthMm+
   * de la page d'export (par défaut : taille de page enregistrée)
   * @return true si la forme a été construite
   */
  static build(widthMm){
    this.remove()
    const last = Forme.lastMeasure
    if ( !last ) { message(t('messages.no_measure_number')) ; return false }
    const portions = this.portions(last)
    if ( !portions.length ) { message(t('messages.no_form_mark')) ; return false }
    const first = Systeme.first
    widthMm = widthMm || pageUsefulWidthMm()
    const width = Math.round(widthMm / MM_PER_PX)
    this.keys = this.keyChanges()
    const o = DCreate('DIV', {id: 'form-diagram', class: 'form-diagram', 'data-position': pref('form_position')})
    // Décollée du bord gauche (#278 ; à l'export, elle a sa propre page,
    // cadrée sur elle)
    o.style.left  = px((first ? first.left : 0) + FORM_LEFT_MARGIN)
    o.style.width = px(width)
    o.dataset.widthMm = widthMm
    o.appendChild(this.titleDiv())
    const general = this.generalDiv()
    general && o.appendChild(general)
    const description = Forme.formInfos.description
    description && o.appendChild(DCreate('DIV', {class: 'fdescription', text: escapeHTML(description).replace(/\n/g, '<br>')}))
    // Forme générale : les portions du plus haut niveau, d'un bout à
    // l'autre de la pièce
    const top  = Math.min(...portions.map(p => p.level))
    const tops = portions.filter(p => p.level == top)
    o.appendChild(DCreate('DIV', {class: 'fsubtitle', text: t('ui.form_diagram.structure').toLocaleUpperCase()}))
    o.appendChild(this.block(tops, 0, last, width / last, true))
    // Détail de chaque portion (ses sections, ses segments), avec une
    // même largeur de mesure pour toutes (la plus longue remplit la ligne)
    const unit = width / Math.max(...tops.map(p => p.to - p.from))
    // (une portion sans sous-portions y figure seule, avec ses tonalités)
    o.appendChild(DCreate('DIV', {class: 'fsubtitle', text: t('ui.form_diagram.details').toLocaleUpperCase()}))
    tops.forEach(P => {
      const children = portions.filter(p => p.level > top && p.from >= P.from && p.from < P.to)
      o.appendChild(DCreate('DIV', {class: 'fpart', text: escapeHTML(P.name)}))
      o.appendChild(this.block(children.length ? children : [P], P.from, P.to, unit, false))
    })
    UI.TableAnalyse.appendChild(o)
    this.spreadKeys(o)
    this.place(o)
    return true
  }

  /**
   * Bloc d'une ligne de la forme, des mesures +from+ à +to+ (+unit+ :
   * largeur d'une mesure) : tonalités au-dessus, une rangée par niveau
   * des portions +items+, numéros de mesure dessous. +keyAtStarts+ :
   * tonalité courante au début de chaque portion.
   */
  static block(items, from, to, unit, keyAtStarts){
    const b = DCreate('DIV', {class: 'fblock'})
    b.style.width = px((to - from) * unit)
    pref('form_build_keys') && b.appendChild(this.keysRow(from, to, unit, keyAtStarts ? items.map(p => p.from) : []))
    const levels = [...new Set(items.map(p => p.level))].sort()
    // Portions non définies : blocs vides entre les portions de chaque
    // rangée (et avant la première, après la dernière)
    items = [...items, ...levels.flatMap(level => this.gapsOf(items.filter(p => p.level == level), level, from, to))]
    levels.forEach(level => {
      const row = items.filter(p => p.level == level).sort((a, b) => a.from - b.from)
      b.appendChild(DCreate('DIV', {class: `frow level${level}`, inner: row.map((p, i) => {
        const box = DCreate('DIV', {class: `portion ${p.subtype}${p.empty ? ' empty' : ''}`, title: plainSup(p.name), inner: [DCreate('SPAN', {text: escapeHTML(p.name)})]})
        // Portion chevauchée par la suivante (fin marquée plus loin) :
        // dessinée jusqu'à celle-ci, nom centré dans ce qui est visible
        const end = Math.min(p.to, to, row[i + 1] ? row[i + 1].from : Infinity)
        box.style.left  = px((p.from - from) * unit)
        box.style.width = px((end - p.from) * unit)
        return box
      })}))
    })
    pref('form_build_measures') && b.appendChild(this.measuresRow(items, from, to, unit))
    return b
  }

  /**
   * Blocs vides (portions non définies) d'une rangée de niveau +level+,
   * des mesures +from+ à +to+, entre ses portions +items+
   */
  static gapsOf(items, level, from, to){
    const subtype = Object.keys(TYPES_FORME).find(k => TYPES_FORME[k].level == level)
    const gaps = []
    let cursor = from
    items.slice().sort((a, b) => a.from - b.from).forEach(p => {
      p.from > cursor && gaps.push({name: '', subtype, level, from: cursor, to: p.from, empty: true})
      cursor = Math.max(cursor, p.to)
    })
    cursor < to && gaps.push({name: '', subtype, level, from: cursor, to, empty: true})
    return gaps
  }

  // Tonalités qui se chevauchent : décalées vers la droite
  static spreadKeys(o){
    o.querySelectorAll('div.fkeys').forEach(row => {
      let right = -Infinity
      row.querySelectorAll('span.fkey').forEach(span => {
        const left = Math.max(span.offsetLeft, right + 10)
        span.style.left = px(left)
        right = left + span.offsetWidth
      })
    })
  }

  // Titre : « Forme de la pièce »
  static titleDiv(){
    return DCreate('DIV', {class: 'ftitle', text: t('ui.form_diagram.title')})
  }

  // Sous le titre : « Forme générale : <type> (<précision>) », ou null
  static generalDiv(){
    const type = Forme.formTypeName, precision = Forme.formInfos.precision
    if ( !type && !precision ) return null
    const div = DCreate('DIV', {class: 'fgeneral', text: t('ui.form_diagram.general_form', {form: escapeHTML(type || '')})})
    precision && div.appendChild(DCreate('SPAN', {class: 'fprecision', text: ' (' + escapeHTML(precision) + ')'}))
    return div
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
          name:     String(start.content || TYPES_FORME[start.subtype].name).trim()
        , subtype:  start.subtype
        , level:    TYPES_FORME[start.subtype].level
        , from
        , to:       Math.max(to, from + 1)
      }
    }).filter(Boolean)
  }

  /**
   * Numéros de mesure : celui du début de chaque portion, celui de la
   * fin d'une portion qui n'est pas suivie d'une autre et celui de la
   * fin de la ligne (pas deux numéros trop proches)
   */
  static measuresRow(items, from, to, unit){
    const row = DCreate('DIV', {class: 'frow fmeasures'})
    const marks = [...new Set(items.map(p => p.from))]
      .map(m => ({m, x: (m - from) * unit, text: String(m + 1), first: m == from}))
    // Fin d'une portion qui n'est pas suivie d'une autre (fin marquée)
    items.forEach(p => {
      if ( p.to < to && !items.some(q => q.from == p.to) && !marks.some(k => k.m == p.to || k.text == String(p.to)) ) {
        marks.push({m: p.to, x: (p.to - from) * unit, text: String(p.to)})
      }
    })
    marks.sort((a, b) => a.m - b.m)
    marks.push({x: (to - from) * unit, text: String(to), last: true})
    let prev = -Infinity
    marks.forEach((m, i) => {
      if ( m.x - prev < MIN_GAP ) {
        if ( !m.last ) return
        row.lastChild && i > 1 && row.lastChild.remove() // le dernier numéro l'emporte
      }
      // Premier numéro aligné à gauche, dernier à droite (cf. Forme.css)
      const css = m.first ? ' first' : (m.last ? ' last' : '')
      const span = DCreate('SPAN', {class: 'fnum' + css, text: m.text})
      span.style.left = px(m.x)
      // Clic : la mesure dans la partition
      listen(span, 'click', (e) => { e.stopPropagation() ; Forme.gotoMeasureNumber(Number(m.text)) })
      row.appendChild(span)
      prev = m.x
    })
    return row
  }

  // Changements de tonalité (marques de modulation) : {m: début de la
  // mesure (0 = début de la pièce), key}, dans l'ordre
  static keyChanges(){
    return AObjet.select(ao => ao.type == 'mod')
      .map(mod => ({key: mod.content, m: Forme.measureOf(mod)}))
      .filter(k => null !== k.m)
      .map(k => ({key: k.key, m: k.m - 1}))
      .sort((a, b) => a.m - b.m)
  }

  // Tonalité courante au début de la mesure +m+ (ou null)
  static keyAt(m){
    let key = null
    this.keys.forEach(k => { if ( k.m <= m ) key = k.key })
    return key
  }

  /**
   * Tonalités au-dessus d'une ligne : la tonalité courante au début de la
   * ligne et de chaque portion de +starts+, puis chaque modulation (une
   * même tonalité répétée n'est écrite qu'une fois)
   */
  static keysRow(from, to, unit, starts){
    const row = DCreate('DIV', {class: 'frow fkeys'})
    const marks = [{m: from, key: this.keyAt(from), always: true}]
    starts.forEach(m => m > from && marks.push({m, key: this.keyAt(m), always: true}))
    this.keys.forEach(k => k.m > from && k.m < to && marks.push({m: k.m, key: k.key}))
    marks.sort((a, b) => a.m - b.m)
    let prev = null, prevM = null
    marks.forEach(k => {
      if ( !k.key || k.m === prevM || (!k.always && k.key == prev) ) return
      const span = DCreate('SPAN', {class: 'fkey', text: escapeHTML(k.key)})
      span.style.left = px((k.m - from) * unit)
      row.appendChild(span)
      prev = k.key ; prevM = k.m
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
      const y = Number(pref('top_first_system')) || 300
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
