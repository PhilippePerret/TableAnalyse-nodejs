import { DGetAll } from './dom.js'
/**
 * Thèmes de l'interface (css/themes.css), choisis dans le menu
 * « Options ». Le choix est mémorisé dans le navigateur de l'application.
 * Choix désactivé (THEME_CHOICE) : thème par défaut, options du menu
 * « Options » en commentaire dans index.html.
 */
const THEME_CHOICE  = false
const DEFAULT_THEME = 'A'
const STORAGE_KEY   = 'ui_theme'

class ThemesClass {

  init(){
    let theme = DEFAULT_THEME
    if ( THEME_CHOICE ) try { theme = localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME } catch(err) {}
    this.apply(theme)
  }

  apply(theme){
    document.body.classList.forEach(c => c.startsWith('theme-') && document.body.classList.remove(c))
    document.body.classList.add(`theme-${theme}`)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch(err) {}
    // Coche du thème courant dans le menu
    DGetAll('select#options_tool option[data-theme]').forEach(option => {
      const label = option.textContent.replace(/^✓ /, '')
      option.textContent = (option.dataset.theme == theme ? '✓ ' : '') + label
    })
  }
}

export const Themes = new ThemesClass()
