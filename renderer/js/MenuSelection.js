import { MenusTool } from './MenusTool.js'
import { AObjet } from './AObjet.js'
import { MarksSelector } from './MarksSelector.js'
/**

  class SelectionTool
  -------------------
  Classe associée au menu "Sélection" du pied de page

  POUR AJOUTER UN OUTIL
  ---------------------
    - créer son <option> dans le menu #selection_tool (barre de menus, 
      index.html)
    - lui donner une @value adéquate
    - créer la méthode statique SelectionTool::onActivate_<@value> 
      pour définir ce que doit faire l'outil.

**/
export class SelectionTool extends MenusTool {

  static init(){
    super.init()
  }

  /* --- Gestionnaires d'évènements --- */

  static onActivate_selectAll(){
    MarksSelector.show()
  }

}
