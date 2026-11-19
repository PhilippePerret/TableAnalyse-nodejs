import { DGet, listen, stopEvent } from './dom.js'
import { invoke } from './api.js'
import { AObjet } from './AObjet.js'
import { Current, setModified } from './Current.js'
import { on, emit } from './events.js'
import { t } from './i18n.js'
import { LiaisonEditor } from './LiaisonEditor.js'
/**
 * Liaisons
 * --------
 * Courbe (marque de type `lia`) reliant deux marques (cercle, cadre,
 * forme, texte, motif, type de note) : menus « Marque > Relier /
 * Délier » et menus contextuels.
 *
 * Données : from, to (identifiants des marques reliées), style
 * (cf. DEFAULT_STYLE), top/left (coin de la courbe, recalculés).
 * Seules ces données sont enregistrées : la courbe est redessinée à
 * partir de la position des deux marques (boite, ellipse pour un
 * cercle), dès qu'un élément de la table change (déplacement,
 * redimensionnement…). Elle vise le centre de chaque marque et
 * s'arrête sur son bord.
 *
 * Dessin : <svg class="liaison"> sur la table (exporté tel quel en PDF
 * et en SVG, redessiné sur la copie de l'export, cf. drawIn).
 * Sélection propre (pas dans AObjet.selection) : clic, double-clic
 * (édition, cf. LiaisonEditor), Effacer (suppression).
 */
const SVG_NS = 'http://www.w3.org/2000/svg'

// Types de marques reliables
export const TYPES_RELIABLES = ['cir', 'bbx', 'frm', 'txt', 'mot', 'not']

// Style par défaut. line : 'solid' ou 'dashed' ; start, end : flèche
// ('none', 'full', 'hollow', 'open') ; gap : flèches écartées du bord ;
// curve : courbure (% de la distance, négative : de l'autre côté)
export const DEFAULT_STYLE = {line: 'solid', width: 3, color: '#222222', start: 'none', end: 'none', gap: false, curve: 30}
export const ARROWS = ['none', 'full', 'hollow', 'open']

export class Liaison extends AObjet {

  /**
   * Relier les deux marques de +selection+ (si possible, cf. canLink)
   */
  static link(selection){
    if ( !this.canLink(selection) ) return
    const [m1, m2] = selection
    const data = {id: Current.analyse.newId(), type: 'lia', from: m1.id, to: m2.id, top: 0, left: 0, style: Object.assign({}, DEFAULT_STYLE)}
    const lia = new Liaison(Current.analyse, data)
    lia.build_and_observe()
    setModified()
    return lia
  }

  // Délier les deux marques de +selection+
  static unlink(selection){
    const lia = this.linkOf(selection)
    lia && lia.remove()
  }

  // Deux marques reliables, pas encore reliées
  static canLink(selection){
    return !!selection && selection.length == 2
      && selection.every(m => m.isMark && TYPES_RELIABLES.includes(m.type))
      && !this.linkOf(selection)
  }

  // Liaison entre les deux marques de +selection+ (ou undefined)
  static linkOf(selection){
    if ( !selection || selection.length != 2 ) return
    const ids = selection.map(m => m.id)
    return this.all.find(l => ids.includes(l.data.from) && ids.includes(l.data.to) && l.data.from != l.data.to)
  }

  static get all(){
    return AObjet.select(ao => ao instanceof Liaison)
  }

  /* --- Sélection (une liaison à la fois) --- */

  static select(lia){
    AObjet.deselectAll()
    this.selected = lia
    lia.obj.classList.add('selected')
  }

  static deselect(){
    this.selected && this.selected.obj && this.selected.obj.classList.remove('selected')
    this.selected = null
  }

  /* --- Dessin --- */

  /**
   * Toutes les liaisons redessinées (une fois par image) quand un
   * élément de la table change (sauf les liaisons elles-mêmes)
   */
  static observeTable(table){
    if ( this.observer ) return
    this.observer = new MutationObserver(records => {
      const outside = records.some(r => {
        const el = r.target instanceof Element ? r.target : r.target.parentElement
        return !el || !el.closest('svg.liaison')
      })
      outside && this.redrawAll()
    })
    this.observer.observe(table, {attributes: true, attributeFilter: ['style', 'class'], childList: true, characterData: true, subtree: true})
    // Polices chargées : tailles des marques changées
    document.fonts && document.fonts.ready.then(() => this.redrawAll())
    // Une marque sélectionnée : plus de liaison sélectionnée
    on('selection:changed', () => this.deselect())
  }

  static redrawAll(){
    if ( this.frame ) return
    this.frame = requestAnimationFrame(() => {
      this.frame = null
      this.all.forEach(lia => lia.draw())
    })
  }

  /**
   * Export : liaisons de la copie +content+ de la table redessinées
   * d'après la position des marques copiées (déplacées par l'export) ;
   * retirées si une de leurs marques n'est pas exportée
   */
  static drawIn(content){
    content.querySelectorAll('svg.liaison').forEach(svg => {
      const lia = AObjet.get(Number(svg.id.split('-')[1]))
      const el1 = lia && content.querySelector(`#amark-${lia.data.from}`)
      const el2 = lia && content.querySelector(`#amark-${lia.data.to}`)
      const b1 = el1 && boxOf(el1), b2 = el2 && boxOf(el2)
      if ( !b1 || !b2 ) return svg.remove()
      render(svg, b1, b2, lia.style)
    })
  }

