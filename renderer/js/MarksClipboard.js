import { DGet } from './dom.js'
import { AObjet } from './AObjet.js'
import { AMark } from './AMark.js'
import { UI } from './UI.js'
import { setModified } from './Current.js'
import { Groups } from './Groups.js'
import { invoke, onMain } from './api.js'
import { on } from './events.js'

// Dernière position de la souris dans la fenêtre (null : hors fenêtre)
let mouseAt = null
document.addEventListener('mousemove', e => { mouseAt = {x: e.clientX, y: e.clientY} }, true)
document.documentElement.addEventListener('mouseleave', () => { mouseAt = null })
window.addEventListener('blur', () => { mouseAt = null })

/**
 * MarksClipboard
 * --------------
 * Copier (Cmd/Ctrl C), couper (Cmd/Ctrl X) et coller (Cmd/Ctrl V) les
 * marques sélectionnées (cf. KeyboardEvents). Presse-papier propre à
 * l'application. Une marque d'un groupe entraîne tout le groupe. Les
 * marques collées gardent leurs positions relatives et sont placées à
 * la souris (coin haut gauche de l'ensemble) si elle est sur la table,
 * sinon au milieu de la fenêtre (#279) ; elles deviennent la sélection.
 */
class MarksClipboardClass {

  constructor(){
    on('selection:changed', () => this.updateMenu())
    onMain('menu:marks', ope => this[ope]())
    // Raccourci du menu (macOS) : texte d'un champ de saisie ; les
    // marques sont traitées au relâchement (cf. KeyboardEvents)
    onMain('menu:editKey', ope => {
      const el = document.activeElement
      if ( el && (el.isContentEditable || ['INPUT', 'TEXTAREA'].includes(el.tagName)) ) invoke('edit:native', {ope})
    })
  }

  // Menu Édition : « la marque » / « les marques », actif ou non
  updateMenu(){
    const selected = (AObjet.selection || []).filter(m => m instanceof AMark && m.obj).length
    const copied   = this.items ? this.items.length : 0
    invoke('menu:marksCount', {selected, copied}).catch(err => console.error(err))
  }

  // @return true si des marques ont été copiées
  copy(){
    const selected = (AObjet.selection || []).filter(m => m instanceof AMark && m.obj)
    if ( !selected.length ) return false
    const outers = new Set(selected.map(m => Groups.outerOf(m)).filter(Boolean))
    const marks = AObjet.items.filter(m => m instanceof AMark && m.obj && (selected.includes(m) || outers.has(Groups.outerOf(m))))
    this.items = marks.map(m => ({
        data:   JSON.parse(JSON.stringify(m.data))
      , width:  m.obj.offsetWidth
      , height: m.obj.offsetHeight
    }))
    this.updateMenu()
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
    const left   = Math.min(...this.items.map(i => i.data.left))
    const right  = Math.max(...this.items.map(i => i.data.left + i.width))
    const top    = Math.min(...this.items.map(i => i.data.top))
    const bottom = Math.max(...this.items.map(i => i.data.top + i.height))
    // Zone visible de la table, sous la bande du haut
    const table = UI.TableAnalyse.getBoundingClientRect()
    const band  = DGet('#titlebar')
    const zone = {
        left:   Math.max(0, table.left)
      , top:    Math.max(band ? band.getBoundingClientRect().bottom : 0, table.top)
      , right:  Math.min(document.documentElement.clientWidth, table.right)
      , bottom: Math.min(document.documentElement.clientHeight, table.bottom)
    }
    const onTable = mouseAt
      && mouseAt.x >= zone.left && mouseAt.x <= zone.right
      && mouseAt.y >= zone.top  && mouseAt.y <= zone.bottom
      && UI.TableAnalyse.contains(document.elementFromPoint(mouseAt.x, mouseAt.y))
    const at = onTable ? mouseAt : {
        x: (zone.left + zone.right) / 2 - (right - left) / 2
      , y: (zone.top + zone.bottom) / 2 - (bottom - top) / 2
    }
    const dx = Math.round(at.x - table.left - left)
    const dy = Math.round(at.y - table.top - top)
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
