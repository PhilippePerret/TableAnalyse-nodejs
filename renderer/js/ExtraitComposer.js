import { DCreate, listen } from './dom.js'
import { px } from './handies.js'
import { analyseUrl } from './api.js'
import { draggable, resizable } from './lib/interact.js'
import { addPanelHead } from './Panneau.js'
import { AObjet } from './AObjet.js'
import { setModified } from './Current.js'
import { UI } from './UI.js'
import { t } from './i18n.js'
import { erreur } from './lib/Message.js'

// Marge (px) autour des morceaux dans la zone d'assemblage
const PAD = 40

/**
 * ExtraitComposer
 * ---------------
 * Boite d'assemblage d'un extrait de partition (AMExtrait, cf.
 * AMark.js) : ses morceaux (clé et armure, bouts de systèmes) dans une
 * zone d'assemblage, chacun recadrable par ses quatre bords et
 * déplaçable (souris, flèches pour le morceau choisi, Maj : 10 px).
 * « Assembler » crée l'image ; « Renoncer » laisse l'extrait tel quel
 * (le supprime s'il vient d'être créé). Les mesures peuvent être
 * changées (morceaux proposés pour elles, dès la sortie du champ).
 */
export class ExtraitComposer {

  constructor(mark, options){
    this.mark  = mark
    this.isNew = !!(options && options.isNew)
  }

  // Échelle de l'image (px de la table par px des images), changée avec
  // les mesures
  get markScale(){ return this.newScale || this.mark.data.scale }

  async open(){
    AObjet.deselectAll()
    this.buildPanel()
    UI.desactiveCurrentShortcuts()
    this.onKey = this.onKeyDown.bind(this)
    window.addEventListener('keydown', this.onKey, true)
    await this.setPieces(this.mark.pieces.map(p => Object.assign({}, p)))
  }

  // Morceaux à assembler (sources chargées), affichés à une échelle qui
  // les fait tenir dans la largeur de la zone d'assemblage
  async setPieces(pieces){
    this.pieces  = pieces
    this.sources = await Promise.all(pieces.map(p => this.mark.constructor.sourceOf(p.image)))
    pieces.forEach((p, i) => null == p.y2 && this.sources[i] && (p.y2 = this.sources[i].naturalHeight))
    const minX = Math.min(...pieces.map(p => p.dx)), minY = Math.min(...pieces.map(p => p.dy))
    pieces.forEach(p => { p.dx -= minX ; p.dy -= minY })
    const width = Math.max(1, ...pieces.map(p => p.dx + p.x2 - p.x1))
    this.scale = Math.min(this.markScale, (this.workspace.clientWidth - 2 * PAD) / width)
    this.buildPieces()
  }

  buildPieces(){
    this.layer.innerHTML = ''
    this.current = null
    this.divs = this.pieces.map((p, i) => this.buildPiece(p, i))
    this.divs.length && this.choose(0)
    this.sizeLayer()
  }

  buildPiece(p, i){
    const src = this.sources[i]
    const img = DCreate('IMG', {src: analyseUrl(`systems/${p.image}`)})
    img.draggable = false
    if ( src ) {
      img.style.width  = px(src.naturalWidth * this.scale)
      img.style.height = px(src.naturalHeight * this.scale)
    }
    const div = DCreate('DIV', {class: 'ext-piece', inner: [img]})
    this.layer.appendChild(div)
    this.place(div, p)
    listen(div, 'mousedown', () => this.choose(i))
    draggable(div, {
      stop: (e, ui) => {
        p.dx = (ui.position.left - PAD) / this.scale
        p.dy = (ui.position.top  - PAD) / this.scale
        this.place(div, p)
        this.sizeLayer()
      }
    })
    resizable(div, {
        handles: 'n,e,s,w'
      , start:  () => { this.start = Object.assign({}, p, {left: this.leftOf(p), top: this.topOf(p)}) }
      , resize: (e, ui) => this.crop(div, p, ui)
      , stop:   () => this.sizeLayer()
    })
    return div
  }

  // Position (zone d'assemblage) du morceau +p+
  leftOf(p){ return PAD + p.dx * this.scale }
  topOf(p) { return PAD + p.dy * this.scale }

  // Place et taille du morceau +p+, image du système décalée
  place(div, p){
    Object.assign(div.style, {
        left:   px(this.leftOf(p)), top: px(this.topOf(p))
      , width:  px((p.x2 - p.x1) * this.scale)
      , height: px((p.y2 - p.y1) * this.scale)
    })
    const img = div.querySelector('img')
    img.style.left = px(-p.x1 * this.scale)
    img.style.top  = px(-p.y1 * this.scale)
  }

  // Zone d'assemblage assez grande pour tous les morceaux
  sizeLayer(){
    const right  = Math.max(0, ...this.pieces.map(p => this.leftOf(p) + (p.x2 - p.x1) * this.scale))
    const bottom = Math.max(0, ...this.pieces.map(p => this.topOf(p)  + (p.y2 - p.y1) * this.scale))
    this.layer.style.width  = px(right + PAD)
    this.layer.style.height = px(bottom + PAD)
  }

