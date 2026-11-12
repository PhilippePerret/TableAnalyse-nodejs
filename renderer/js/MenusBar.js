import { DGet } from './dom.js'
import { invoke, onMain } from './api.js'
import { t } from './i18n.js'
/**

  MenusBar
  --------
  Menus « Options », « Marque », « Aligner »… de la barre de menus de
  l'application.

  Ils sont décrits par les <select> (invisibles) de #menus_bar_models,
  toujours gérés par leurs classes (MenusTool). Toute modification d'un
  <select> (options activées, libellés…) est envoyée au processus
  principal, qui reconstruit la barre de menus. Un choix dans la barre
  revient ici et active l'<option> correspondante.

*/
const MENUS = [
    {id: 'options_tool',    label: 'options'}
  , {id: 'amark_menu',      label: 'mark'}
  , {id: 'align_menu',      label: 'align'}
  , {id: 'adjust_menu',     label: 'adjust'}
  , {id: 'selection_tool',  label: 'selection'}
  , {id: 'borders_tool',    label: 'borders'}
]

class MenusBarClass {

  init(){
    const observer = new MutationObserver(this.update.bind(this))
    MENUS.forEach(m => {
      observer.observe(DGet(`select#${m.id}`), {attributes: true, childList: true, subtree: true, characterData: true})
    })
    onMain('menu:dynamic', this.onChoose.bind(this))
    this.update()
  }

  /**
   * Envoi (différé, pour grouper les modifications) de la description
   * des menus au processus principal
   */
  update(){
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      invoke('menu:setDynamic', {menus: this.describe()}).catch(err => console.error(err))
    }, 50)
  }

  describe(){
    return MENUS.map(m => {
      const select = DGet(`select#${m.id}`)
      const items = []
      Array.from(select.options).forEach((option, index) => {
        if ( index == 0 ) return // titre du menu
        const label = option.textContent.trim()
        if ( label == '' ) {
          // Option vide sans valeur = séparateur ; avec valeur = menu
          // sans libellé pour le moment (p.e. « Annuler… »)
          if ( option.value == '' ) items.push({type: 'separator'})
          return
        }
        items.push({label, index, enabled: !select.disabled && !option.disabled})
      })
      return {id: m.id, label: t(`ui.menu.${m.label}`), items: cleanSeparators(items)}
    })
  }

  onChoose({id, index}){
    const select = DGet(`select#${id}`)
    select.selectedIndex = index
    select.dispatchEvent(new Event('change'))
  }
}

// Pas de séparateur au début, à la fin ni deux de suite
function cleanSeparators(items){
  const res = []
  items.forEach(item => {
    if ( item.type == 'separator' && (res.length == 0 || res[res.length - 1].type == 'separator') ) return
    res.push(item)
  })
  while ( res.length && res[res.length - 1].type == 'separator' ) res.pop()
  return res
}

export const MenusBar = new MenusBarClass()