  //##################################################################

  // Style affiché : celui en cours d'édition (aperçu), sinon l'enregistré
  get style(){ return Object.assign({}, DEFAULT_STYLE, this.data.style, this.preview) }

  // Aperçu d'un changement de style (édition, type de liaison), gardé
  // seulement par confirmStyle
  previewStyle(values){
    this.preview = Object.assign(this.preview || {}, values)
    this.draw()
  }
  confirmStyle(){
    if ( !this.preview ) return
    this.data.style = this.style
    delete this.preview
    setModified()
  }
  cancelStyle(){
    delete this.preview
    this.draw()
  }

  build_and_observe(){
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('id', this.domId)
    svg.setAttribute('class', 'liaison')
    this.obj = svg
    const table = DGet('body section#content')
    table.appendChild(svg)
    Liaison.observeTable(table)
    listen(svg, 'mousedown', (e) => stopEvent(e))
    listen(svg, 'click', (e) => { Liaison.select(this) ; return stopEvent(e) })
    listen(svg, 'dblclick', (e) => { this.edit() ; return stopEvent(e) })
    listen(svg, 'contextmenu', this.onContextMenu.bind(this))
    this.draw()
  }

  /**
   * Dessin d'après la position des deux marques. Une marque supprimée :
   * la liaison aussi.
   */
  draw(){
    if ( !this.obj || this.destroyed ) return
    const m1 = AObjet.get(this.data.from), m2 = AObjet.get(this.data.to)
    if ( !m1 || !m2 ) return this.remove()
    const b1 = m1.obj && boxOf(m1.obj), b2 = m2.obj && boxOf(m2.obj)
    if ( !b1 || !b2 ) return
    const r = render(this.obj, b1, b2, this.style)
    this.data.left = r.x
    this.data.top  = r.y
    this.box = r
  }

  edit(){
    Liaison.select(this)
    LiaisonEditor.open(this)
  }

  remove(){
    Liaison.selected === this && Liaison.deselect()
    LiaisonEditor.liaison === this && LiaisonEditor.close()
    AObjet.remove(this)
    emit('selection:changed', {selection: AObjet.selection || []})
  }

  destroy(){
    this.obj && this.obj.remove()
    this.destroyed = true
    setModified()
  }

  onContextMenu(e){
    stopEvent(e)
    Liaison.select(this)
    const items = [
        {label: t('ui.mark_context.edit'), value: 'edit'}
      , {type: 'separator'}
      , {label: t('ui.mark_context.unlink'), value: 'unlink'}
    ]
    invoke('menu:popup', {items})
      .then(choice => {
        if ( choice == 'edit' ) this.edit()
        else if ( choice == 'unlink' ) this.remove()
      })
      .catch(err => console.error(err))
    return false
  }

  // Position : celle de la courbe (jamais déplacée elle-même)
  get top(){ return this.box ? this.box.y : this.data.top }
  set top(v){}
  get left(){ return this.box ? this.box.x : this.data.left }
  set left(v){}
  get width(){ return this.box ? this.box.w : 0 }
  set width(v){}
  get height(){ return this.box ? this.box.h : 0 }
  set height(v){}
  get bottom(){ return this.top + this.height }

  get domId(){ return `amark-${this.id}` }
}

/* --- Géométrie --- */

// Boite de l'élément +el+ dans la table (null s'il n'est pas affiché)
function boxOf(el){
  if ( !el.offsetParent ) return null
  return {x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, round: el.classList.contains('cir')}
}

/**
 * Point du bord de la boite +b+ (ellipse pour un cercle) dans la
 * direction (+dx+, +dy+) depuis son centre
 */
function borderPoint(b, dx, dy){
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2
  const a = Math.max(b.w / 2, 1), h = Math.max(b.h / 2, 1)
  if ( !dx && !dy ) return {x: cx, y: cy}
  const k = b.round
    ? 1 / Math.hypot(dx / a, dy / h)
    : Math.min(dx ? a / Math.abs(dx) : Infinity, dy ? h / Math.abs(dy) : Infinity)
  return {x: cx + k * dx, y: cy + k * dy}
}

const unit = (dx, dy) => { const d = Math.hypot(dx, dy) || 1 ; return {x: dx / d, y: dy / d} }

/**
 * Flèche de pointe +tip+ dirigée selon -+u+ (vers la marque), de type
 * +type+ : {d, closed} (chemin, fermé pour une flèche pleine ou évidée)
 */
function arrowPath(type, tip, u, w){
  const len = 3 * w + 8, half = len * .45
  const bx = tip.x + u.x * len, by = tip.y + u.y * len
  const p1 = [bx - u.y * half, by + u.x * half], p2 = [bx + u.y * half, by - u.x * half]
  const pts = `${f(p1[0])} ${f(p1[1])} L ${f(tip.x)} ${f(tip.y)} L ${f(p2[0])} ${f(p2[1])}`
  return type == 'open' ? {d: `M ${pts}`, len: 0} : {d: `M ${pts} Z`, len}
}

