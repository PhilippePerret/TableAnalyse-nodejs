/**
 * Grille magnétique (alignement des marques)
 */
import { pref } from './Preferences.js'

export const Grid = {

  on: false,  // true quand la grille est activée

  vSnap: null,
  hSnap: null,
  _bSnap: null,

  toggleGridMode(modeON){
    this.on    = modeON
    this.vSnap = modeON ? Number(pref('grid_vertical_space'))   : null
    this.hSnap = modeON ? Number(pref('grid_horizontal_space')) : null
    this.bSnap = modeON ? pref('thiness_cellule_line')  : 0
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
