/**
 * Notation des notes des accords : batave (lettres) / italienne (noms)
 * ----------------------------------------------------------------------
 * Les accords sont TOUJOURS enregistrés en notation batave. L'affichage
 * en italien est fait par la police (PhilNote7-it), sans toucher au texte.
 *
 * Module pur (aucune dépendance) :
 *   - toBatave(str, {doIsC})   entrée italienne → batave
 *   - toItalian(str, {doIsC})  batave → italienne (champ d'édition)
 *   - noteInTextRegex, bataveOf  notes d’un texte libre (caractère de note)
 *
 * Une note n'est reconnue qu'en début de marque, après une espace, une
 * barre oblique ou une parenthèse ouvrante, et seulement suivie d'un
 * élément de chiffrage (- + = m M o ° ø / * chiffre ( ) ]), d'une espace
 * ou de la fin. « mineur » ne contient donc pas de « mi », ni « Lamento »
 * de « la ».
 *
 * Avant « / » : note de l'accord, toujours en capitale (« sol7 » → « G7 »).
 * Après « / » : la casse est gardée (« sol/mi » → « G/e », « Sol/Mi » →
 * « G/E »).
 *
 * « Do » est ambigu : en batave, c'est Ré suivi de « o ». +doIsC+ (vrai
 * en entrée italienne) décide : vrai → « Do » = C, faux → « Do » laissé
 * tel quel (et, dans l'autre sens, « C » n'est pas converti, pour qu'il
 * revienne identique).
 *
 * Texte libre : « La » et « Si » en début de phrase ne sont jamais des
 * notes.
 */

const BEFORE = '(^|[\\s/(])'
// « m » (mineur) seulement suivi d'autre chose qu'une lettre, ou de « aj »
// (maj) : « Lamento » n'est pas un accord
const AFTER  = '(?=$|[\\s\\-+=Mo°ø/*()\\]0-9]|m(?:aj|(?![a-zé])))'

const IT_TO_BAT = {do: 'C', 'ré': 'D', re: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', si: 'B'}
const BAT_TO_IT = {C: 'Do', D: 'Ré', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si'}

// Noms en toute casse (classes de caractères : le chiffrage qui suit,
// lui, distingue « m » de « M »)
const ci = w => [...w].map(c => c == 'é' ? '[éÉ]' : `[${c}${c.toUpperCase()}]`).join('')
const NAMES = ['sol', 'do', 'ré', 're', 'mi', 'fa', 'la', 'si'].map(ci).join('|')
const RE_ITALIAN = new RegExp(`${BEFORE}(${NAMES})${AFTER}`, 'gu')
const RE_BATAVE  = new RegExp(`${BEFORE}([A-Ga-g])${AFTER}`, 'gu')

export function toBatave(str, {doIsC = true} = {}){
  if ( !str ) return str
  return String(str).replace(RE_ITALIAN, (all, before, name) => {
    const low = name.toLowerCase()
    if ( low == 'do' && !doIsC ) return all
    const letter = IT_TO_BAT[low]
    const lower  = before == '/' && name == low
    return before + (lower ? letter.toLowerCase() : letter)
  })
}

export function toItalian(str, {doIsC = true} = {}){
  if ( !str ) return str
  return String(str).replace(RE_BATAVE, (all, before, letter) => {
    const up = letter.toUpperCase()
    if ( up == 'C' && !doIsC ) return all
    const isLower = letter != up
    // Minuscule en tête : note (et non accord) en batave, laissée telle quelle
    if ( isLower && before != '/' ) return all
    const name = BAT_TO_IT[up]
    return before + (isLower ? name.toLowerCase() : name)
  })
}

/**
 * Note dans un texte libre (#250) : SEULEMENT précédée du caractère de
 * note (préférence note_char : « _ » par défaut, « : », « ! », « ^ »),
 * lettre (capitale ou minuscule) ou nom italien, puis chiffrage
 * éventuel : « _A », « _a7 », « _Sol », « _Fa+m7 ». Groupes : 1 nom
 * italien, 2 lettre, 3 altération/mode, 4 chiffrage
 */
export const NOTE_CHARS = ['_', ':', '!', '^']
export function noteInTextRegex(char = '_'){
  const c = String(char || '_').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // (ni après une lettre, un chiffre ou « _ » : « x_A », « __RET__A » ;
  // ni suivie du caractère : « _A_ » souligné, « 2^e^ » exposant)
  return new RegExp(`(?<![\\p{L}\\p{N}_])${c}(?:(Sol|Do|Ré|Re|Mi|Fa|La|Si|sol|do|ré|re|mi|fa|la|si)|([A-Ha-h]))([\\-\\+=]?m?)(\\+?[24579][\\-\\+]?)?(?![\\p{L}\\p{N}]|${c})`, 'gu')
}
export function bataveOf(italianName){
  return IT_TO_BAT[italianName.toLowerCase()]
}
