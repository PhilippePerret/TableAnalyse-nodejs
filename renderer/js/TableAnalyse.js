import { listen, unlisten } from './dom.js'
import { px } from './handies.js'
import { AObjet } from './AObjet.js'
import { Systeme } from './Systeme.js'
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
   * Quand on presse la souris, certainement pour faire une
   * sélection rectangle.
   */
  static onMouseDown(e){
    listen(this.obj, 'mousemove', this.boundMouseMove)
  }

  static onMouseUp(e){
    unlisten(this.obj, 'mousemove', this.boundMouseMove)
  }

  static onMouseMove(e){

  }

  static onClick(e){
    AObjet.deselectAll.call(AObjet, e)
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
