import { DGet } from './dom.js'
import { not } from './lib/common.js'
import { MenusTool } from './MenusTool.js'
import { Cancel } from './CancelManager.js'
import { Current } from './Current.js'
import { Grid } from './Grid.js'
import { UI } from './UI.js'
import { Themes } from './Themes.js'
import { Systeme } from './Systeme.js'
import { on } from './events.js'
/**

  Class OptionsTool
  -----------------
  Gestion du menu "Options"

*/
export class OptionsTool extends MenusTool {

  static init(){
    super.init()
    Cancel.zMenu = DGet('option[value="cancel"]', this.menu)
    on('systems:locked', ({locked}) => this.setLockSystemsMenu(locked))
  }

  // Coche du menu « Verrouiller les systèmes »
  static setLockSystemsMenu(locked){
    DGet('option[value="toggleLockSystems"]', this.menu).textContent = `${locked ? '✓ ' : ''}Verrouiller les systèmes`
  }


  /* --- Gestionnaires d'évènement menu ---  */

  static onActivate_toggleColor(e, option){
    var colorMode = not(option.dataset.checked == 'true')
    Current.analyse && Current.analyse.toggleModeColor(colorMode)
    option.dataset.checked = colorMode ? 'true' : 'false'
  }

  static onActivate_toggleGrid(e, option){
    /**
     ** Appelée quand on active ou désactive le menu d'alignement
     ** sur la grille. 
    **/
    var modeON = not(option.dataset.checked == 'true')
    Grid.toggleGridMode(modeON)
    option.dataset.checked = modeON ? 'true' : 'false'
    UI.toggleGridDisplay(modeON)
  }

  static onActivate_toggleLockSystems(){
    Systeme.toggleLock()
  }

  static onActivate_theme(e, option){
    Themes.apply(option.dataset.theme)
  }

  static onActivate_cancel(e, option){
    Cancel.zLast(e)
  }
  static onActivate_cancelInList(e, option) {
    Cancel.zInList(e)
  }
  /**
  * Appelée après chaque choix de menu, cette méthode permet
  * de changer le nom pour activer ou désactiver l'option.
  */
  static afterActivate(e, option){
    if ( option.dataset.role != 'cb' ) return
    var text = option.innerHTML
    text = text.substring(1, text.length)
    text = (option.dataset.checked == 'true' ? '☒' : '☐') + text
    option.innerHTML = text
  }
}
