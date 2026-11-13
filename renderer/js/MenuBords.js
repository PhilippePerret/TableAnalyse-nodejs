import { DGet } from './dom.js'
import { not } from './lib/common.js'
import { MenusTool } from './MenusTool.js'
import { AObjet } from './AObjet.js'
import { setModified } from './Current.js'
import { on } from './events.js'
/**

  Classe BordersTool
  ------------------

  Pour gérer le menu "Bords" du pied de page, qui permet d'affiner
  les bords des éléments qui en contiennent (les cadres, les seg-
  ments, etc.)

  Consulter la classe MenusTool pour voir comment fonctionne ce
  menu.

**/

export class BordersTool extends MenusTool {

  static init(){
    super.init()
    on('selection:changed', ({selection}) => this.setMenuBordsFor(selection[0]))
  }

  /* --- Gestionnaires d'<option>s --- */

  static onActivate_add(e){
    const action = 'add'
    this.modifyBorder('add')
  }
  static onActivate_remove(e){
    this.modifyBorder('remove')
  }

  /* --- Fonctional Methods --- */

  static modifyBorder(action){
    const classe = this.menu.options[this.menu.selectedIndex].dataset.css

    const selection = AObjet.selection || []
    if ( !selection.length ) return
    /*
    |  Ajout ou retrait de la classe de chaque marque sélectionnée et
    |  enregistrement dans ses données
    */
    selection.forEach(tag => {
      tag.obj.classList[action](classe)
      tag[action+"Css"](classe)
    })
    setModified()
    /*
    |  Actualisation du menu des bords (première marque)
    */
    this.setMenuBordsFor(selection[0])
  }

  /**
   * Méthode appelée par les méthodes AObjet@selection pour régler
   * les menus "Bords" en fonction du premier tag sélectionné
   * 
   **/
  static setMenuBordsFor(tag){
    if ( tag ) {
      const o = tag.obj ;
      ['left','right','top','bottom'].forEach( dir => {
        const classe = `no_${dir}_border`
        const optAdd = DGet('option[value="add"][data-css="'+classe+'"]', this.menu)
        const optRem = DGet('option[value="remove"][data-css="'+classe+'"]', this.menu)
        optAdd.disabled = o.classList.contains(classe)
        optRem.disabled = not(o.classList.contains(classe))
      })
      this.activate()
    } else {
      this.desactivate()
    }
  }

  /**
  * Appelée par exemple par AObjet quand il n'y a plus de sélection
  */
  static desactivate(){
    this.menu.disabled = true
  }
  static activate(){
    this.menu.disabled = false 
  }


}
