/**
 * Localisation : textes de l'interface, messages et erreurs, dans
 * locales/<langue>/ (ui.yaml, messages.yaml, errors.yaml).
 *
 *    t('ui.menu.file')
 *    t('errors.creation.folder_not_found', {folder})   // %{folder}
 *
 * La langue est celle des préférences de l'application (`lang`, menu
 * « Langue »), sinon celle du système si elle est traduite, sinon le
 * français. Un texte absent d'une langue est pris en français. Le
 * renderer reçoit les mêmes données (cf. preload.cjs et
 * renderer/js/i18n.js).
 */
import fs from 'node:fs'
import path from 'node:path'
import * as YAML from 'js-yaml'
import { app } from 'electron'
import { AppPrefs } from './AppPrefs.js'
import { APP_FOLDER } from './paths.js'

const FILES = ['ui', 'messages', 'errors']
const DEFAULT_LANG = 'fr'
// Langues de l'application et leur nom (dans la langue elle-même)
export const LANGUAGES = {
    fr: 'Français'
  , en: 'English'
  , de: 'Deutsch'
  , it: 'Italiano'
  , es: 'Español'
  , zh: '中文'
  , ja: '日本語'
  , ko: '한국어'
}
let data = null

// Langue du système si elle est traduite
function systemLang(){
  const langs = app.isReady() ? app.getPreferredSystemLanguages() : []
  for ( const l of langs ) {
    const code = l.slice(0, 2).toLowerCase()
    if ( LANGUAGES[code] ) return code
  }
  return DEFAULT_LANG
}

export function currentLang(){
  const lang = AppPrefs.get('lang')
  return LANGUAGES[lang] ? lang : systemLang()
}

function loadLang(lang){
  const res = {}
  FILES.forEach(name => {
    const file = path.join(APP_FOLDER, 'locales', lang, `${name}.yaml`)
    res[name] = fs.existsSync(file) ? (YAML.load(fs.readFileSync(file, 'utf8')) || {}) : {}
  })
  return res
}

// +over+ fondu dans +base+ (les textes de +over+ l'emportent)
function deepMerge(base, over){
  const res = Object.assign({}, base)
  Object.entries(over || {}).forEach(([k, v]) => {
    res[k] = (v && typeof v == 'object' && !Array.isArray(v) && base && typeof base[k] == 'object') ? deepMerge(base[k], v) : v
  })
  return res
}

export function locale(){
  if ( !data ) {
    const lang = currentLang()
    const res = lang == DEFAULT_LANG ? loadLang(DEFAULT_LANG) : deepMerge(loadLang(DEFAULT_LANG), loadLang(lang))
    // Avant que l'application soit prête, la langue du système n'est
    // pas connue : pas de mise en cache
    if ( !app.isReady() && !LANGUAGES[AppPrefs.get('lang')] ) return res
    data = res
  }
  return data
}

// Touche de commande du système, pour %{cmd}
const CMD = process.platform == 'darwin' ? '⌘' : 'Ctrl+'

/**
 * @return le texte (ou la table de textes) de clé +key+, avec les
 * variables %{nom} remplacées par +params+.nom (et %{cmd}). Un texte
 * propre à chaque système est une table {darwin, win32, linux}. La clé
 * elle-même si elle est introuvable.
 */
export function t(key, params){
  let value = key.split('.').reduce((node, k) => (node == null ? undefined : node[k]), locale())
  if ( value === undefined ) return key
  if ( value && typeof value == 'object' && 'darwin' in value ) value = value[process.platform] || value.linux
  if ( typeof value != 'string' ) return value
  params = Object.assign({cmd: CMD}, params)
  return value.replace(/%\{(\w+)\}/g, (m, name) => (name in params ? params[name] : m))
}
