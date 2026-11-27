/**
* Voir la classe UI qui définit ces raccourcis.
*/
import { cmdKey, stopEvent } from './dom.js'
import { Cancel } from './CancelManager.js'
import { AObjet } from './AObjet.js'
import { AMark } from './AMark.js'
import { Analyse } from './Analyse.js'
import { AnalyseSaver } from './AnalyseSaver.js'
import { Manuel } from './Manuel.js'
import { Tools } from './Tools.js'
import { MarksClipboard } from './MarksClipboard.js'
import { Groups } from './Groups.js'
import { Split } from './Split.js'
import { Liaison } from './Liaison.js'
import { onRelease, isCleanRelease } from './KeyRelease.js'

// Saisie en cours dans un champ (panneaux) : touches laissées au champ
export function inTextField(e){
  const el = e.target
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export function onKeypressOnAnalyse(e){

  if ( inTextField(e) ) return

  switch(e.key){

    case 'M':
      return onRelease(e, () => Manuel.toggle())

    case 'O':
      return onRelease(e, () => Tools.toggle())
  }
}

export function onKeyDownOnAnalyse(e){

  const returnU = onKeyDownUniversel(e)

  //
  // Si la combinaison a été traitée par le gestionnaire
  // universel
  //
  if ( returnU === true || returnU === false) {
    return returnU
  }

  if ( inTextField(e) ) return

  // Copier, couper, coller des marques (cf. MarksClipboard)
  if ( cmdKey(e) && !e.shiftKey && !e.altKey ) {
    const ope = {c: 'copy', x: 'cut', v: 'paste'}[e.key.toLowerCase()]
    if ( ope ) return onRelease(e, () => MarksClipboard[ope]())
  }

  switch(e.key){
  case 'ArrowRight':
  case 'ArrowLeft':
  case 'ArrowDown':
  case 'ArrowUp':
    const sens      = e.key.replace(/^Arrow/,'').toLowerCase()
    const multi     = e.shiftKey  ? 10 : 1
    const precision = e.altKey    ? 1  : 4
    AMark.moveSelection(sens,multi,precision)
    return stopEvent(e)
  case 'Enter':
    // Bouton sélectionné (Tab) : Entrée le joue
    if ( e.target instanceof Element && e.target.closest('button') ) return
    // Liaison sélectionnée : son édition
    if ( Liaison.selected ) {
      const liaison = Liaison.selected
      return onRelease(e, () => liaison.edit())
    }
    // Édition de la marque, seulement si elle est seule sélectionnée
    const sel = AObjet.selection
    // (marque verrouillée : édition seulement par son menu contextuel)
    if ( sel && sel.length == 1 && sel[0] instanceof AMark && !sel[0].isLocked ) {
      const mark = sel[0]
      return onRelease(e, () => mark.edit())
    }
  }
}

/**
 * Touche Escape (au relâchement) : fermeture des boites ouvertes sans
 * rien faire (comme leur croix) et désélection de toutes les marques.
 * Une liste de choix ouverte se ferme seule (cf. GetterInList).
 */
export function onEscapeKey(e){
  if ( e.key != 'Escape' || !isCleanRelease(e) ) return
  if ( document.querySelector('div.container_getter_in_list:not(.hidden)') ) return
  document.querySelectorAll('.panneau-ui').forEach(box => {
    if ( !box.getClientRects().length ) return // boite fermée
    const close = box.querySelector(':scope > div.panneau-head span.panneau-close')
    close && close.click()
  })
  AObjet.deselectAll()
}

export function onKeyUpOnAnalyse(e){
  if ( inTextField(e) || !isCleanRelease(e) ) return
  switch(e.key){
    case 'Backspace':
    case 'Delete':
      // Liaison sélectionnée : supprimée seule
      Liaison.selected ? Liaison.selected.remove() : AObjet.removeCurrentSelection()
      break
  }
}

// Scinder la fenêtre : caractère « / », soit ⌘ + Maj + « : » sur le
// clavier français (avec ⌘, la touche peut arriver sans l'effet de
// Maj : « : »). Le raccourci du menu, lui, répondait à ⌘ + « : ».
export function isSplitShortcut(e){
  return cmdKey(e) && (e.key == '/' || e.shiftKey && e.key == ':')
}

/**
* Quelle que soit la situation, ce gestionnaire de Key-down est
* appelé.
* Il doit absolument retourne null s'il n'a rien faire et true ou
* false dans l'autre cas, pour retourner cette valeur.
*/
export function onKeyDownUniversel(e){

  if ( isSplitShortcut(e) ) {
    return onRelease(e, () => Analyse.current && Split.toggle())
  }

  if ( cmdKey(e) ) {
    switch(e.key.toLowerCase()) {
      case 's':
        return onRelease(e, () => Analyse.current && AnalyseSaver.save())
      case 'z':
        // Dans un champ : annulation de la saisie (celle du système)
        if ( inTextField(e) ) return null
        return onRelease(e, () => e.shiftKey ? Cancel.unzLast(e) : Cancel.zLast(e))
      case 'g':
        // Grouper (Maj : dégrouper) les marques sélectionnées
        if ( inTextField(e) || !AObjet.selection ) return null
        return onRelease(e, () => {
          if ( !AObjet.selection ) return
          e.shiftKey ? Groups.ungroup(AObjet.selection) : Groups.group(AObjet.selection)
          AObjet.setMenusState()
        })
    }
  }

  return null;
}
