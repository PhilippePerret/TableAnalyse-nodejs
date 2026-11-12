/**
 * Localisation : textes de l'interface, messages et erreurs, dans
 * locales/<langue>/ (ui.yaml, messages.yaml, errors.yaml).
 *
 *    t('ui.menu.file')
 *    t('errors.creation.folder_not_found', {folder})   // %{folder}
 *
 * La langue est celle des préférences de l'application (`lang`,
 * français par défaut). Le renderer reçoit les mêmes données (cf.
 * preload.cjs et renderer/js/i18n.js).
 */
import fs from 'node:fs'
import path from 'node:path'
import * as YAML from 'js-yaml'
import { AppPrefs } from './AppPrefs.js'
import { APP_FOLDER } from './paths.js'

const FILES = ['ui', 'messages', 'errors']
let data = null

export function locale(){
  if ( !data ) {
    const lang = AppPrefs.get('lang') || 'fr'
    data = {}
    FILES.forEach(name => {
      const file = path.join(APP_FOLDER, 'locales', lang, `${name}.yaml`)
      data[name] = fs.existsSync(file) ? (YAML.load(fs.readFileSync(file, 'utf8')) || {}) : {}
    })
  }
  return data
}

/**
 * @return le texte (ou la table de textes) de clé +key+, avec les
 * variables %{nom} remplacées par +params+.nom. La clé elle-même si
 * elle est introuvable.
 */
export function t(key, params){
  const value = key.split('.').reduce((node, k) => (node == null ? undefined : node[k]), locale())
  if ( value === undefined ) return key
  if ( typeof value != 'string' || !params ) return value
  return value.replace(/%\{(\w+)\}/g, (m, name) => (name in params ? params[name] : m))
}
