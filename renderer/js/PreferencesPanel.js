/*

  Panneau des préférences de l'analyse
  ------------------------------------

*/
import { DCreate, DGet, listen, stopEvent } from './dom.js'
import { isBool } from './lib/common.js'
import { draggable } from './lib/interact.js'
import { Panneau } from './Panneau.js'
import { Preferences } from './Preferences.js'
import { PreferencesAppData } from './Preferences_AppData.js'
import { Grid } from './Grid.js'
import { Systeme } from './Systeme.js'
import { UI } from './UI.js'
import { emit } from './events.js'
import { onKeyDownUniversel } from './KeyboardEvents.js'

class PreferencesPanelClass {

toggle(){this.panneau.toggle.call(this.panneau)}
get panneau(){return this._pano || (this._pano = new Panneau(this))}
get panneauId(){return 'preferences-panel'}
get panneauTitle(){return 'Préférences'}
get panneauShortcut(){return '⇧P'}
onKeyPress(e){
  var returnU = onKeyDownUniversel(e)
  if ( isBool(returnU) ) return returnU
  if ( e.shiftKey && e.key == 'P' ) return this.toggle()
}

onChange_measure_line_offset(){
  Systeme.placeMeasureNumbers(Number(Preferences.getValueOf('measure_line_offset')))
}
onChange_lock_systems(){
  Systeme.toggleLock(null, Preferences.getValueOf('lock_systems'))
}
onChange_thiness_cellule_line(){
  Grid.bSnap = Preferences.getValueOf('thiness_cellule_line')
}
onChange_grid_horizontal_space(){
  Grid.hSnap && (Grid.hSnap = Number(Preferences.getValueOf('grid_horizontal_space')))
}
onChange_grid_vertical_space(){
  Grid.vSnap && (Grid.vSnap = Number(Preferences.getValueOf('grid_vertical_space')))
}
onChange_theme(){
  const theme = Preferences.getValueOf('theme')
  const theme_data = Preferences.themes[theme]
  // console.debug("theme_data = ", theme_data)
  for (var key in theme_data) {
    if ( key == 'name' ) continue
    Preferences.set(key, theme_data[key])
  }
  /*
  |  Actualisation des codes en dur pour l'analyse courante
  */
  this.insertStylesCSSInHead()
}


/**
 * Appelé après le chargement de l'analyse (et donc, par exemple, la
 * fabrication des systèmes)
 */
afterLoadingAnalyse(){
  this.build()
  this.insertStylesCSSInHead();
  this.prepareOnChangeMethods()
  const locked = Preferences.get('lock_systems')
  Systeme[locked ? 'lockAll':'unlockAll'].call(Systeme)
  emit('systems:locked', {locked: !!locked})
}

prepareOnChangeMethods(){
  const my = this
  Object.values(PreferencesAppData).forEach(dpref => {
    const key = dpref.id
    const methChange = `onChange_${key}`
    const obj = DGet(`#pref-${key}`)
    if ( 'function' == typeof my[methChange] ) {
      listen(obj,'change', my[methChange].bind(my))
    }
    /*
    |   Dans tous les cas, on met une méthode lambda qui va consigner
    |   la valeur
    */
    var methode ;
    switch(dpref.type){
    case 'checkbox':
      methode = (function(key, obj){Preferences.saveData(key, obj.checked)}).bind(my, key, obj)
      break
    case 'inputtext':
      // Enregistrement (et application des styles) à chaque frappe
      methode = (function(key, obj){
        Preferences.saveData(key, obj.value)
        Preferences.data[key].selector && this.updateStylesInHead()
      }).bind(my, key, obj)
      listen(obj,'input', methode)
      return
    case 'select':
      methode = (function(key, obj){Preferences.saveData(key, obj.value)}).bind(my, key, obj)
      break
    }
    listen(obj,'change', methode)
  })
}


/**
 * Méthode qui applique les préférences de style dans l'interface
 * 
 * Fonctionnement
 * --------------
 * On écrit une balise STYLE dans le dom, à la fin du HEAD (donc 
 * après toutes les définitions) où vont être reprises toutes les
 * valeurs en les affectant aux classes (selectors) adéquats.
 * Par exemple, la préférence 'marque_accords_size' définit la taille
 * des marques d'accord dans l'application Table d'analyse. Donc, on
 * met dans cette balise style :
 *    div.aobj.acc {font-size: <size>px;}
 * 
 * Dès qu'une préférence de ce type (on les reconnait au fait 
 * qu'elles définisssent la propriété 'selector') est modifiée, on 
 * actualise cette balise style.
 */
insertStylesCSSInHead(){
  const my = this
  if ( this.stylesTagInHead ) {
    this.updateStylesInHead()
  } else {
    this.stylesTagInHead = DCreate('STYLE',{id:'styles-selectors', type:'text/css', text: this.buildSelectorsInHead()})
    document.head.appendChild(this.stylesTagInHead)
    this.stylesTagInHead.disabled = false
  }
}
/**
 * Méthode pour actualiser les préférences dans les selectors de
 * head
 */
updateStylesInHead(){
  this.stylesTagInHead.innerHTML = this.buildSelectorsInHead()
}
buildSelectorsInHead(){
  const my = this
  var selectors = []
  selectors.push('/* Code produit automatiquement par les propriétés \'selector:\' des préférences */')
  Object.values(PreferencesAppData).forEach(dp => {
    if ( undefined == dp.selector ) return ;
    selectors.push(`${dp.selector} {${dp.selector_value.replace(/__VALUE__/g, Preferences.get(dp.id))}}`)
  })
  selectors = selectors.join("\n")
  // console.debug("selectors = ", selectors)
  return selectors
}


// Construction du panneau
build(){
  if ( this.isBuilt ) {
    console.error("Le panneau préférences est déjà construit.")
    return
  }
  var o = DCreate('SECTION', {id:'preferences-panel', class:'hidden'})

  // Pour simplifier l'écriture
  
  Object.values(PreferencesAppData).forEach( dp => {
    if ( dp.type == 'inputtext'){
      o.appendChild(this.buildInputText(dp))
    } else if ( dp.type == 'checkbox' ) {
      o.appendChild(this.buildCheckBox(dp))
    } else if ( dp.type == 'select' ) {
      o.appendChild(this.buildMenuSelect(dp))
    } else if ( dp.type == 'pressoir' ) {
      o.appendChild(this.buildChoixPressoirs(dp))
    }
    // Si des précisions sont à apporter
    if ( dp.precision ) {
      o.appendChild(DCreate('DIV',{class:'description', text:dp.precision}))
    }
  })

  document.body.appendChild(o)

  this.obj = o
  this.observe()

  this.isBuilt = true

}

observe(){
  draggable(this.obj)
  listen(this.obj, 'dblclick', e => {
    console.log("-> double click préférences")
    return stopEvent(e)
  })
  listen(this.obj, 'click', e => { 
    e.stopPropagation()
    e.preventDefault()
    return false
  })
}
 

buildMenuSelect(params){
  /**
   ** Construit et retourne un menu select
   **/
  const div = DCreate('DIV', {class:'div-data type-valeur'})

  const label = DCreate('LABEL', {text: params.label })
  div.appendChild(label)

  const menu = DCreate('SELECT', {id: `pref-${params.id}`})
  div.appendChild(menu)

  
  var values = params.values;
  if ( 'function' == typeof values) {
    values = values.call()
  }
  values.forEach( dvalue => {
    menu.appendChild( DCreate('OPTION',{value:dvalue.value, text:dvalue.name} ) )
  })

  return div
}
/**
 * Construction d'un checkbox pour le panneau de préférences
 * 
 */
buildCheckBox(params){
  const d = DCreate('DIV', {class:'div-checkbox div-data'})

  /*
  |  ID DOM de l'élément
  */
  const domId = `pref-${params.id}`

  // La case à cocher    
  const cb = DCreate('INPUT',{type:'checkbox', id: domId, value:params.value})
  d.appendChild(cb)

  if ( undefined == params.value ) {
    cb.checked = params.default
  } else {
    cb.checked = params.value
  }

  listen(cb, 'click', e => {
    e.stopPropagation()
    Preferences.set(params.id, !Preferences.get(params.id))
    return true
  })

  // Le label
  const lab = DCreate('LABEL', {for:domId, text: params.label})
  d.appendChild(lab)

  // listen(lab, 'click', e => {
  //   e.stopPropagation()
  //   return true
  // })

  // La description (if any)
  if (params.description){
    const dd = DCreate('DIV', {class:'description', text:params.description})
    d.appendChild(dd)
  };

  return d

}

/**
 * Construction d'un pressoir à valeurs pour le panneau des préférences
 * 
 */
buildChoixPressoirs(params){
  const my = this
  const div = DCreate('DIV', {id:`div-${params.id}`, class:'type-valeur div-data'})
  const lab = DCreate('LABEL', {text:params.label})
  div.appendChild(lab)
  const val = Number(Preferences.data[params.id].value||0)
  const btn = DCreate('BUTTON', {id:params.id, text: params.values[val]})
  btn.setAttribute('data-index', val)
  div.appendChild(btn)
  btn.addEventListener('click', function(e){
    let curIdx = Number(btn.getAttribute('data-index'))
    curIdx = (curIdx + 1) % params.values.length
    btn.innerHTML = params.values[curIdx]
    btn.setAttribute('data-index', curIdx)
    Preferences.saveData(params.id, curIdx)
  })
  // La description (if any)
  if (params.description){
    div.appendChild(DCreate('DIV', {class:'description', text:params.description}))
  };

  return div
}
/**
 * Construction d'un pressoir à valeurs pour le panneau des préférences
 * 
 * L'identifiant doit toujours être construit avec le nom :
 * 
 *    default-<nom de la propriété Preferences>
 * 
 * Par exemple, si la propriété est 'snap_width' (qu'on obtient dans
 * le programme par 'Preferences.snap_width') alors l'identifiant ici
 * doit être "default-snap_width"
 * 
 */
buildInputText(params){
  const my = this
  const domId = `pref-${params.id}`
  const prop = params.id.split('-')[1]
  const div = DCreate('DIV', {id:`div-${params.id}`, class:'type-valeur div-data'})
  const lab = DCreate('LABEL', {text:params.label})
  div.appendChild(lab)
  const field = DCreate('INPUT', {type:'text', id:domId, value: params.value||params.default})
  div.appendChild(field)
  // La description (if any)
  if (params.description){
    div.appendChild(DCreate('DIV', {class:'description', text:params.description}))
  };
  return div
}


}//PreferencesPanelClass

export const PreferencesPanel = new PreferencesPanelClass()
