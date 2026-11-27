import { DCreate, listen } from './dom.js'
import { px } from './handies.js'
import { invoke } from './api.js'
import { draggable } from './lib/interact.js'
import { t } from './i18n.js'
import { Current, setModified } from './Current.js'
import { Preferences } from './Preferences.js'
import { AMARQUES_TYPES } from './Constants.js'
import { HeldLetter } from './HeldLetter.js'

const MODE_KEY = 'input_mode'
const POS_KEY  = 'quick_keyboard_pos'

/**
 * QuickKeyboard — saisie rapide (#260, cf. .claude/saisie_rapide_260.md)
 * ----------------------------------------------------------------------
 * Menu « Marques > Saisie > Normal | Rapide (clavier) ». En saisie
 * rapide, un bout de clavier (15 touches, rangées décalées comme un vrai
 * clavier, disposition de la langue de l'application : ui.quick_keyboard
 * .rows) est affiché en bas à gauche, déplaçable. Chaque touche peut
 * recevoir une marque (toutes ses données) : marque glissée sur la
 * touche, qui revient à sa place. Touche tenue + simple clic sur la
 * table : la marque est posée là (plusieurs clics, plusieurs marques).
 * Touche tenue : mise en exergue ; sans marque, le clic la met en rouge
 * et ne fait rien d'autre. Menu contextuel d'une touche : la vider.
 * Affectations propres à chaque analyse (préférence quick_keys). La
 * saisie accélérée (lettre + clic, cf. HeldLetter) est alors désactivée.
 */
