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

export function onKeypressOnAnalyse(e){

  switch(e.key){

    case 'I':
      Analyse.panneau_infos.toggle()
      break

    case 'M':
      Manuel.toggle()
      break

    case 'O':
      Tools.toggle()
      break
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
    // Édition de la marque, seulement si elle est seule sélectionnée
    const sel = AObjet.selection
    if ( sel && sel.length == 1 && sel[0] instanceof AMark ) {
      sel[0].edit()
      return stopEvent(e)
    }
  }
}

export function onKeyUpOnAnalyse(e){
  switch(e.key){
    case 'Backspace':
      AObjet.removeCurrentSelection()
      break
  }
}

/**
* Quelle que soit la situation, ce gestionnaire de Key-down est
* appelé.
* Il doit absolument retourne null s'il n'a rien faire et true ou
* false dans l'autre cas, pour retourner cette valeur.
*/
export function onKeyDownUniversel(e){

  if ( cmdKey(e) ) {
    switch(e.key.toLowerCase()) {
      case 's':
        Analyse.current && AnalyseSaver.save()
        return stopEvent(e)
      case 'z':
        if (e.shiftKey) {
          return Cancel.unzLast(e)
        } else {
          return Cancel.zLast(e)
        }
    }
  }

  return null;
}