const f = (n) => String(Math.round(n * 100) / 100)

/**
 * Dessin de la courbe (Bézier quadratique) entre les boites +b1+ et
 * +b2+ dans l'élément <svg> +svg+, avec le style +st+
 * @return la boite du <svg> dans la table {x, y, w, h}
 */
function render(svg, b1, b2, st){
  const w = Math.max(.5, Number(st.width) || 1)
  const c1 = {x: b1.x + b1.w / 2, y: b1.y + b1.h / 2}
  const c2 = {x: b2.x + b2.w / 2, y: b2.y + b2.h / 2}
  const dx = c2.x - c1.x, dy = c2.y - c1.y, d = Math.hypot(dx, dy) || 1
  // Normale du côté du haut (à droite pour une liaison verticale)
  let nx = dy / d, ny = -dx / d
  if ( ny > 0 || (ny == 0 && nx < 0) ) { nx = -nx ; ny = -ny }
  const k = d * (Number(st.curve) || 0) / 100
  const ctrl = {x: (c1.x + c2.x) / 2 + nx * k, y: (c1.y + c2.y) / 2 + ny * k}
  // Extrémités sur les bords, flèches (écartées du bord si demandé)
  const ends = [[b1, c1, st.start], [b2, c2, st.end]].map(([b, c, arrow]) => {
    const u = unit(ctrl.x - c.x, ctrl.y - c.y)
    let p = borderPoint(b, u.x, u.y)
    const hasArrow = arrow && arrow != 'none'
    if ( hasArrow && st.gap ) p = {x: p.x + u.x * (2 * w + 4), y: p.y + u.y * (2 * w + 4)}
    const a = hasArrow ? arrowPath(arrow, p, u, w) : null
    // Le trait s'arrête à la base d'une flèche fermée
    const q = a ? {x: p.x + u.x * a.len * .8, y: p.y + u.y * a.len * .8} : p
    return {p, q, a, type: arrow}
  })
  const [e1, e2] = ends
  // Boite du dessin
  const pts = [e1.p, e2.p, ctrl, ...ends.filter(e => e.a).flatMap(e => e.a.d.match(/-?[\d.]+ -?[\d.]+/g).map(s => { const [x, y] = s.split(' ').map(Number) ; return {x, y} }))]
  const pad = 2 * w + 4
  const x0 = Math.floor(Math.min(...pts.map(p => p.x)) - pad), y0 = Math.floor(Math.min(...pts.map(p => p.y)) - pad)
  const x1 = Math.ceil(Math.max(...pts.map(p => p.x)) + pad),  y1 = Math.ceil(Math.max(...pts.map(p => p.y)) + pad)
  const W = x1 - x0, H = y1 - y0
  Object.assign(svg.style, {left: `${x0}px`, top: `${y0}px`, width: `${W}px`, height: `${H}px`})
  svg.setAttribute('width', W)
  svg.setAttribute('height', H)
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
  // Chemins (coordonnées du <svg>)
  const tr = (d) => d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, x, y) => `${f(Number(x) - x0)} ${f(Number(y) - y0)}`)
  const curve = tr(`M ${f(e1.q.x)} ${f(e1.q.y)} Q ${f(ctrl.x)} ${f(ctrl.y)} ${f(e2.q.x)} ${f(e2.q.y)}`)
  const color = st.color || DEFAULT_STYLE.color
  const paths = [
      {class: 'lia-hit', d: curve, fill: 'none', stroke: 'transparent', 'stroke-width': w + 10}
    , {class: 'lia-line', d: curve, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': st.line == 'dashed' ? 'butt' : 'round'
        , 'stroke-dasharray': st.line == 'dashed' ? `${f(3 * w)} ${f(2 * w)}` : null}
  ]
  ends.forEach((e, i) => e.a && paths.push(e.type == 'full'
    ? {class: `lia-arrow${i}`, d: tr(e.a.d), fill: color, stroke: null}
    : {class: `lia-arrow${i}`, d: tr(e.a.d), fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linejoin': e.type == 'open' ? 'round' : 'miter', 'stroke-linecap': 'round'}
  ))
  // Éléments gardés d'un dessin à l'autre (le moins de changements)
  const existing = Array.from(svg.children)
  existing.forEach(el => paths.some(p => p.class == el.getAttribute('class')) || el.remove())
  paths.forEach(p => {
    let el = svg.querySelector(`:scope > path.${p.class}`)
    if ( !el ) {
      // (zone de clic perdue à l'export : pas recréée)
      if ( p.class == 'lia-hit' && existing.length && !existing.some(e => e.getAttribute('class') == 'lia-hit') ) return
      el = document.createElementNS(SVG_NS, 'path')
      svg.appendChild(el)
    }
    Object.entries(p).forEach(([k, v]) => null === v ? el.removeAttribute(k) : el.setAttribute(k, v))
  })
  return {x: x0, y: y0, w: W, h: H}
}
