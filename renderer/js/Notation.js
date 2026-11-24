/**
 * Notation des accords (préférences de l'analyse)
 * -----------------------------------------------
 *   notation_display : 'bat' | 'it' | 'us'  police des marques (PhilNote,
 *                      PhilNoteIt, PhilNoteUs : notation américaine, lettres)
 *   notation_input   : 'bat' | 'it'  notation de l'entrée (« Do » = C seulement
 *                                    en entrée italienne) et remise dans le champ
 *
 * Les accords (marques accord, modulation, emprunt) sont toujours
 * enregistrés en batave : conversion des noms italiens à la validation,
 * quelle que soit l'entrée, et, en entrée italienne, retour en italien
 * dans le champ d'édition. Cf. lib/notation.js.
 */
import { pref } from './Preferences.js'
import { toBatave, toItalian } from './lib/notation.js'

export const NOTATION_TYPES = ['acc', 'mod', 'emp']

const FONT_VAR = '--philnote-font'
const FONTS    = {bat: 'PhilNote', it: 'PhilNoteIt', us: 'PhilNoteUs'}

export function isDisplayItalian(){ return pref('notation_display') == 'it' }
export function isInputItalian(){ return pref('notation_input') == 'it' }

const converted = type => NOTATION_TYPES.includes(type)

// Valeur saisie (type +type+) → valeur enregistrée (batave)
export function contentFromField(type, value){
  if ( !converted(type) ) return value
  return toBatave(value, {doIsC: isInputItalian()})
}

// Valeur enregistrée → valeur du champ d'édition
export function contentForField(type, content){
  if ( !converted(type) || !isInputItalian() ) return content
  return toItalian(content)
}

// Valeur déjà utilisée choisie dans les suggestions : mise dans le champ
// sous une forme qui, validée, redonne exactement la valeur enregistrée
export function suggestionForField(type, content){
  if ( !converted(type) ) return content
  return toItalian(content, {doIsC: isInputItalian()})
}

// Police des marques suivant la notation d'affichage (code CSS ajouté aux
// styles des préférences : application et exports HTML/PDF)
export function notationCss(){
  return `:root { ${FONT_VAR}: ${FONTS[pref('notation_display')] || FONTS.bat}; }`
}
