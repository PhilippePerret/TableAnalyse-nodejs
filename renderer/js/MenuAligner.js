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
    this.setStateCancelMenu(false)
    on('selection:changed', ({selection}) => this.setStateBySelection(selection.length))
  }

  /**
   * Aligne les marques sélectionnées (sans changer leur taille) : bord
   * haut, bas, gauche ou droit de la sélection, ou son centre vertical
   * ou horizontal. 'cancel' remet les marques à leur position d'avant.
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

  static setStateBySelection(count){
    this.setAllMenuAlignment(count > 1)
  }

  /* --- Fonctional Methods --- */

  static setAllMenuAlignment(state){
    Array.from(this.menu.options).forEach((option, i) => {
      if ( i == 0 || !option.value || option.value == 'cancel' ) return
      option.disabled = not(state)
    })
  }

  static setStateCancelMenu(state){
    this.cancelMenu.disabled = not(state)
  }

  /* --- HTML Elements  */

  static get cancelMenu(){
    return this._cancelmenu || (this._cancelmenu = DGet('option[value="cancel"]', this.menu))
  }
}
