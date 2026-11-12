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
const DATA = (window.api && window.api.locale) || {}

export function t(key, params){
  const value = key.split('.').reduce((node, k) => (node == null ? undefined : node[k]), DATA)
  if ( value === undefined ) return key
  if ( typeof value != 'string' || !params ) return value
  return value.replace(/%\{(\w+)\}/g, (m, name) => (name in params ? params[name] : m))
}

export function localizeDocument(root = document){
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = (el.dataset.i18nPrefix || '') + t(el.dataset.i18n)
  })
  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder))
  root.querySelectorAll('[data-i18n-title]').forEach(el => el.title = t(el.dataset.i18nTitle))
}
