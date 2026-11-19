import { DGet } from './dom.js'
import { not } from './lib/common.js'
import { MenusTool } from './MenusTool.js'
import { AObjet } from './AObjet.js'
import { AMark_Editor } from './AMark_Editor.js'
import { setModified } from './Current.js'
import { on } from './events.js'
import { t } from './i18n.js'
import { toggleCoordinates } from './handies.js'
import { DCreate } from './dom.js'
import { AMARQUES_TYPES } from './Constants.js'
import { Groups } from './Groups.js'
import { Liaison } from './Liaison.js'

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
    // Groupes (cf. Groups.js)
    const sel = this.selection
    DGet('option[value="group"]', this.menu).disabled      = !Groups.canGroup(sel)
    DGet('option[value="ungroup"]', this.menu).disabled    = !Groups.canUngroup(sel)
    DGet('option[value="addToGroup"]', this.menu).disabled = !Groups.canAddToGroup(sel)
    // Liaisons (cf. Liaison.js)
    DGet('option[value="link"]', this.menu).disabled   = !Liaison.canLink(sel)
    DGet('option[value="unlink"]', this.menu).disabled = !Liaison.linkOf(sel)
  }

  static onActivate_link(){
    Liaison.link(this.selection)
    this.setAllMenus(this.selection.length > 0)
  }
  static onActivate_unlink(){
    Liaison.unlink(this.selection)
  }

  static onActivate_group(){
    Groups.group(this.selection)
    this.setAllMenus(this.selection.length > 0)
  }
  static onActivate_ungroup(){
    Groups.ungroup(this.selection)
    this.setAllMenus(this.selection.length > 0)
  }
  static onActivate_addToGroup(){
    Groups.addToGroup(this.selection)
    // La sélection devient le groupe entier
    const first = this.selection[0]
    first && AObjet.addToSelection(first)
    this.setAllMenus(this.selection.length > 0)
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



  /* --- Functional Methods --- */

  static boucle(methode){
    AObjet.eachSelection(methode)
    setModified()
  }

  static onTypeChosen(data){
    this.boucle(tag => tag.changeType && tag.changeType(data.type, data.subtype))
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

/**
 * Sous-menu « Marque > Bloquer le type à… » : type des marques créées
 * (cf. AMark_Editor.lockedType), « Aucun » par défaut. Un seul type
 * coché.
 */
export class LockTypeMenu extends MenusTool {

  static init(){
    this.menu.appendChild(DCreate('OPTION', {value: 'none', text: t('ui.lock_type_menu.none')}))
    this.menu.appendChild(DCreate('OPTION'))
    Object.values(AMARQUES_TYPES).forEach(d => this.menu.appendChild(DCreate('OPTION', {value: d.value, text: d.name})))
    super.init()
    this.check('none')
  }

  static onActivate(e, value){
    AMark_Editor.lockedType = value == 'none' ? null : value
    this.check(value)
  }

  static check(value){
    Array.from(this.menu.options).forEach((o, i) => i && o.value && (o.dataset.checked = o.value == value ? 'true' : 'false'))
  }
}

/**
 * Sous-menu « Marque > Suggestions » : présentation des valeurs déjà
 * utilisées à la création d'une marque (cf. AMark_Editor.suggestMode).
 * Un seul choix coché.
 */
export class SuggestMenu extends MenusTool {

  static init(){
    super.init()
    this.check(AMark_Editor.suggestMode)
  }

  static onActivate(e, value){
    AMark_Editor.suggestMode = value
    this.check(value)
  }

  static check(value){
    Array.from(this.menu.options).forEach((o, i) => i && (o.dataset.checked = o.value == value ? 'true' : 'false'))
  }
}

/**
 * Sous-menu « Marque > Aligner le texte » : au centre, à droite, à
 * gauche, justifié (texte des marques sélectionnées)
 */
export class TextAlignMenu extends MenusTool {

  static init(){
    super.init()
    this.setState(false)
    on('selection:changed', ({selection}) => this.setState(selection.length > 0))
  }

  static setState(state){
    Array.from(this.menu.options).forEach((option, i) => i && (option.disabled = !state))
  }

  static onActivate(e, align){
    AmarkMenu.applyStyleText(align)
  }
}
