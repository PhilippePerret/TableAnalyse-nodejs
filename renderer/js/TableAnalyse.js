import { DCreate, listen, unlisten } from './dom.js'
import { px } from './handies.js'
import { AObjet } from './AObjet.js'
import { Systeme } from './Systeme.js'
import { AMark } from './AMark.js'
import { on } from './events.js'
import { UI } from './UI.js'

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
   */
  static onClick(e){
    if ( this.justSelected ) { this.justSelected = false ; return }
    if ( e.button !== 0 || e.ctrlKey || e.detail > 1 ) return
    if ( UI.hasOpenPanel || document.documentElement.classList.contains('animation-running') ) return
    const down = this.downAt
    if ( down && (Math.abs(e.clientX - down.x) > 4 || Math.abs(e.clientY - down.y) > 4) ) return
    AObjet.deselectAll()
    if ( !e.shiftKey && !e.metaKey && !e.altKey && this.isCreationTarget(e.target) ) AMark.createNew(e)
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
  }

  static get obj(){
    return this._obj || (this._obj = UI.TableAnalyse)
  }
}
