/**
 * Notation des notes des accords : batave (lettres) / italienne (noms)
 * ----------------------------------------------------------------------
 * Les accords sont TOUJOURS enregistrés en notation batave. L'affichage
 * en italien est fait par la police (PhilNote7-it), sans toucher au texte.
 *
 * Module pur (aucune dépendance) :
 *   - toBatave(str, {doIsC})   entrée italienne → batave
 *   - toItalian(str, {doIsC})  batave → italienne (champ d'édition)
 *   - TEXT_ITALIAN_NOTES, bataveOf  notes italiennes d’un texte libre
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

// Notes italiennes d'un texte libre, sous leur forme exacte (capitale puis
// minuscules : « Sol », pas « sol » ni « SOL ») : {name, letter} par nom
export const TEXT_ITALIAN_NOTES = /(?<![\p{L}\p{N}])((?<!(?:^|[.!?…«"]\s*|__RET__\s*))(?:La|Si)|Sol|Do|Ré|Re|Mi|Fa)([\-\+=]?m?)(\+?[24579][\-\+]?)?(?=[\s.,;:!?)]|$)/gu
export function bataveOf(italianName){
  return IT_TO_BAT[italianName.toLowerCase()]
}
