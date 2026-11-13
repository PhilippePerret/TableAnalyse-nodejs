import { DGet } from './dom.js'
import { not } from './lib/common.js'
import { MenusTool } from './MenusTool.js'
import { AObjet } from './AObjet.js'
import { AMark_Editor } from './AMark_Editor.js'
import { setModified } from './Current.js'
import { on } from './events.js'
import { t } from './i18n.js'
import { toggleCoordinates } from './handies.js'

export class AmarkMenu extends MenusTool {

  static init(){
    super.init()
    this.setAllMenus(false)
    on('selection:changed', ({selection}) => this.setAllMenus(selection.length > 0))
  }


  static setAllMenus(state){
    // Menu toujours actif : ses éléments sont (dés)activés un à un
    const nombreMenus = this.menu.options.length - 1
    for(var i = 1; i < nombreMenus ; ++i){
      const option = this.menu.options[i]
      option.disabled = not(state) && !option.dataset.always
    }
    /*
    |  Réglage du menu "Verrouiller/déverouiller"
    */
    var enableLock = true
    this.selection.forEach( tag => {
      if ( tag.isLocked ) enableLock = false
    })
    const many = this.selection.length > 1
    this.menuLock.innerHTML = t(`ui.mark_menu.${enableLock ? 'lock' : 'unlock'}_${many ? 'many' : 'one'}`)
    this.menuLock.dataset.ope = enableLock ? 'lock' : 'unlock'
  }

  static get selection(){ return AObjet.selection || []}

  /* --- OnActivate Methods --- */

  static onActivate_toggleCoordinates(){
    toggleCoordinates()
  }

  static onActivate_toogleLock(){
    /** Verrouiller ou déverrouiller les marques sélectionnées **/
    const ope = this.menuLock.dataset.ope
    this.boucle(tag => { tag[ope].call(tag) })
    this.setAllMenus(this.selection.length > 0)
  }

  static onActivate_changeType(e){
    // Le menu ne fournit pas de position : on place les listes de
    // choix au milieu de la fenêtre.
    const x = Math.round(window.innerWidth / 2), y = Math.round(window.innerHeight / 3)
    const dataEdit = {
        onReleaseMethod:  this.onTypeChosen.bind(this)
      , event:            {clientX: x, clientY: y, pageX: x + window.scrollX, pageY: y + window.scrollY}
      , onlyType:         true
    }
    const editor = new AMark_Editor(dataEdit)
    editor.proceed()
  }

  static onActivate_justifyText()     { this.applyStyleText('justify')  }
  static onActivate_alignTextLeft()   { this.applyStyleText('left')     }
  static onActivate_alignTextRight()  { this.applyStyleText('right')    }
  static onActivate_alignTextCenter() { this.applyStyleText('center')   }


  /* --- Functional Methods --- */

  static boucle(methode){
    AObjet.eachSelection(methode)
    setModified()
  }

  static onTypeChosen(data){
    this.boucle(tag => {
      tag.type    = data.type
      tag.subtype = data.subtype
    })
  }

  static applyStyleText(css) {
    /**
     ** Appliquer un alignement au texte
     **/
    this.boucle(tag => {
      if ( not(tag.spanContent) ) return
      else tag.changeTextAlignement(css)
    })
  }

  /* --- HTML Elements ---  */

  static get menuLock(){
    return DGet('option[value="toogleLock"]', this.menu)
  }
}
