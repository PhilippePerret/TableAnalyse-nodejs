import { DCreate, DGet, listen } from './dom.js'
import { invoke } from './api.js'
import { t } from './i18n.js'
import { message, erreur } from './lib/Message.js'
import { addPanelHead } from './Panneau.js'
import { Preferences, pref } from './Preferences.js'
import { PreferencesPanel } from './PreferencesPanel.js'
import { Analyse } from './Analyse.js'
/**

  Exporter
  --------
  Export de l'analyse en PDF (cf. main/exportPdf.js) et en SVG.

  PDF : une page unique (lecture à l'écran) ou des pages de taille fixe
  (livre). SVG : toujours un fichier par page de taille fixe, avec des
  formes SVG natives (cadres, traits, textes, images) pour les logiciels
  de mise en page.

  Les pages sont coupées dans les blancs entre les éléments de la table
  (entre les systèmes), sauf élément plus haut qu'une page.

  Taille des pages : format courant ou taille personnalisée (préférences
  de l'analyse export_page_*, en mm).

*/
const PX_PER_MM   = 96 / 25.4
const PAD         = 10      // blanc (px) au-dessus et au-dessous du contenu
const MAX_PDF_MM  = 5080    // taille maximale d'une page PDF (200 pouces)
const EXCLUDED    = '.ui-resizable-handle'
const UI_CLASSES  = ['selected', 'locked']

// Formats de page courants (mm, portrait)
const PAGE_FORMATS = {
    A3:         [297, 420]
  , A4:         [210, 297]
  , A5:         [148, 210]
  , A6:         [105, 148]
  , B4:         [250, 353]
  , B5:         [176, 250]
  , letter:     [215.9, 279.4]
  , legal:      [215.9, 355.6]
  , tabloid:    [279.4, 431.8]
  , executive:  [184.2, 266.7]
}

// Unités de la taille personnalisée (en mm)
const UNITS = {mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6}
const toMm   = (v, unit) => v * UNITS[unit]
const fromMm = (v, unit) => Math.round(v / UNITS[unit] * 100) / 100
const decimal = (n) => String(n).replace('.', t('ui.decimal_separator'))

class ExporterClass {

