import { DCreate, listen, unlisten } from './dom.js'
import { px } from './handies.js'
import { AObjet } from './AObjet.js'
import { Systeme } from './Systeme.js'
import { AMark } from './AMark.js'
import { on } from './events.js'
import { UI } from './UI.js'
import { pref } from './Preferences.js'
import { Current, setModified } from './Current.js'
import { message } from './lib/Message.js'
import { FormeBuilder } from './FormeBuilder.js'
import { t } from './i18n.js'

export class TableAnalyse {

  /**
   * Réglage de la hauteur de la section#content (qui contient 
   * l'analyse).
   * Note : cette méthode est appelée à la fin de la construction de
   * tous les systèmes et chaque fois que les éléments (systèmes) 
   * sont déplacés.
   */
  static setHeight(){
    const btLastSystem   = Systeme.last ? Systeme.last.bottom : 200
    const btPlusBasObjet = Systeme.last ? AObjet.bottomestPoint : 200
    this.obj.style.height = px(Math.max(btLastSystem, btPlusBasObjet))
  }

  /**
   * « Outils > Supprimer les blancs » : tout espace vertical vide entre
   * les éléments de la table (systèmes, marques, lignes des numéros de
   * mesure) plus grand que la préférence max_table_blank est ramené à
   * cette taille ; ce qui est en dessous remonte d'autant.
   */
  static removeBlanks(){
    const max = Number(pref('max_table_blank'))
    if ( !(max >= 0) || !Systeme.all.length ) return
    // Un système va avec sa ligne des numéros de mesure et ses numéros
    // (placés par rapport à lui, cf. Systeme#positionne)
    const lineMarks = AObjet.items.filter(ao => ao instanceof AMark && ao.data.line && ao.obj)
    const items = []
    Systeme.all.forEach(sys => {
      if ( !sys.obj ) return
      let bottom = sys.top + sys.obj.offsetHeight
      sys.measureLine && (bottom = Math.max(bottom, parseFloat(sys.measureLine.style.top) + 1))
      lineMarks.forEach(m => Systeme.getSystemeAssociated(m) === sys && (bottom = Math.max(bottom, m.top + m.obj.offsetHeight)))
      items.push({sys, top: sys.top, bottom})
    })
    AObjet.items.forEach(ao => {
      if ( !(ao instanceof AMark) || !ao.obj || !ao.obj.offsetParent || ao.data.line ) return
      items.push({mark: ao, top: ao.top, bottom: ao.top + ao.obj.offsetHeight})
    })
    items.sort((a, b) => a.top - b.top)
    let cursor = null, shift = 0
    items.forEach(it => {
      if ( cursor !== null && it.top - cursor > max ) shift += it.top - cursor - max
      it.shift = shift
      cursor = cursor === null ? it.bottom : Math.max(cursor, it.bottom)
    })
    if ( shift == 0 ) return message(t('messages.no_blank_to_remove'))
    items.forEach(it => it.shift && it.mark && (it.mark.top = it.mark.top - it.shift))
    items.forEach(it => it.shift && it.sys && it.sys.positionne(it.sys.top - it.shift, true))
    pref('form_built') && FormeBuilder.build()
    this.setHeight()
    setModified()
  }

  /**
   * SÉLECTION PAR RECTANGLE
   * Souris pressée sur la table (vide, élément verrouillé : marque,
   * système) puis déplacée : un rectangle en pointillé se dessine ;
   * au relâchement, chaque marque non verrouillée qu'il touche est
   * sélectionnée (ou désélectionnée si elle l'était).
   */
  static onMouseDown(e){
    // Position de l'appui : un clic relâché plus loin n'est pas un clic
    // (cf. onClick)
    this.downAt = {x: e.clientX, y: e.clientY}
    // Aucune analyse ouverte : la table ne réagit pas
    if ( !Current.analyse ) return
    if ( e.button !== 0 || document.documentElement.classList.contains('animation-running') ) return
    const target = e.target
    if ( !(target instanceof Element) || !this.obj.contains(target) && target !== document.body && target !== document.documentElement ) return
    if ( target.closest('.panneau-ui, button, input, select, textarea') ) return
    // Une marque verrouillée peut servir de départ, pas une marque libre
    const mark = target.closest('.amark')
    if ( mark && !mark.classList.contains('locked') ) return
    if ( target.matches('img.systeme') && !Systeme.systemsLocked ) return
    this.rectStart = {x: e.clientX, y: e.clientY}
    listen(document, 'mousemove', this.boundMouseMove)
  }

