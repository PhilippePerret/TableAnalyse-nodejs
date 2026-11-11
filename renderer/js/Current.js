/**
 * Analyse courante, accessible sans dépendre de la classe Analyse.
 */
export const Current = {analyse: null}

export function setModified(){
  Current.analyse && Current.analyse.setModified()
}
