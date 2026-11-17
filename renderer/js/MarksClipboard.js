import { DGet } from './dom.js'
import { AObjet } from './AObjet.js'
import { AMark } from './AMark.js'
import { UI } from './UI.js'
import { setModified } from './Current.js'
import { Groups } from './Groups.js'

// Marge (px) entre les marques collées et le haut et la droite de la
// fenêtre
const MARGIN = 20

/**
 * MarksClipboard
 * --------------
 * Copier (Cmd/Ctrl C), couper (Cmd/Ctrl X) et coller (Cmd/Ctrl V) les
 * marques sélectionnées (cf. KeyboardEvents). Presse-papier propre à
 * l'application. Les marques collées gardent leurs positions relatives
 * et sont placées en haut à droite de la fenêtre ; elles deviennent la
 * sélection.
 */
class MarksClipboardClass {

  // @return true si des marques ont été copiées
  copy(){
    const marks = (AObjet.selection || []).filter(m => m instanceof AMark && m.obj)
    if ( !marks.length ) return false
    this.items = marks.map(m => ({
        data:   JSON.parse(JSON.stringify(m.data))
      , width:  m.obj.offsetWidth
      , height: m.obj.offsetHeight
    }))
    return true
  }

  cut(){
    if ( !this.copy() ) return false
    AObjet.removeCurrentSelection()
    setModified()
    return true
  }

  paste(){
    if ( !this.items ) return false
    const right  = Math.max(...this.items.map(i => i.data.left + i.width))
    const top    = Math.min(...this.items.map(i => i.data.top))
    // Haut à droite de la fenêtre, sous la bande du haut, en coordonnées
    // de la table
    const table = UI.TableAnalyse.getBoundingClientRect()
    const band  = DGet('#titlebar')
    const bandBottom = band ? band.getBoundingClientRect().bottom : 0
    const dx = Math.round(Math.min(window.innerWidth, document.documentElement.clientWidth) - MARGIN - table.left - right)
    const dy = Math.round(bandBottom + MARGIN - table.top - top)
    // Groupes des originaux : nouveaux groupes pour les copies
    const newGroups = {}
    const news = this.items.map(i => {
      const data = JSON.parse(JSON.stringify(i.data))
      delete data.grp
      data.groups && (data.groups = data.groups.map(g => newGroups[g] || (newGroups[g] = Groups.newId(Object.values(newGroups)))))
      Object.assign(data, {left: data.left + dx, top: data.top + dy})
      return AMark.createNew(null, data)
    }).filter(Boolean)
    AObjet.deselectAll()
    news.forEach(m => AObjet.addToSelection(m))
    setModified()
    return true
  }
}

export const MarksClipboard = new MarksClipboardClass()
