import { DCreate, listen } from './dom.js'
import { onRelease } from './KeyRelease.js'
import { px } from './handies.js'
import { analyseUrl, invoke } from './api.js'
import { draggable, resizable } from './lib/interact.js'
import { addPanelHead } from './Panneau.js'
import { AObjet } from './AObjet.js'
import { UI } from './UI.js'
import { t } from './i18n.js'
import { erreur } from './lib/Message.js'

// Marge (px) autour de l'image dans la zone d'édition
const PAD = 30
const SVGNS = 'http://www.w3.org/2000/svg'

/**
 * SystemImageEditor
 * -----------------
 * Correction de l'image d'un système (#253), comme les masques des
 * extraits : l'image du système, sur laquelle on pose des MASQUES BLANCS
 * (pointillés ici seulement), rectangles (déplaçables, dimensionnables)
 * ou polygones (un clic par point ; double-clic, clic sur le premier
 * point ou bouton « Terminer le polygone » : le dernier point est relié
 * au premier). Masque choisi : supprimé par la touche Effacer ou son
 * menu contextuel.
 * « Appliquer » : nouvelle image fusionnant les masques à l'image
 * (« Appliquer à tous les systèmes » : mêmes masques, au même endroit,
 * sur chaque système), affichage actualisé. Opération destructive : tous
 * les systèmes sont d'abord copiés (systems/originaux) ; menu contextuel
 * du système « Remettre l'image originale ».
 * Coordonnées des masques : pixels de l'image.
 */
export class SystemImageEditor {

  // Éditeur ouvert (un seul à la fois)
  static current = null

  static open(systeme){
    if ( this.current ) return
    this.current = new SystemImageEditor(systeme)
    return this.current.open()
  }

  constructor(systeme){
    this.systeme = systeme
    this.masks   = []   // {kind: 'rect', x, y, w, h} | {kind: 'poly', points: [[x, y]…]}
    this.drawing = null // polygone en cours : [[x, y]…]
  }

  async open(){
    AObjet.deselectAll()
    UI.desactiveCurrentShortcuts()
    this.buildPanel()
    this.onKey = this.onKeyDown.bind(this)
    window.addEventListener('keydown', this.onKey, true)
    this.source = await loadImage(analyseUrl(`systems/${this.systeme.image_name}`) + `?v=${Date.now()}`)
    this.scale = Math.min(1, (this.workspace.clientWidth - 2 * PAD) / this.source.naturalWidth) || 1
    this.buildImage()
  }

  /* --- Construction --- */

  buildPanel(){
    const T = k => t(`ui.panels.system_image.${k}`)
    const btnCancel = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.renounce'), style: 'float:left;', tabindex: '-1'})
    const btnOK     = DCreate('BUTTON', {class: 'btn-default', text: T('apply')})
    this.btnRect    = DCreate('BUTTON', {class: 'btn-rect', text: T('rect')})
    this.btnPoly    = DCreate('BUTTON', {class: 'btn-poly', text: T('poly')})
    this.allBox     = DCreate('INPUT', {type: 'checkbox', id: 'sys_img_all'})
    this.layer      = DCreate('DIV', {class: 'sie-layer'})
    this.workspace  = DCreate('DIV', {class: 'sie-workspace', inner: [this.layer]})
    const panel = DCreate('DIV', {id: 'sys_image_panel', inner: [
        DCreate('P', {class: 'help', text: T('help')})
      , DCreate('DIV', {class: 'row', inner: [this.btnRect, this.btnPoly]})
      , this.workspace
        // « Appliquer à tous les systèmes » juste à gauche de « Appliquer » (#272)
      , DCreate('DIV', {class: 'buttons', inner: [
            btnCancel
          , DCreate('SPAN', {class: 'sie-all', inner: [this.allBox, DCreate('LABEL', {for: 'sys_img_all', text: T('all_systems')})]})
          , btnOK
        ]})
    ]})
    document.body.appendChild(panel)
    this.panel = panel
    addPanelHead(panel, {title: T('title'), onClose: this.close.bind(this)})
    listen(btnCancel, 'click', e => { e.stopPropagation() ; this.close() })
    listen(btnOK,     'click', e => { e.stopPropagation() ; this.apply() })
    listen(this.btnRect, 'click', e => { e.stopPropagation() ; this.btnRect.blur() ; this.addRect() })
    listen(this.btnPoly, 'click', e => { e.stopPropagation() ; this.btnPoly.blur() ; this.drawing ? this.endPolygon() : this.startPolygon() })
    // Clics du tracé d'un polygone
    listen(this.layer, 'click', this.onClickLayer.bind(this))
    listen(this.layer, 'dblclick', e => { e.stopPropagation() ; this.drawing && this.endPolygon() })
    ;['click', 'dblclick', 'mousedown'].forEach(type => listen(panel, type, e => e.stopPropagation()))
  }

