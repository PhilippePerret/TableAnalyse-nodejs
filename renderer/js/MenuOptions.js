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
import { t } from './i18n.js'
import { toggleCoordinates } from './handies.js'
import { Forme } from './Forme.js'
import { Split } from './Split.js'
import { Preferences, pref } from './Preferences.js'
/**

  Class OptionsTool
  -----------------
  Gestion du menu "Options"

*/
export class OptionsTool extends MenusTool {

  static init(){
    super.init()
    Cancel.zMenu = DGet('option[value="cancel"]', this.menu)
    Cancel.defineZMenu()
    on('systems:locked', ({locked}) => this.setLockSystemsMenu(locked))
    on('systems:loaded', () => this.setLockMeasuresMenu(!!pref('lock_measures')))
  }

  // Coche du menu « Verrouiller les systèmes »
  static setLockSystemsMenu(locked){
    DGet('option[value="toggleLockSystems"]', this.menu).dataset.checked = locked ? 'true' : 'false'
  }


  // Coche du menu « Verrouiller les numéros de mesure » (#295)
  static setLockMeasuresMenu(locked){
    DGet('option[value="toggleLockMeasures"]', this.menu).dataset.checked = locked ? 'true' : 'false'
  }

  /* --- Gestionnaires d'évènement menu ---  */

  static onActivate_toggleColor(e, option){
    var colorMode = not(option.dataset.checked == 'true')
    Current.analyse && Current.analyse.toggleModeColor(colorMode)
    option.dataset.checked = colorMode ? 'true' : 'false'
  }

  static onActivate_toggleGridV(e, option){ this.toggleGrid('vertical', option) }
  static onActivate_toggleGridH(e, option){ this.toggleGrid('horizontal', option) }

  /**
   * Magnétisme vertical ou horizontal (+dir+) activé ou désactivé, avec
   * l'affichage des lignes correspondantes de la grille
   */
  static toggleGrid(dir, option){
    var modeON = not(option.dataset.checked == 'true')
    Grid.toggleGridMode(dir, modeON)
    option.dataset.checked = modeON ? 'true' : 'false'
    UI.toggleGridDisplay()
  }

  static onActivate_toggleCoordinates(){
    toggleCoordinates()
  }

  static onActivate_toggleSplit(){
    Split.toggle()
  }

  static onActivate_toggleFormNames(e, option){
    Forme.show(option.dataset.checked != 'true')
  }

  static onActivate_toggleLockMeasures(e, option){
    const locked = option.dataset.checked != 'true'
    Systeme.lockMeasures(locked)
    this.setLockMeasuresMenu(locked)
  }

  static onActivate_toggleLockSystems(){
    Systeme.toggleLock()
  }

  static onActivate_toggleAutosave(e, option){
    if ( !Current.analyse ) return
    Preferences.set('autosave', option.dataset.checked != 'true')
    Preferences.saveData('autosave', pref('autosave'))
    Current.analyse.savePreferences()
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
}
