/**
 * Analyse courante, accessible sans dépendre de la classe Analyse.
 */
// forceAutosave : sauvegarde automatique activée le temps d'un partage
// (cf. Partage.js), sans toucher à la préférence de l'analyse
export const Current = {analyse: null, forceAutosave: false}

export function setModified(){
  Current.analyse && Current.analyse.setModified()
}
