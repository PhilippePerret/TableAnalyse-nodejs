import { DGet } from './dom.js'
import { not } from './lib/common.js'
import { message } from './lib/Message.js'
import { MenusTool } from './MenusTool.js'
import { AObjet } from './AObjet.js'
import { setModified } from './Current.js'
import { on } from './events.js'
import { t } from './i18n.js'
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
    this.toggleMenuGroupSelection(false)
    this.toggleMenuDegroupSelection(false)
    on('selection:changed', ({selection}) => this.updateBySelection(selection))
  }

  /**
   * Réglage des menus de groupement en fonction de la sélection
   */
  static updateBySelection(selection){
    const severalTags     = selection.length > 1
    var hasGroupedTags    = false
    var allTagsAreGrouped = false

    if ( severalTags ) {
      allTagsAreGrouped = true
      const firstTag = selection[0]
      selection.forEach(tag => {
        if ( tag.isGrouped ) { 
          hasGroupedTags = true
          if ( allTagsAreGrouped && not(firstTag.isGroupedWith(tag))) {
            allTagsAreGrouped = false
          }
        } else { allTagsAreGrouped = false }
      })
    }
    /*
    |  On ne peut grouper que plusieurs éléments qui ne sont pas déjà
    |  groupés, et dégrouper que des éléments groupés.
    */
    this.toggleMenuGroupSelection(severalTags && not(allTagsAreGrouped))
    this.toggleMenuDegroupSelection(severalTags && hasGroupedTags)
  }


  /* --- Gestionnaires d'évènements --- */

  static onActivate_groupSelection(){
    const firstTag = AObjet.selection[0]
    const len = AObjet.selection.length
    for ( var i = 1; i < len; i++ ) {
      const tag = AObjet.selection[i]
      if ( not(firstTag.isGroupedWith(tag)) ) {
        firstTag.groupWith(tag)
      }
    }
    console.info("Les tags ont été associés.")
  }

  static onActivate_degroupSelection(){
    AObjet.eachSelection(tag => {
      delete tag.grp
      tag.grp = null
    })
    setModified()
    console.info("Tous les objets sont dégroupés.")
  }

  static onActivate_selectAll(){
    message(t('messages.select_all_todo'))
  }

  /* --- Méthode concernant le groupement de tags --- */

  static toggleMenuGroupSelection(enabled = false){
    // Méthode publique permettant d'activer ou de désactiver le
    // choix "Grouper" (utilisé par la sélection)
    this.optionGroupSelection.disabled = not(enabled)
  }

  static toggleMenuDegroupSelection(enabled = false){
    this.optionDegroupSelection.disabled = not(enabled)
  }

  /* --- HTML Elements --- */

  static get optionGroupSelection(){
    return this._optgrpsel || (this._optgrpsel = DGet('option[value="groupSelection"]', this.menu))
  }

  static get optionDegroupSelection(){
    return this._optdegrpsel || (this._optdegrpsel = DGet('option[value="degroupSelection"]', this.menu))
  }

}