  static onMouseMove(e){
    const {x, y} = this.rectStart
    if ( !this.rectDiv ) {
      if ( Math.abs(e.clientX - x) < 4 && Math.abs(e.clientY - y) < 4 ) return
      this.rectDiv = DCreate('DIV', {id: 'selection_rect'})
      document.body.appendChild(this.rectDiv)
    }
    Object.assign(this.rectDiv.style, {
        left:   px(Math.min(x, e.clientX)), top:    px(Math.min(y, e.clientY))
      , width:  px(Math.abs(e.clientX - x)), height: px(Math.abs(e.clientY - y))
    })
    e.preventDefault()
  }

  static onMouseUp(e){
    unlisten(document, 'mousemove', this.boundMouseMove)
    this.rectStart = null
    if ( !this.rectDiv ) return
    const r = this.rectDiv.getBoundingClientRect()
    this.rectDiv.remove()
    this.rectDiv = null
    AObjet.items.forEach(ao => {
      if ( !(ao instanceof AMark) || !ao.obj || ao.isLocked ) return
      const m = ao.obj.getBoundingClientRect()
      if ( m.right < r.left || m.left > r.right || m.bottom < r.top || m.top > r.bottom ) return
      ao.isSelected ? AObjet.removeFromSelection(ao) : AObjet.addToSelection(ao)
    })
    // Pas de désélection par le clic qui suit le relâchement
    this.justSelected = true
    setTimeout(() => this.justSelected = false, 0)
  }

  /**
   * CLIC (non arrêté par une marque ou un panneau) : désélection de
   * tout et, sur la table elle-même ou sur un élément verrouillé
   * (système compris), création d'une marque.
   * Rien quand un panneau est ouvert, pendant l'animation, après une
   * sélection par rectangle ou un glissement, pour le second clic d'un
   * double-clic, un clic droit ou un Ctrl-clic (menu contextuel).
   * Alt-clic : création sans le type bloqué (choix du type, #233).
   */
  static onClick(e){
    if ( this.justSelected ) { this.justSelected = false ; return }
    if ( !Current.analyse ) return
    if ( e.button !== 0 || e.ctrlKey || e.detail > 1 ) return
    if ( UI.hasOpenPanel || document.documentElement.classList.contains('animation-running') ) return
    const down = this.downAt
    if ( down && (Math.abs(e.clientX - down.x) > 4 || Math.abs(e.clientY - down.y) > 4) ) return
    AObjet.deselectAll()
    if ( this.isDoubleClickCreation ) return
    if ( !e.shiftKey && !e.metaKey && this.isCreationTarget(e.target) ) AMark.createNew(e)
  }

  /**
   * DOUBLE-CLIC : création d'une marque quand la préférence
   * mark_creation_click vaut 'double' (mêmes cibles et mêmes
   * restrictions que le clic simple)
   */
  static onDblClick(e){
    if ( !this.isDoubleClickCreation || !Current.analyse ) return
    if ( e.button !== 0 || e.ctrlKey || e.shiftKey || e.metaKey ) return
    if ( UI.hasOpenPanel || document.documentElement.classList.contains('animation-running') ) return
    const down = this.downAt
    if ( down && (Math.abs(e.clientX - down.x) > 4 || Math.abs(e.clientY - down.y) > 4) ) return
    if ( !this.isCreationTarget(e.target) ) return
    AObjet.deselectAll()
    AMark.createNew(e)
  }

  static get isDoubleClickCreation(){
    return pref('mark_creation_click') === 'double'
  }

  // Cible d'un clic de création : la table (vide, ligne des numéros,
  // grille) ou un élément verrouillé
  static isCreationTarget(target){
    if ( !(target instanceof Element) ) return false
    if ( [this.obj, document.body, document.documentElement].includes(target) ) return true
    if ( target.closest('#magnetic-grid') || target.classList.contains('measure-line') ) return true
    if ( target.closest('.amark.locked') ) return true
    return target.matches('img.systeme') && Systeme.systemsLocked
  }


  static observe(){
    this.boundMouseMove = this.onMouseMove.bind(this)
    on('table:changed', this.setHeight.bind(this))
    listen(window, 'mousedown', this.onMouseDown.bind(this))    
    listen(window, 'mouseup',   this.onMouseUp.bind(this))    
    listen(window, 'click',       this.onClick.bind(this))
    listen(window, 'dblclick',    this.onDblClick.bind(this))
  }

  static get obj(){
    return this._obj || (this._obj = UI.TableAnalyse)
  }
}