  /**
   * Panneau de réglage de l'export (+format+ : 'pdf' ou 'svg')
   */
  ask(format){
    if ( !Analyse.current ) return erreur(t('errors.no_analyse_to_export'))
    this.panel && this.panel.remove()
    const T = (k, v) => t(`ui.panels.export.${k}`, v)
    const radio = (value, checked) => {
      const input = DCreate('INPUT', {type: 'radio', name: 'export_mode', id: `export_mode_${value}`, value})
      input.checked = checked
      return DCreate('DIV', {inner: [input, DCreate('LABEL', {for: input.id, text: ' ' + T(`mode_${value}`)})]})
    }
    const row = (label, ...fields) => DCreate('DIV', {class: 'row', inner: [DCreate('LABEL', {text: label}), ...fields]})
    // Taille personnalisée courante (mm, unité d'affichage)
    this.custom = {
        width:  Number(pref('export_page_width'))
      , height: Number(pref('export_page_height'))
      , unit:   pref('export_page_unit') || 'mm'
    }
    const selFormat = DCreate('SELECT', {id: 'export_format'})
    Object.entries(PAGE_FORMATS).forEach(([name, [w, h]]) => {
      selFormat.appendChild(DCreate('OPTION', {value: name, text: T('format', {name: T(`formats.${name}`), width: decimal(w), height: decimal(h)})}))
    })
    selFormat.appendChild(DCreate('OPTION', {disabled: true, text: '──────────'}))
    const optCustom = DCreate('OPTION', {value: 'custom'})
    selFormat.appendChild(optCustom)
    const updateCustomLabel = () => {
      const {width, height, unit} = this.custom
      optCustom.textContent = width > 0 && height > 0
        ? T('custom_size', {width: decimal(fromMm(width, unit)), height: decimal(fromMm(height, unit)), unit: T(`units.${unit}`)})
        : T('custom')
    }
    updateCustomLabel()
    selFormat.value = PAGE_FORMATS[pref('export_page_format')] || pref('export_page_format') == 'custom' ? pref('export_page_format') : 'A4'
    let lastFormat = selFormat.value
    listen(selFormat, 'change', () => {
      if ( selFormat.value != 'custom' ) { lastFormat = selFormat.value ; return }
      this.askCustomSize(
          () => { updateCustomLabel() ; lastFormat = 'custom' }
        , () => { selFormat.value = lastFormat }
      )
    })
    const selOrient = DCreate('SELECT', {id: 'export_orientation', inner: ['portrait', 'landscape'].map(o => DCreate('OPTION', {value: o, text: T(o)}))})
    selOrient.value = pref('export_page_orientation') || 'portrait'
    const margin = DCreate('INPUT', {type: 'text', id: 'export_margin', value: String(pref('export_page_margin')), style: 'width:50px;'})

    const btnCancel = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.cancel'), style: 'float:left;'})
    const btnExport = DCreate('BUTTON', {text: T('export')})
    const inner = []
    format == 'pdf' && inner.push(radio('page', false), radio('book', true))
    inner.push(
        row(T('size'), selFormat)
      , row(T('orientation'), selOrient)
      , row(T('margin'), margin, DCreate('SPAN', {text: ' ' + T('units.mm')}))
      , DCreate('DIV', {inner: [
            DCreate('INPUT', {type: 'checkbox', id: 'export_remember'})
          , DCreate('LABEL', {for: 'export_remember', text: ' ' + T('remember')})
        ]})
    )
    format == 'svg' && inner.push(DCreate('DIV', {class: 'explication', text: T('fonts_notice')}))
    inner.push(DCreate('DIV', {class: 'buttons', inner: [btnCancel, btnExport]}))
    const panel = DCreate('DIV', {id: 'export_panel', inner})
    document.body.appendChild(panel)
    this.panel = panel
    // Page unique : pas de taille de page
    const setMode = () => {
      const book = format == 'svg' || DGet('#export_mode_book', panel).checked
      selFormat.disabled = selOrient.disabled = !book
    }
    format == 'pdf' && panel.querySelectorAll('input[name="export_mode"]').forEach(r => listen(r, 'change', setMode))
    setMode()
    const close = () => { this.closeCustom() ; panel.remove() ; this.panel = null }
    addPanelHead(panel, {title: T(`title_${format}`), onClose: close})
    listen(panel, 'click', (e) => e.stopPropagation())
    listen(panel, 'dblclick', (e) => e.stopPropagation())
    listen(btnCancel, 'click', close)
    listen(btnExport, 'click', () => {
      const name = selFormat.value
      let [width, height] = name == 'custom' ? [this.custom.width, this.custom.height] : PAGE_FORMATS[name]
      if ( (selOrient.value == 'landscape') != (width > height) ) [width, height] = [height, width]
      const opts = {
          mode:   format == 'svg' || DGet('#export_mode_book', panel).checked ? 'book' : 'page'
        , width, height
        , margin: Number(margin.value)
      }
      if ( !(opts.margin >= 0) || (opts.mode == 'book' && !(width > 0 && height > 0 && 2 * opts.margin < Math.min(width, height))) ) {
        return erreur(T('bad_size'))
      }
      if ( DGet('#export_remember', panel).checked ) {
        const [w, h] = name == 'custom' ? [this.custom.width, this.custom.height] : PAGE_FORMATS[name]
        this.remember({
            export_page_format:       name
          , export_page_width:        w
          , export_page_height:       h
          , export_page_unit:         this.custom.unit
          , export_page_orientation:  selOrient.value
          , export_page_margin:       opts.margin
        })
      }
      close()
      this.export(format, opts)
    })
  }