  buildImage(){
    const k = this.scale, w = this.source.naturalWidth * k, h = this.source.naturalHeight * k
    Object.assign(this.layer.style, {width: px(w + 2 * PAD), height: px(h + 2 * PAD)})
    // Zone d'édition à la hauteur du système (un peu plus), pas plus (#273)
    this.workspace.style.height = px(h + 2 * PAD + 2)
    const img = DCreate('IMG', {class: 'sie-image', src: this.source.src})
    img.draggable = false
    Object.assign(img.style, {left: px(PAD), top: px(PAD), width: px(w), height: px(h)})
    this.layer.appendChild(img)
    // Polygones (et tracé en cours) : un SVG à la taille de l'image
    this.svg = document.createElementNS(SVGNS, 'svg')
    this.svg.setAttribute('class', 'sie-svg')
    Object.assign(this.svg.style, {left: px(PAD), top: px(PAD), width: px(w), height: px(h)})
    this.svg.setAttribute('viewBox', `0 0 ${this.source.naturalWidth} ${this.source.naturalHeight}`)
    this.layer.appendChild(this.svg)
  }

  /* --- Masques rectangulaires --- */

  addRect(){
    this.drawing && this.endPolygon()
    const ws = this.workspace, k = this.scale
    const w = 160 / k, h = 80 / k
    // En haut à gauche de la partie visible de l'image, près du bouton,
    // un peu décalé vers la droite (#274)
    const m = {
        kind: 'rect'
      , x: Math.max(0, (ws.scrollLeft + 60) / k)
      , y: Math.max(0, (ws.scrollTop + 10) / k)
      , w, h
    }
    this.masks.push(m)
    this.choose(this.buildRect(m))
    return m
  }

  buildRect(m){
    const div = DCreate('DIV', {class: 'sie-mask'})
    div.mask = m
    m.el = div
    this.layer.appendChild(div)
    this.placeRect(div)
    listen(div, 'mousedown', () => this.choose(div))
    this.listenDelete(div)
    draggable(div, {
      stop: (e, ui) => {
        m.x = (ui.position.left - PAD) / this.scale
        m.y = (ui.position.top  - PAD) / this.scale
        this.placeRect(div)
      }
    })
    resizable(div, {
        handles: 'n,e,s,w,ne,nw,se,sw'
      , stop: (e, ui) => {
          const k = this.scale
          Object.assign(m, {
              x: (ui.position.left - PAD) / k, y: (ui.position.top - PAD) / k
            , w: Math.max(4, ui.size.width) / k, h: Math.max(4, ui.size.height) / k
          })
          this.placeRect(div)
        }
    })
    return div
  }

  placeRect(div){
    const m = div.mask, k = this.scale
    Object.assign(div.style, {
        left:  px(PAD + m.x * k), top:    px(PAD + m.y * k)
      , width: px(m.w * k),       height: px(m.h * k)
    })
  }

  /* --- Masques polygonaux --- */

  startPolygon(){
    this.choose(null)
    this.drawing = []
    this.panel.classList.add('drawing')
    this.btnPoly.textContent = t('ui.panels.system_image.poly_end')
    this.trace = document.createElementNS(SVGNS, 'polyline')
    this.trace.setAttribute('class', 'sie-trace')
    this.svg.appendChild(this.trace)
  }

  // Point de l'image sous la souris
  pointOf(e){
    const r = this.svg.getBoundingClientRect()
    const k = r.width / this.source.naturalWidth
    return [Math.round((e.clientX - r.left) / k), Math.round((e.clientY - r.top) / k)]
  }

  onClickLayer(e){
    if ( !this.drawing ) return
    e.stopPropagation()
    if ( e.detail > 1 ) return // (double-clic : fin du tracé)
    const p = this.pointOf(e)
    // Clic sur le premier point : polygone fermé
    const first = this.drawing[0]
    const near = first && Math.hypot(p[0] - first[0], p[1] - first[1]) * this.scale < 8
    if ( near && this.drawing.length >= 3 ) return this.endPolygon()
    this.drawing.push(p)
    this.trace.setAttribute('points', this.drawing.map(q => q.join(',')).join(' '))
  }

