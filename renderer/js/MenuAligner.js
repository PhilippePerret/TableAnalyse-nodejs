import { DGet } from './dom.js'
import { not } from './lib/common.js'
import { MenusTool } from './MenusTool.js'
import { AObjet } from './AObjet.js'
import { on } from './events.js'
/**

  Class AlignMenu
  ---------------
  Gestion du menu principal "Aligner"

  cf. la classe MenusTool pour le fonctionnement général

*/
export class AlignMenu extends MenusTool {

  static init(){
    super.init()
    this.setAllMenuAlignment(false)
    this.measureMenu.disabled = true
    this.setStateCancelMenu(false)
    on('selection:changed', ({selection}) => this.setStateBySelection(selection))
  }

  /**
   * Aligne les marques sélectionnées (sans changer leur taille) : bord
   * haut, bas, gauche ou droit de la sélection, ou son centre vertical
   * ou horizontal. 'measure' aligne les marques de forme sur leur
   * mesure. 'cancel' remet les marques à leur position d'avant.
   */
  static onActivate(e, align, option){
    const sel = AObjet.dupSelection()
    if ( align == 'cancel' ) {
      sel.forEach(aob => {
        if ( undefined !== aob.old_align_left ) aob.left = aob.old_align_left
        if ( undefined !== aob.old_align_top  ) aob.top  = aob.old_align_top
      })
      // Pour ne pas pouvoir annuler deux fois
      return this.setStateCancelMenu(false)
    }
    if ( align == 'measure' ) {
      sel.filter(aob => aob.isForme).forEach(aob => {
        aob.old_align_left = aob.left
        aob.old_align_top  = aob.top
        aob.aimanteSurMesure()
      })
      return this.setStateCancelMenu(true)
    }
    const box = sel.map(aob => ({aob, left: aob.left, top: aob.top, width: aob.width, height: aob.height}))
    const minLeft   = Math.min(...box.map(b => b.left))
    const maxRight  = Math.max(...box.map(b => b.left + b.width))
    const minTop    = Math.min(...box.map(b => b.top))
    const maxBottom = Math.max(...box.map(b => b.top + b.height))
    box.forEach(b => {
      b.aob.old_align_left = b.left
      b.aob.old_align_top  = b.top
      switch(align){
        case 'top':     b.aob.top  = minTop ; break
        case 'bottom':  b.aob.top  = maxBottom - b.height ; break
        case 'vcenter': b.aob.top  = Math.round((minTop + maxBottom - b.height) / 2) ; break
        case 'left':    b.aob.left = minLeft ; break
        case 'right':   b.aob.left = maxRight - b.width ; break
        case 'hcenter': b.aob.left = Math.round((minLeft + maxRight - b.width) / 2) ; break
      }
    })
    this.setStateCancelMenu(true)
  }

  /* --- Public Methods --- */

  static setStateBySelection(selection){
    this.setAllMenuAlignment(selection.length > 1)
    // « À la mesure » : dès qu'une marque de forme est sélectionnée
    this.measureMenu.disabled = !selection.some(aob => aob.isForme)
  }

  /* --- Fonctional Methods --- */

  static setAllMenuAlignment(state){
    Array.from(this.menu.options).forEach((option, i) => {
      if ( i == 0 || !option.value || ['cancel', 'measure'].includes(option.value) ) return
      option.disabled = not(state)
    })
  }

  static setStateCancelMenu(state){
    this.cancelMenu.disabled = not(state)
  }

  /* --- HTML Elements  */

  static get measureMenu(){
    return this._measuremenu || (this._measuremenu = DGet('option[value="measure"]', this.menu))
  }
  static get cancelMenu(){
    return this._cancelmenu || (this._cancelmenu = DGet('option[value="cancel"]', this.menu))
  }
}
