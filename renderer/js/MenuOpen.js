import { MenusTool } from './MenusTool.js'
import { PreferencesPanel } from './PreferencesPanel.js'
import { Manuel } from './Manuel.js'
import { Analyse } from './Analyse.js'
import { Tools } from './Tools.js'
/**

  class OpenTool
  --------------
  Gestion du menu "Ouvrir"

*/
export class OpenMenu extends MenusTool {

  static onActivate_prefs(){
    PreferencesPanel.toggle()
  }

  static onActivate_manual(){
    Manuel.toggle.call(Manuel)
  }

  static onActivate_infosAnalyse(){
    Analyse.panneau_infos.toggle()
  }

  static onActivate_toolsPanel(){
    Tools.toggle()
  }

  static onActivate_exportToHTML(){
    Analyse.exportCurrentToHtml()
  }

  static onActivate_openAnalyse(){
    Analyse.openAnalyse()
  }

  static onActivate_newAnalyse(){
    Analyse.newAnalyse()
  }

}
