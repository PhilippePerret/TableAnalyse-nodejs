/**
 * Analyse courante, accessible sans dépendre de la classe Analyse.
 */
// forceAutosave : sauvegarde automatique activée le temps d'un partage
// (cf. Partage.js), sans toucher à la préférence de l'analyse
// sidebar : largeur (px) de la barre latérale du partage (cf. Partage.js)
export const Current = {analyse: null, forceAutosave: false, sidebar: 0}

export function setModified(){
  Current.analyse && Current.analyse.setModified()
}