  /**
   * Petit formulaire de la taille personnalisée (largeur, hauteur et
   * unité). +onOk+ quand elle est définie, +onCancel+ sinon.
   */
  askCustomSize(onOk, onCancel){
    this.closeCustom()
    const T = (k) => t(`ui.panels.export.${k}`)
    const {unit} = this.custom
    const field = (id, mm) => DCreate('INPUT', {type: 'text', id, value: mm > 0 ? decimal(fromMm(mm, unit)) : '', style: 'width:70px;'})
    const fWidth = field('custom_width', this.custom.width), fHeight = field('custom_height', this.custom.height)
    const selUnit = DCreate('SELECT', {id: 'custom_unit', inner: Object.keys(UNITS).map(u => DCreate('OPTION', {value: u, text: T(`units_long.${u}`)}))})
    selUnit.value = unit
    const row = (label, field) => DCreate('DIV', {class: 'row', inner: [DCreate('LABEL', {text: label}), field]})
    const btnCancel = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.cancel'), style: 'float:left;'})
    const btnOk = DCreate('BUTTON', {text: t('ui.buttons.ok')})
    const panel = DCreate('DIV', {id: 'export_custom_size', inner: [
        row(T('width'), fWidth), row(T('height'), fHeight), row(T('unit'), selUnit)
      , DCreate('DIV', {class: 'buttons', inner: [btnCancel, btnOk]})
    ]})
    document.body.appendChild(panel)
    this.customPanel = panel
    const cancel = () => { this.closeCustom() ; onCancel() }
    addPanelHead(panel, {title: T('custom_title'), onClose: cancel})
    listen(panel, 'click', (e) => e.stopPropagation())
    listen(panel, 'dblclick', (e) => e.stopPropagation())
    listen(btnCancel, 'click', cancel)
    listen(btnOk, 'click', () => {
      const w = Number(fWidth.value.replace(',', '.')), h = Number(fHeight.value.replace(',', '.'))
      if ( !(w > 0 && h > 0) ) return erreur(T('bad_size'))
      this.custom = {width: toMm(w, selUnit.value), height: toMm(h, selUnit.value), unit: selUnit.value}
      this.closeCustom()
      onOk()
    })
    fWidth.focus()
  }

  closeCustom(){
    this.customPanel && this.customPanel.remove()
    this.customPanel = null
  }

  remember(values){
    Object.entries(values).forEach(([key, value]) => {
      Preferences.saveData(key, value)
      Preferences.set(key, value)
    })
  }

  async export(format, opts){
    message(t(`messages.exporting_${format}`), {keep: true})
    const stage = new Stage()
    try {
      await stage.build()
      const layout = stage.layout(opts)
      const res = format == 'pdf'
        ? await invoke('analyse:exportPdf', await stage.pdfData(layout))
        : await invoke('analyse:exportSvg', {pages: await stage.svgPages(layout)})
      message(t(`messages.exported_${format}`, {path: res}))
    } catch(err) {
      console.error(err)
      erreur(t('errors.export_failed', {error: err.message || err}))
    } finally {
      stage.remove()
    }
  }
}

/**
 * Copie de la table d'analyse, hors de l'écran, épurée des éléments
 * d'interface, sur laquelle sont mesurés les éléments.
 */
class Stage {

  async build(){
    const table = DGet('section#content')
    this.holder = DCreate('DIV', {style: `position:absolute;left:-${table.scrollWidth + 50000}px;top:0;`})
    this.content = table.cloneNode(true)
    this.content.querySelectorAll(EXCLUDED).forEach(e => e.remove())
    this.content.querySelectorAll(UI_CLASSES.map(c => '.' + c).join(',')).forEach(e => e.classList.remove(...UI_CLASSES))
    this.holder.appendChild(this.content)
    document.body.appendChild(this.holder)
    await Promise.all(Array.from(this.content.querySelectorAll('img')).map(img => img.decode().catch(() => null)))
    this.items = this.measureItems()
  }

  remove(){ this.holder && this.holder.remove() }

  /**
   * Éléments de premier niveau de la table, avec leur étendue (y compris
   * leurs enfants) en coordonnées de la table
   */
  measureItems(){
    const base = this.content.getBoundingClientRect()
    this.base = base
    return Array.from(this.content.children).map((el, index) => {
      if ( getComputedStyle(el).display == 'none' ) return null
      let {left, top, right, bottom} = el.getBoundingClientRect()
      el.querySelectorAll('*').forEach(sub => {
        const r = sub.getBoundingClientRect()
        if ( r.width == 0 && r.height == 0 ) return
        left = Math.min(left, r.left) ; top = Math.min(top, r.top)
        right = Math.max(right, r.right) ; bottom = Math.max(bottom, r.bottom)
      })
      if ( right - left == 0 && bottom - top == 0 ) return null
      return {el, index, left: left - base.left, top: top - base.top, right: right - base.left, bottom: bottom - base.top}
    }).filter(Boolean)
  }

