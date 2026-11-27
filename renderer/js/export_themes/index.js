/**
 * Thèmes de la sortie de l'analyse (export PDF, SVG), #255
 * --------------------------------------------------------
 * Un fichier par thème (export_themes/<id>.js), qui définit ses STYLES
 * nommés (valeurs CSS, en px de la table) :
 *   title1       Titre de premier niveau (titre de la nomenclature)
 *   legend       bloc de la nomenclature
 *   rule         filet sous le titre (facultatif)
 *   items        conteneur des lignes (disposition « list », « columns »)
 *   item         ligne : signe | description
 *   sign         cellule du signe
 *   description  cellule de la description
 *   table, th, td  disposition « table » (th : seulement si header)
 *   signShape    retouche de l'ovale du signe (facultatif)
 * et sa disposition (layout) : 'list', 'columns' ou 'table'.
 * Aucune couleur dans les thèmes (pour le moment) : noir, gris.
 */
import sansStyle from './sans-style.js'
import sobre from './sobre.js'
import filets from './filets.js'
import cadre from './cadre.js'
import classique from './classique.js'
import tableau from './tableau.js'

export const EXPORT_THEMES = [sansStyle, sobre, filets, cadre, classique, tableau]
export const DEFAULT_EXPORT_THEME = 'classique'

export function exportTheme(id){
  return EXPORT_THEMES.find(th => th.id == id) || EXPORT_THEMES.find(th => th.id == DEFAULT_EXPORT_THEME)
}
