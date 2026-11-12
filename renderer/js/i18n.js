/**
 * Localisation côté renderer (cf. main/i18n.js) : les textes sont
 * fournis par le processus principal au chargement (preload.cjs).
 *
 *    t('ui.menu.file')
 *    t('messages.exported_html', {path})   // %{path}
 *
 * Dans index.html, les éléments portant data-i18n (texte),
 * data-i18n-placeholder ou data-i18n-title reçoivent leur texte au
 * chargement (localizeDocument).
 */
const DATA     = (window.api && window.api.locale) || {}
const PLATFORM = (window.api && window.api.platform) || 'linux'
// Touche de commande du système, pour %{cmd}
const CMD      = PLATFORM == 'darwin' ? '⌘' : 'Ctrl+'

/**
 * Un texte propre à chaque système est une table {darwin, win32, linux}.
 */
export function t(key, params){
  let value = key.split('.').reduce((node, k) => (node == null ? undefined : node[k]), DATA)
  if ( value === undefined ) return key
  if ( value && typeof value == 'object' && 'darwin' in value ) value = value[PLATFORM] || value.linux
  if ( typeof value != 'string' ) return value
  params = Object.assign({cmd: CMD}, params)
  return value.replace(/%\{(\w+)\}/g, (m, name) => (name in params ? params[name] : m))
}

// Remplace ⌘ par la touche de commande du système
export function cmdText(str){
  return CMD == '⌘' ? str : str.replace(/⌘\s?/g, CMD)
}

export function localizeDocument(root = document){
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = (el.dataset.i18nPrefix || '') + t(el.dataset.i18n)
  })
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder))
  root.querySelectorAll('[data-i18n-title]').forEach(el => el.title = t(el.dataset.i18nTitle))
}