  /**
   * Taille des pages (mm), échelle (mm par px de la table) et tranches
   * de la table [y0, y1] de chaque page
   */
  layout(opts){
    if ( !this.items.length ) throw new Error(t('errors.nothing_to_export'))
    const x0 = Math.min(...this.items.map(i => i.left))
    const x1 = Math.max(...this.items.map(i => i.right))
    const top    = Math.min(...this.items.map(i => i.top)) - PAD
    const bottom = Math.max(...this.items.map(i => i.bottom)) + PAD
    const contentW = x1 - x0, contentH = bottom - top
    let {width, height, margin} = opts
    let scale, slices
    if ( opts.mode == 'book' ) {
      scale  = (width - 2 * margin) / contentW
      slices = this.paginate(top, bottom, (height - 2 * margin) / scale)
    } else {
      margin = opts.margin || 0
      scale  = Math.min(1 / PX_PER_MM, (MAX_PDF_MM - 2 * margin) / contentH, (MAX_PDF_MM - 2 * margin) / contentW)
      width  = contentW * scale + 2 * margin
      height = contentH * scale + 2 * margin
      slices = [[top, bottom]]
    }
    return {width, height, margin, scale, x0, contentW, slices}
  }

  /**
   * Coupe la hauteur [top, bottom] en pages de +pageH+ px, au milieu des
   * blancs entre les éléments quand c'est possible
   */
  paginate(top, bottom, pageH){
    const merged = []
    this.items.map(i => [i.top, i.bottom]).sort((a, b) => a[0] - b[0]).forEach(iv => {
      const last = merged[merged.length - 1]
      if ( last && iv[0] <= last[1] ) last[1] = Math.max(last[1], iv[1])
      else merged.push(iv.slice())
    })
    const cuts = merged.slice(1).map((iv, i) => (merged[i][1] + iv[0]) / 2)
    const slices = []
    let y = top
    while ( bottom - y > 0.5 ) {
      const limit = y + pageH
      if ( limit >= bottom ) { slices.push([y, bottom]) ; break }
      const fit = cuts.filter(c => c > y + 1 && c <= limit)
      const cut = fit.length ? fit[fit.length - 1] : limit
      slices.push([y, cut])
      y = cut
    }
    return slices
  }

  itemsIn([y0, y1]){
    return this.items.filter(i => i.bottom > y0 && i.top < y1)
  }

  /* --- PDF --- */

  /**
   * Code HTML des pages (images en dur, originales) pour le processus
   * principal, qui en fait le PDF
   */
  async pdfData(layout){
    const embedded = this.content.cloneNode(true)
    const cache = new Map()
    for ( const img of embedded.querySelectorAll('img') ) {
      const src = img.getAttribute('src')
      if ( !src || src.startsWith('data:') ) continue
      cache.has(src) || cache.set(src, await dataUrl(src))
      img.setAttribute('src', cache.get(src))
    }
    const children = Array.from(embedded.children)
    const {width, height, margin, scale, x0, contentW} = layout
    const s = scale * PX_PER_MM // px de page par px de table
    const pages = layout.slices.map(slice => {
      const [y0, y1] = slice
      const inner = this.itemsIn(slice).map(i => children[i.index].outerHTML).join('\n')
      return `<div class="pdf-page" style="width:${width}mm;height:${height}mm;">
  <div style="position:absolute;overflow:hidden;left:${margin}mm;top:${margin}mm;width:${contentW * s}px;height:${(y1 - y0) * s}px;">
    <div style="position:absolute;left:0;top:0;transform:scale(${s});transform-origin:0 0;">
      <section id="content" style="position:absolute;margin:0 !important;left:${-x0}px;top:${-y0}px;width:${this.content.scrollWidth}px;height:${y1}px;">
${inner}
      </section>
    </div>
  </div>
</div>`
    })
    const styles = `<style type="text/css">\n${PreferencesPanel.buildSelectorsInHead()}\n</style>`
    return {code_html: styles + pages.join('\n'), width, height}
  }

