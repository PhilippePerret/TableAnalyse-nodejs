/**
 * Exposants dans les textes de l'utilisateur (#236)
 * -------------------------------------------------
 *   « 1^er^ », « 2^e^ », « XIX^e^ »  → 1<sup>er</sup>…
 *   (ancienne écriture, sans « ^ » de fin : « 1^er », « 2^e », « 2^de »)
 *
 * supize(html)   : texte DÉJÀ ÉCHAPPÉ (HTML) → exposants en <sup>
 * plainSup(str)  : texte brut sans les « ^ » (titres de fenêtre, options
 *                  de menu, infobulles : pas de HTML possible)
 *
 * Jamais dans les champs d'édition, où le texte reste tel qu'il est tapé.
 * Module pur (aucune dépendance).
 */
const MODERN = /\^([^\^\n<>]+?)\^/g
const LEGACY = /\^(de|nde|te|re|er|e)(?![\p{L}\p{N}])/gu

export function supize(html){
  if ( null == html ) return html
  return String(html).replace(MODERN, '<sup>$1</sup>').replace(LEGACY, '<sup>$1</sup>')
}

export function plainSup(str){
  if ( null == str ) return str
  return String(str).replace(MODERN, '$1').replace(LEGACY, '$1')
}
