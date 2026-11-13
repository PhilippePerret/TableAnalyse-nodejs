/**
 * Grille magnétique (alignement des marques)
 */
import { pref } from './Preferences.js'

export const Grid = {

  on: false,  // true quand un magnétisme (vertical ou horizontal) est activé

  // Magnétisme vertical : positions verticales (top) calées sur les
  // lignes horizontales de la grille ; horizontal : positions
  // horizontales calées sur les lignes verticales
  vertical:   false,
  horizontal: false,

  vSnap: null,
  hSnap: null,
  _bSnap: null,

  /**
   * Active ou désactive le magnétisme +dir+ ('vertical' ou 'horizontal')
   */
  toggleGridMode(dir, modeON){
    this[dir]  = modeON
    this.on    = this.vertical || this.horizontal
    this.vSnap = this.vertical   ? Number(pref('grid_vertical_space'))   : null
    this.hSnap = this.horizontal ? Number(pref('grid_horizontal_space')) : null
    this.bSnap = this.on ? pref('thiness_cellule_line')  : 0
  },

  snapVertical(v){
    if ( !this.vSnap ) return v
    return Math.round(v / this.vSnap) * this.vSnap
  },
  snapHorizontal(v){
    if ( !this.hSnap ) return v
    return Math.round(v / this.hSnap) * this.hSnap
  },

  get bSnap(){ return this._bSnap || (this._bSnap = pref('thiness_cellule_line')) },
  set bSnap(v){ this._bSnap = v }
}