  /* --- SVG --- */

  async svgPages(layout){
    this.prepareForSvg()
    this.images = new Map()
    const pages = []
    for ( const slice of layout.slices ) pages.push(await this.svgPage(layout, slice))
    return pages
  }

  /**
   * Pseudo-éléments (::before, ::after) changés en vrais éléments et
   * transformations relevées puis retirées (mesures sans transformation,
   * rendues ensuite par des groupes SVG)
   */
  prepareForSvg(){
    const style = DCreate('STYLE', {text: '.sa-nopseudo::before, .sa-nopseudo::after {content: none !important;}'})
    this.holder.appendChild(style)
    const all = Array.from(this.content.querySelectorAll('*'))
    const pseudos = []
    all.forEach(el => {
      ;['::before', '::after'].forEach(p => {
        const cs = getComputedStyle(el, p)
        if ( !cs.content || cs.content == 'none' || cs.content == 'normal' || cs.display == 'none' ) return
        const span = document.createElement('span')
        for ( const prop of cs ) span.style.setProperty(prop, cs.getPropertyValue(prop))
        span.textContent = cs.content.replace(/^["']|["']$/g, '')
        pseudos.push({el, span, before: p == '::before'})
      })
    })
    pseudos.forEach(({el, span, before}) => {
      el.classList.add('sa-nopseudo')
      before ? el.insertBefore(span, el.firstChild) : el.appendChild(span)
    })
    this.transforms = new Map()
    ;[this.content, ...this.content.querySelectorAll('*')].forEach(el => {
      const cs = getComputedStyle(el)
      if ( !cs.transform || cs.transform == 'none' ) return
      this.transforms.set(el, {matrix: cs.transform, origin: cs.transformOrigin.split(' ').map(parseFloat)})
    })
    this.transforms.forEach((v, el) => el.style.setProperty('transform', 'none', 'important'))
  }

  async svgPage(layout, slice){
    const [y0, y1] = slice
    const {width, height, margin, scale, x0, contentW} = layout
    const parts = []
    for ( const item of this.itemsIn(slice) ) parts.push(await this.svgOf(item.el))
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${num(width)}mm" height="${num(height)}mm" viewBox="0 0 ${num(width)} ${num(height)}">
<defs><clipPath id="page"><rect x="${num(x0)}" y="${num(y0)}" width="${num(contentW)}" height="${num(y1 - y0)}"/></clipPath></defs>
<g transform="translate(${num(margin)} ${num(margin)}) scale(${num(scale, 6)}) translate(${num(-x0)} ${num(-y0)})" clip-path="url(#page)">
${parts.join('\n')}
</g>
</svg>
`
  }

  async svgOf(el){
    const cs = getComputedStyle(el)
    if ( cs.display == 'none' || cs.visibility == 'hidden' ) return ''
    const r = this.rect(el)
    const out = []
    const tag = el.tagName.toLowerCase()
    if ( tag == 'img' ) {
      out.push(await this.svgImage(el, r))
    } else if ( tag == 'svg' ) {
      out.push(inlineSvg(new XMLSerializer().serializeToString(el), r))
    } else {
      out.push(boxSvg(cs, r))
      for ( const node of el.childNodes ) {
        if ( node.nodeType == Node.TEXT_NODE ) out.push(this.svgText(node, cs))
        else if ( node.nodeType == Node.ELEMENT_NODE ) out.push(await this.svgOf(node))
      }
    }
    let code = out.filter(Boolean).join('\n')
    if ( !code ) return ''
    const opacity = parseFloat(cs.opacity)
    if ( opacity < 1 ) code = `<g opacity="${num(opacity)}">\n${code}\n</g>`
    const tr = this.transforms.get(el)
    if ( tr ) {
      const ox = r.x + tr.origin[0], oy = r.y + tr.origin[1]
      code = `<g transform="translate(${num(ox)} ${num(oy)}) ${tr.matrix.replace(/,/g, ' ')} translate(${num(-ox)} ${num(-oy)})">\n${code}\n</g>`
    }
    return code
  }

  // Boite de l'élément en coordonnées de la table
  rect(el){
    const r = el.getBoundingClientRect()
    return {x: r.left - this.base.left, y: r.top - this.base.top, w: r.width, h: r.height}
  }

  async svgImage(img, r){
    const src = img.getAttribute('src')
    if ( !src ) return ''
    if ( !this.images.has(src) ) {
      if ( src.toLowerCase().endsWith('.svg') ) {
        const res = await fetch(src)
        this.images.set(src, {svg: await res.text()})
      } else {
        this.images.set(src, {data: await dataUrl(src)})
      }
    }
    const image = this.images.get(src)
    if ( image.svg ) return inlineSvg(image.svg, r)
    return `<image x="${num(r.x)}" y="${num(r.y)}" width="${num(r.w)}" height="${num(r.h)}" preserveAspectRatio="none" xlink:href="${image.data}"/>`
  }

  /**
   * Texte d'un nœud, une ligne SVG par ligne affichée
   */
  svgText(node, cs){
    const text = node.textContent
    if ( !text.trim() ) return ''
    const range = document.createRange()
    const runs = []
    let cur = null
    for ( let i = 0 ; i < text.length ; ++i ) {
      range.setStart(node, i) ; range.setEnd(node, i + 1)
      const rc = range.getClientRects()[0]
      if ( !rc ) continue
      if ( cur && Math.abs(rc.top - cur.top) < 1 ) { cur.text += text[i] ; continue }
      if ( /\s/.test(text[i]) ) continue
      cur = {text: text[i], left: rc.left, top: rc.top, height: rc.height}
      runs.push(cur)
    }
    const {ascent, descent} = fontMetrics(cs)
    const fill = color(cs.color)
    if ( !fill ) return ''
    const attrs = [
        `font-family="${cs.fontFamily.replace(/"/g, "'")}"`
      , `font-size="${num(parseFloat(cs.fontSize))}"`
      , cs.fontWeight != '400' ? `font-weight="${cs.fontWeight}"` : ''
      , cs.fontStyle != 'normal' ? `font-style="${cs.fontStyle}"` : ''
      , cs.letterSpacing != 'normal' ? `letter-spacing="${num(parseFloat(cs.letterSpacing))}"` : ''
      , `fill="${fill.rgb}"`, fill.a < 1 ? `fill-opacity="${num(fill.a)}"` : ''
    ].filter(Boolean).join(' ')
    return runs.map(run => {
      let str = run.text.replace(/\s+/g, ' ').trimEnd()
      if ( cs.textTransform == 'uppercase' ) str = str.toUpperCase()
      else if ( cs.textTransform == 'lowercase' ) str = str.toLowerCase()
      const x = run.left - this.base.left
      const y = run.top - this.base.top + (run.height - (ascent + descent)) / 2 + ascent
      return `<text x="${num(x)}" y="${num(y)}" ${attrs} xml:space="preserve">${escapeXml(str)}</text>`
    }).join('\n')
  }
}