  /**
   * Recadrage par un bord : l'image reste en place, seules les bornes
   * du morceau changent (dans les limites de l'image du système)
   */
  crop(div, p, ui){
    const s = this.start, k = this.scale
    const src = this.sources[this.pieces.indexOf(p)]
    const maxW = src ? src.naturalWidth : s.x2, maxH = src ? src.naturalHeight : s.y2
    const min = Math.round(10 / k)
    let x1 = s.x1 + (ui.position.left - s.left) / k
    let y1 = s.y1 + (ui.position.top  - s.top)  / k
    let x2 = x1 + ui.size.width  / k
    let y2 = y1 + ui.size.height / k
    x1 = Math.max(0, Math.min(x1, s.x2 - min)) ; x2 = Math.min(maxW, Math.max(x2, x1 + min))
    y1 = Math.max(0, Math.min(y1, s.y2 - min)) ; y2 = Math.min(maxH, Math.max(y2, y1 + min))
    // Bord resté fixe : borne inchangée
    if ( Math.abs(ui.position.left - s.left) < 0.01 ) x1 = s.x1 ; else x2 = s.x2
    if ( Math.abs(ui.position.top  - s.top)  < 0.01 ) y1 = s.y1 ; else y2 = s.y2
    Object.assign(p, {
        x1: Math.round(x1), x2: Math.round(x2), y1: Math.round(y1), y2: Math.round(y2)
      , dx: s.dx + (Math.round(x1) - s.x1), dy: s.dy + (Math.round(y1) - s.y1)
    })
    this.place(div, p)
  }

  choose(i){
    this.current = this.pieces[i]
    this.divs.forEach((d, j) => d.classList.toggle('current', j == i))
  }

  // Flèches : déplacement du morceau choisi (Maj : 10 px)
  onKeyDown(e){
    if ( !this.current || !e.key.startsWith('Arrow') ) return
    if ( ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) ) return
    const d = (e.shiftKey ? 10 : 1) / this.scale
    switch(e.key){
      case 'ArrowLeft':  this.current.dx -= d ; break
      case 'ArrowRight': this.current.dx += d ; break
      case 'ArrowUp':    this.current.dy -= d ; break
      case 'ArrowDown':  this.current.dy += d ; break
    }
    this.place(this.divs[this.pieces.indexOf(this.current)], this.current)
    this.sizeLayer()
    e.preventDefault()
    e.stopPropagation()
  }

  buildPanel(){
    const T = k => t(`ui.panels.extract.${k}`)
    this.field = DCreate('INPUT', {type: 'text', value: this.mark.content || ''})
    const btnCancel   = DCreate('BUTTON', {class: 'btn-close', text: t('ui.buttons.renounce'), style: 'float:left;', tabindex: '-1'})
    const btnOK       = DCreate('BUTTON', {class: 'btn-default', text: T('assemble')})
    this.layer     = DCreate('DIV', {class: 'ext-layer'})
    this.workspace = DCreate('DIV', {class: 'ext-workspace', inner: [this.layer]})
    const panel = DCreate('DIV', {id: 'ext_composer_panel', inner: [
        DCreate('P', {class: 'help', text: T('help')})
      , DCreate('DIV', {class: 'row', inner: [DCreate('LABEL', {text: T('measures')}), this.field]})
      , this.workspace
      , DCreate('DIV', {class: 'buttons', inner: [btnOK, btnCancel]})
    ]})
    document.body.appendChild(panel)
    this.panel = panel
    addPanelHead(panel, {title: T('title'), onClose: this.cancel.bind(this)})
    listen(btnCancel,   'click', e => { e.stopPropagation() ; this.cancel() })
    listen(btnOK,       'click', e => { e.stopPropagation() ; this.assemble() })
    // Mesures changées (sortie du champ, Entrée) : morceaux de ces mesures
    listen(this.field, 'change', () => this.resetMeasures())
    listen(this.field, 'keydown', e => {
      if ( e.key != 'Enter' ) return
      e.preventDefault() ; e.stopPropagation()
      this.field.blur()
    })
  }

  // Nouvelles mesures : morceaux proposés pour elles
  async resetMeasures(){
    const extract = this.mark.constructor.extractOf(this.field.value)
    if ( !extract ) return
    this.measures = this.field.value.trim()
    this.newScale = extract.scale
    await this.setPieces(extract.pieces)
  }

  // « Assembler » : l'image de l'extrait est composée des morceaux et
  // enregistrée (cf. AMExtrait#assemble)
  assemble(){
    const mark = this.mark
    const minX = Math.min(...this.pieces.map(p => p.dx))
    const minY = Math.min(...this.pieces.map(p => p.dy))
    this.pieces.forEach(p => { p.dx -= minX ; p.dy -= minY })
    mark.data.pieces = this.pieces
    mark.data.scale  = this.markScale
    this.measures && (mark.content = this.measures)
    mark.assemble().catch(err => erreur(err.message))
    setModified()
    this.close()
  }

  cancel(){
    this.close()
    this.isNew && AObjet.remove(this.mark)
  }

  close(){
    window.removeEventListener('keydown', this.onKey, true)
    this.panel.remove()
    UI.reactiveCurrentShortcuts()
  }
}