export const QuickKeyboard = {

  get mode(){
    if ( !this._mode ) {
      try { this._mode = localStorage.getItem(MODE_KEY) } catch(err) {}
      this._mode == 'quick' || (this._mode = 'normal')
    }
    return this._mode
  },
  set mode(m){
    this._mode = m == 'quick' ? 'quick' : 'normal'
    try { localStorage.setItem(MODE_KEY, this._mode) } catch(err) {}
    this.update()
  },
  get active(){ return this.mode == 'quick' && !!Current.analyse },

  // Lettres des trois rangées (langue de l'application)
  get rows(){
    const rows = String(t('ui.quick_keyboard.rows') || '').trim().split(/\s+/)
    return rows.length == 3 && rows.every(r => r.length == 5) ? rows : ['qwert', 'asdfg', 'zxcvb']
  },
  get letters(){ return this.rows.join('').split('') },

  /* --- Affectations (préférence de l'analyse) --- */

  get keys(){
    const v = Preferences.get('quick_keys')
    return v && typeof v == 'object' ? v : {}
  },
  dataOf(letter){ return this.keys[letter] || null },
  assign(letter, data){
    const keys = Object.assign({}, this.keys, {[letter]: data})
    Preferences.saveData('quick_keys', keys)
    this.renderKey(letter)
  },
  clear(letter){
    const keys = Object.assign({}, this.keys)
    delete keys[letter]
    Preferences.saveData('quick_keys', keys)
    this.renderKey(letter)
  },

  // Données d'une marque gardées par une touche : toutes, sauf son
  // identité et sa place
  dataFromMark(mark){
    const data = structuredClone(mark.data)
    ;['id', 'top', 'left', 'groups', 'start', 'locked'].forEach(k => delete data[k])
    return data
  },

  /* --- Affichage --- */

  init(){
    HeldLetter.onChange = () => this.highlight()
    this.update()
  },

  update(){
    if ( this.active ) { this.build() ; this.obj.hidden = false }
    else if ( this.obj ) this.obj.hidden = true
  },

  build(){
    if ( this.obj ) {
      // Autre analyse : ses affectations
      this.letters.forEach(l => this.renderKey(l))
      return
    }
    const o = DCreate('DIV', {id: 'quick_keyboard'})
    this.keyEls = {}
    this.rows.forEach((row, i) => {
      const r = DCreate('DIV', {class: `qk-row r${i + 1}`})
      row.split('').forEach(letter => {
        const key = DCreate('DIV', {class: 'qk-key', inner: [DCreate('SPAN', {class: 'qk-letter', text: letter})]})
        key.dataset.letter = letter
        listen(key, 'contextmenu', (e) => this.onContextMenu(e, letter))
        this.keyEls[letter] = key
        r.appendChild(key)
      })
      o.appendChild(r)
    })
    // Clic, double-clic sur le clavier : aucune marque créée (le
    // relâchement passe : il termine tout déplacement en cours, #263)
    ;['click', 'dblclick', 'mousedown'].forEach(type => listen(o, type, e => e.stopPropagation()))
    document.body.appendChild(o)
    this.obj = o
    this.restorePosition()
    draggable(o, {stop: () => this.savePosition()})
    this.letters.forEach(l => this.renderKey(l))
  },

  renderKey(letter){
    const key = this.keyEls && this.keyEls[letter]
    if ( !key ) return
    key.querySelector('.qk-mark') && key.querySelector('.qk-mark').remove()
    const data = this.dataOf(letter)
    key.classList.toggle('empty', !data)
    key.title = data ? String(data.content || (AMARQUES_TYPES[data.type] || {}).name || '').replace(/__RET__/g, '\n') : ''
    if ( !data ) return
    const box = DCreate('DIV', {class: 'qk-mark'})
    key.appendChild(box)
    const sign = this.buildSign(data)
    sign && box.appendChild(sign)
    // Réduite (et tronquée) pour tenir dans la touche
    if ( sign ) {
      const w = sign.offsetWidth, h = sign.offsetHeight
      const k = Math.max(0.2, Math.min(1, (box.clientWidth - 2) / (w || 1), (box.clientHeight - 2) / (h || 1)))
      sign.style.transform = `scale(${k})`
    }
  },

  // Aspect de la marque (comme sur la table), hors de la table
  buildSign(data){
    // (sans sa taille ni sa ligne de prolongation : réduite à la touche)
    data = structuredClone(data)
    ;['width', 'height', 'prolong'].forEach(k => delete data[k])
    try {
      // (instance de la classe de la marque, sans l'inscrire parmi les
      // objets de l'analyse)
      const v = Object.assign(Object.create(this.markClass.classOf(data).prototype), {analyse: Current.analyse, data, _id: 'qk', _top: 0, _left: 0})
      v.type = data.type
      v.build()
      const o = v.obj
      o.removeAttribute('id')
      o.querySelectorAll('.handler_prolong, .ui-resizable-handle').forEach(e => e.remove())
      o.classList.remove('selected')
      Object.assign(o.style, {position: 'relative', left: 'auto', top: 'auto'})
      o.classList.add('qk-sign')
      return o
    } catch(err) {
      console.error(err)
      return DCreate('SPAN', {class: 'qk-text', text: String(data.content || '')})
    }
  },

  highlight(){
    if ( !this.obj ) return
    const held = HeldLetter.held()
    Object.entries(this.keyEls).forEach(([letter, key]) => {
      key.classList.toggle('on', held === letter)
      held === letter || key.classList.remove('miss')
    })
  },

  /* --- Saisie --- */

  // Classe AMark (donnée par AMark.js : pas d'import croisé)
  markClass: null,
  createMark(e, params){ return this.markClass.createNew(e, params) },

  /**
   * Clic sur la table, touche +letter+ tenue : marque de la touche posée
   * à l'endroit du clic ; touche vide : en rouge, rien d'autre
   */
  createAt(e, letter){
    const data = this.dataOf(letter)
    const key = this.keyEls && this.keyEls[letter]
    if ( !data ) { key && key.classList.add('miss') ; return null }
    const params = structuredClone(data)
    const dt = AMARQUES_TYPES[params.type] || {}
    Object.assign(params, {top: e.pageY - 40 + (dt.ajustY || 0), left: e.pageX - 40 + (dt.ajustX || 0)})
    params.type == 'frm' && (params.clickX = e.pageX)
    return this.createMark(e, params)
  },

  // Touche sous le point (x, y) de la fenêtre
  keyAt(x, y){
    if ( !this.active || !this.obj || this.obj.hidden ) return null
    return Object.keys(this.keyEls).find(letter => {
      const r = this.keyEls[letter].getBoundingClientRect()
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    }) || null
  },

  /**
   * Marque +mark+ lâchée au point (x, y) : sur une touche, elle lui est
   * affectée (true : la marque revient à sa place)
   */
  dropMark(mark, x, y){
    const letter = this.keyAt(x, y)
    if ( !letter ) return false
    this.assign(letter, this.dataFromMark(mark))
    return true
  },

  onContextMenu(e, letter){
    e.preventDefault() ; e.stopPropagation()
    if ( !this.dataOf(letter) ) return
    invoke('menu:popup', {items: [{label: t('ui.quick_keyboard.clear'), value: 'clear'}]})
      .then(choice => choice == 'clear' && this.clear(letter))
      .catch(err => console.error(err))
  },

  /* --- Position du clavier (mémorisée) --- */

  savePosition(){
    const r = this.obj.getBoundingClientRect()
    try { localStorage.setItem(POS_KEY, JSON.stringify({left: Math.round(r.left), top: Math.round(r.top)})) } catch(err) {}
  },
  restorePosition(){
    let pos = null
    try { pos = JSON.parse(localStorage.getItem(POS_KEY)) } catch(err) {}
    if ( pos && pos.left >= 0 && pos.top >= 0 && pos.left < window.innerWidth - 40 && pos.top < window.innerHeight - 40 ) {
      Object.assign(this.obj.style, {left: px(pos.left), top: px(pos.top), bottom: 'auto'})
    }
  },
}