/* --- Fonctions utilitaires (SVG) --- */

function num(n, decimals = 3){
  return String(Math.round(n * 10 ** decimals) / 10 ** decimals)
}

function escapeXml(str){
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Couleur CSS → {rgb: '#rrggbb', a}, null si transparente
function color(css){
  const m = css && css.match(/rgba?\(([^)]+)\)/)
  if ( !m ) return null
  const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number)
  if ( a == 0 ) return null
  return {rgb: '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''), a}
}

const metricsCache = new Map()
function fontMetrics(cs){
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
  if ( !metricsCache.has(font) ) {
    const ctx = document.createElement('canvas').getContext('2d')
    ctx.font = font
    const m = ctx.measureText('Hg')
    metricsCache.set(font, {ascent: m.fontBoundingBoxAscent, descent: m.fontBoundingBoxDescent})
  }
  return metricsCache.get(font)
}

function radius(value, size){
  const v = parseFloat(value) || 0
  return String(value).endsWith('%') ? v * size / 100 : v
}

function dashArray(style, w){
  if ( style == 'dashed' ) return ` stroke-dasharray="${num(3 * w)} ${num(2 * w)}"`
  if ( style == 'dotted' ) return ` stroke-dasharray="${num(w)} ${num(w)}"`
  return ''
}