  endPolygon(){
    const points = this.drawing
    this.drawing = null
    this.trace && this.trace.remove()
    this.trace = null
    this.panel.classList.remove('drawing')
    this.btnPoly.textContent = t('ui.panels.system_image.poly')
    if ( !points || points.length < 3 ) return null
    const m = {kind: 'poly', points}
    this.masks.push(m)
    this.choose(this.buildPoly(m))
    return m
  }

  buildPoly(m){
    const poly = document.createElementNS(SVGNS, 'polygon')
    poly.setAttribute('class', 'sie-poly')
    poly.mask = m
    m.el = poly
    this.svg.appendChild(poly)
    this.placePoly(poly)
    this.listenDelete(poly)
    // Déplacement du polygone entier
    listen(poly, 'mousedown', (e) => {
      if ( this.drawing || e.button !== 0 ) return
      e.preventDefault() ; e.stopPropagation()
      this.choose(poly)
      const start = this.pointOf(e), orig = m.points.map(p => p.slice())
      const move = (ev) => {
        const p = this.pointOf(ev)
        m.points = orig.map(([x, y]) => [x + p[0] - start[0], y + p[1] - start[1]])
        this.placePoly(poly)
      }
      const up = () => { window.removeEventListener('mousemove', move) ; window.removeEventListener('mouseup', up) }
      window.addEventListener('mousemove', move)
      window.addEventListener('mouseup', up)
    })
    return poly
  }

  placePoly(poly){
    poly.setAttribute('points', poly.mask.points.map(p => p.join(',')).join(' '))
  }

  /* --- Choix, suppression --- */

  choose(el){
    this.currentMask = el ? el.mask : null
    this.masks.forEach(m => m.el && m.el.classList.toggle('current', m.el === el))
  }

  listenDelete(el){
    listen(el, 'contextmenu', e => {
      e.preventDefault() ; e.stopPropagation()
      invoke('menu:popup', {items: [{label: t('ui.mark_context.delete'), value: 'delete'}]})
        .then(choice => choice == 'delete' && this.removeMask(el.mask))
        .catch(err => console.error(err))
    })
  }

  removeMask(m){
    const i = this.masks.indexOf(m)
    if ( i < 0 ) return
    this.masks.splice(i, 1)
    m.el && m.el.remove()
    this.currentMask === m && (this.currentMask = null)
  }

  onKeyDown(e){
    if ( ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) ) return
    if ( e.key == 'Enter' && this.drawing ) return onRelease(e, () => this.drawing && this.endPolygon())
    if ( !['Backspace', 'Delete'].includes(e.key) ) return
    // (les marques de la table ne sont pas supprimées)
    if ( !this.currentMask ) { e.preventDefault() ; e.stopPropagation() ; return }
    const m = this.currentMask
    return onRelease(e, () => this.removeMask(m))
  }

  /* --- Application --- */

  // Systèmes corrigés : celui-ci ou tous
  get targets(){
    return this.allBox.checked ? this.systeme.constructor.all : [this.systeme]
  }

  async apply(){
    this.drawing && this.endPolygon()
    if ( !this.masks.length ) return this.close()
    try {
      const images = []
      for ( const sys of this.targets ) {
        const src = sys === this.systeme ? this.source : await loadImage(analyseUrl(`systems/${sys.image_name}`) + `?v=${Date.now()}`)
        images.push({name: sys.image_name, data: SystemImageEditor.merge(src, this.masks, sys.image_name)})
      }
      await invoke('system:correct', {images})
      this.targets.forEach(sys => sys.reloadImage())
      this.close()
    } catch(err) {
      erreur(err.message)
    }
  }

  /**
   * Image +img+ avec les masques blancs fusionnés : data URL (format de
   * l'image d'origine, d'après +name+)
   */
  static merge(img, masks, name){
    const canvas = document.createElement('canvas')
    canvas.width  = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    ctx.fillStyle = '#ffffff'
    masks.forEach(m => {
      if ( m.kind == 'rect' ) return ctx.fillRect(m.x, m.y, m.w, m.h)
      ctx.beginPath()
      m.points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
      ctx.closePath()
      ctx.fill()
    })
    const png = /\.png$/i.test(name)
    return canvas.toDataURL(png ? 'image/png' : 'image/jpeg', 0.92)
  }

  close(){
    window.removeEventListener('keydown', this.onKey, true)
    this.panel && this.panel.remove()
    UI.reactiveCurrentShortcuts()
    SystemImageEditor.current = null
  }
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => reject(new Error(t('errors.image_not_found', {src})))
    img.src = src
  })
}
