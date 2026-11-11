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

  static onActivate(e, align, option){
    /**
     * Suivant la valeur de +align+, on prend une valeur de référence
     * différente. Par exemple, si l'alignement est à gauche, on prend
     * l'objet qui a le left le plus petit et on l'applique aux autres
     */
    if ( align == 'cancel') {
      /*
      |  On désactive le menu pour ne pas pouvoir annuler deux fois
      */
      this.setStateCancelMenu(false)      
    } else {
      this.refAlignValue = null
      /*
      |  Récupération de la valeur de référence
      */
      AObjet.eachSelection(this.getRefValue.bind(this, align))
      // Enabled le menu annuler
      this.setStateCancelMenu(true)
    }
    var methodOpe ;
    switch(align){
      case 'cancel':
        methodOpe = function(aob){
          ['left','right','top','bottom'].forEach( aprop => {
            const old_prop = 'old_' + aprop;
            if ( aob[old_prop] ) aob[aprop] = aob[old_prop]
          })
        }
        break
      case 'center','middle':
        break
      default:
        methodOpe = function(aob){ 
          const old_prop = 'old_' + align;
          aob[old_prop] = 0 + aob[align] // pour annulation
          aob[align] = AlignMenu.refAlignValue 
        }
    }
    AObjet.eachSelection(methodOpe)

  }

  /* --- Public Methods --- */

  static setStateBySelection(count){
    this.setAllMenuAlignment(count > 1)
  }

  /* --- Fonctional Methods --- */

  static getRefValue(prop, aob){
    const my = AlignMenu
    if ( my.refAlignValue != null ) {
      if ( prop == 'left' || prop == 'top' ) {
        if ( aob[prop] < my.refAlignValue ) my.refAlignValue = aob[prop]
      } else {
        if ( aob[prop] > my.refAlignValue ) my.refAlignValue = aob[prop]
      }
    } else {
      my.refAlignValue = aob[prop]      
    }
  }

  static setAllMenuAlignment(state){
    for(var i = 1; i < 5; ++i){
      this.menu.options[i].disabled = not(state)
    }
  }

  static setStateCancelMenu(state){
    this.cancelMenu.disabled = not(state)
  }

  /* --- HTML Elements  */

  static get cancelMenu(){
    return this._cancelmenu || (this._cancelmenu = DGet('option[value="cancel"]', this.menu))
  }
}