/**
 * Fond et bords d'une boite
 */
function boxSvg(cs, r){
  if ( r.w == 0 && r.h == 0 ) return ''
  const out = []
  const rx = Math.min(radius(cs.borderTopLeftRadius.split(' ')[0], r.w), r.w / 2)
  const ry = Math.min(radius(cs.borderTopLeftRadius.split(' ')[1] || cs.borderTopLeftRadius.split(' ')[0], r.h), r.h / 2)
  const bg = color(cs.backgroundColor)
  if ( bg ) {
    out.push(`<rect x="${num(r.x)}" y="${num(r.y)}" width="${num(r.w)}" height="${num(r.h)}"${rx ? ` rx="${num(rx)}" ry="${num(ry)}"` : ''} fill="${bg.rgb}"${bg.a < 1 ? ` fill-opacity="${num(bg.a)}"` : ''}/>`)
  }
  const sides = ['top', 'right', 'bottom', 'left'].map(side => {
    const w = parseFloat(cs.getPropertyValue(`border-${side}-width`)) || 0
    const style = cs.getPropertyValue(`border-${side}-style`)
    const c = color(cs.getPropertyValue(`border-${side}-color`))
    return {side, w, style, c, visible: w > 0 && c && !['none', 'hidden'].includes(style)}
  })
  const stroke = (s) => `stroke="${s.c.rgb}"${s.c.a < 1 ? ` stroke-opacity="${num(s.c.a)}"` : ''} stroke-width="${num(s.w)}"${dashArray(s.style, s.w)}`
  const [t0] = sides
  const uniform = sides.every(s => s.visible && s.w == t0.w && s.style == t0.style && s.c.rgb == t0.c.rgb && s.c.a == t0.c.a)
  if ( uniform ) {
    const h = t0.w / 2
    out.push(`<rect x="${num(r.x + h)}" y="${num(r.y + h)}" width="${num(Math.max(0, r.w - t0.w))}" height="${num(Math.max(0, r.h - t0.w))}"${rx ? ` rx="${num(Math.max(0, rx - h))}" ry="${num(Math.max(0, ry - h))}"` : ''} fill="none" ${stroke(t0)}/>`)
  } else {
    sides.filter(s => s.visible).forEach(s => {
      const h = s.w / 2
      const line = {
          top:    [r.x, r.y + h, r.x + r.w, r.y + h]
        , bottom: [r.x, r.y + r.h - h, r.x + r.w, r.y + r.h - h]
        , left:   [r.x + h, r.y, r.x + h, r.y + r.h]
        , right:  [r.x + r.w - h, r.y, r.x + r.w - h, r.y + r.h]
      }[s.side]
      out.push(`<line x1="${num(line[0])}" y1="${num(line[1])}" x2="${num(line[2])}" y2="${num(line[3])}" ${stroke(s)}/>`)
    })
  }
  return out.join('\n')
}

/**
 * Code SVG (fichier ou élément) placé dans la boite +r+
 */
function inlineSvg(code, r){
  const doc = new DOMParser().parseFromString(code.substring(code.indexOf('<svg')), 'image/svg+xml')
  const svg = doc.documentElement
  if ( svg.nodeName != 'svg' ) return ''
  if ( !svg.getAttribute('viewBox') ) {
    const w = parseFloat(svg.getAttribute('width')), h = parseFloat(svg.getAttribute('height'))
    if ( w && h ) svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  }
  ;['x', 'y', 'width', 'height'].forEach((a, i) => svg.setAttribute(a, num([r.x, r.y, r.w, r.h][i])))
  svg.removeAttribute('style')
  return new XMLSerializer().serializeToString(svg)
}

async function dataUrl(src){
  const res = await fetch(src)
  if ( !res.ok ) throw new Error(t('errors.image_not_found', {src}))
  const blob = await res.blob()
  return await new Promise((ok, ko) => {
    const reader = new FileReader()
    reader.onload = () => ok(reader.result)
    reader.onerror = () => ko(reader.error)
    reader.readAsDataURL(blob)
  })
}

export const Exporter = new ExporterClass()
