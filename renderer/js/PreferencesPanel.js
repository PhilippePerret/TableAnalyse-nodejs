/*

  Panneau des préférences de l'analyse
  ------------------------------------

*/
import { DCreate, DGet, listen, stopEvent } from './dom.js'
import { isBool } from './lib/common.js'
import { erreur } from './lib/Message.js'
import { Current } from './Current.js'
import { draggable } from './lib/interact.js'
import { Panneau } from './Panneau.js'
import { Preferences } from './Preferences.js'
import { PreferencesAppData, BORDER_INTENSITY } from './Preferences_AppData.js'
import { Grid } from './Grid.js'
import { Systeme } from './Systeme.js'
import { UI } from './UI.js'
import { emit } from './events.js'
import { onKeyDownUniversel } from './KeyboardEvents.js'
import { t } from './i18n.js'
import { notationCss } from './Notation.js'
import { invoke } from './api.js'
import { AObjet } from './AObjet.js'
import { setModified } from './Current.js'

// Groupes du panneau (titres : ui.prefs_groups.<id>)
const PREFS_GROUPS = [
    {id: 'general',  keys: ['autosave', 'mark_creation_click', 'theme']}
  , {id: 'notation', keys: ['notation_input', 'notation_display']}
  , {id: 'systems',  keys: ['lock_systems', 'systeme_width', 'top_first_system', 'distance_systemes', 'max_table_blank', 'export_systems_gap']}
  , {id: 'measures', keys: ['measure_line_offset', 'distance_after_measure_line', 'marque_measure', 'color_mesure']}
  , {id: 'grid',     keys: ['grid_horizontal_space', 'grid_vertical_space', 'adjust_same_mark', 'snap_for_adjust_pos']}
  , {id: 'marks',    keys: ['marque_accords_size', 'marque_harmonie_size', 'marque_cadence_type_size', 'marque_modulation_size', 'marque_emprunt_size', 'marque_cellule_size', 'marque_motif_size', 'marque_pedale_size', 'marque_texte_size_1', 'marque_texte_size_2', 'marque_texte_size_3', 'marque_texte_size_4']}
  , {id: 'form',     keys: ['form_height_1', 'form_height_2', 'form_height_3', 'form_position']}
  , {id: 'layout',   keys: [1, 2, 3].flatMap(n => ['font', 'size', 'before', 'after'].map(k => `layout_title_${n}_${k}`))}
  , {id: 'lines',    keys: ['border_circle', 'border_box', 'thiness_cellule_line', 'thiness_border', 'thiness_motif_line', 'thiness_segment_line', 'border_emprunt', 'border_cadence', 'border_note', 'border_form', 'border_measure'].flatMap(k => [k, BORDER_INTENSITY[k]])}
  , {id: 'colors',   keys: ['color_accords', 'color_harmonie', 'color_mark_parties', 'color_mark_sections', 'color_cellule', 'color_modulations', 'color_emprunts', 'color_segments']}
  , {id: 'window',   keys: ['window_width', 'window_height', 'last_scroll']}
  , {id: 'animation', keys: ['animate', 'animation_tempo']}
]

class PreferencesPanelClass {

toggle(){this.panneau.toggle.call(this.panneau)}
get panneau(){return this._pano || (this._pano = new Panneau(this))}
get panneauId(){return 'preferences-panel'}
get panneauTitle(){return t('ui.panels.prefs.title')}
onKeyPress(e){
  var returnU = onKeyDownUniversel(e)
  if ( isBool(returnU) ) return returnU
}

/**
 * Bouton « Appliquer » de la préférence +key+ : traitement propre
 * (onApply_<key>) ou, sinon, styles (taille, épaisseur), couleurs et
 * traitement du changement (onChange_<key>). +old+ : valeur avant le
 * changement
 */
apply(key, old){
  if ( 'function' == typeof this[`onApply_${key}`] ) return this[`onApply_${key}`]()
  const dp = PreferencesAppData[key]
  if ( dp.border ) return this.applyBorder(key, old)
  dp.selector && this.updateStylesInHead()
  dp.typeV == 'color' && Current.analyse && Current.analyse.updateModeColor()
  'function' == typeof this[`onChange_${key}`] && this[`onChange_${key}`]()
}

/**
 * Épaisseur ou intensité de bord par défaut +key+ (cf. :border, la
 * propriété) passée de +old+ à sa nouvelle valeur : marques qui suivent
 * la valeur par défaut, et celles qui ont la leur seulement si
 * l'utilisateur le veut (« Non » par défaut). Une marque dont la valeur
 * propre est l'ancienne valeur par défaut la suit.
 */
async applyBorder(key, old){
  const prop = PreferencesAppData[key].border
  const marks = AObjet.items.filter(m => m.borderPrefKeyOf && m.borderPrefKeyOf(prop) == key && m.data.border && null != m.data.border[prop])
  const own = marks.filter(m => String(m.data.border[prop]) != String(old))
  const all = own.length > 0 && await invoke('prefs:confirmBorderOwn')
  const follow = all ? marks : marks.filter(m => !own.includes(m))
  follow.forEach(m => m.resetBorder(prop))
  this.updateStylesInHead()
  follow.length && setModified()
}

onChange_measure_line_offset(){
  Systeme.placeMeasureNumbers(Number(Preferences.getValueOf('measure_line_offset')))
}
onApply_top_first_system(){
  Systeme.moveToFirstSystemTop()
}
onApply_distance_systemes(){
  Systeme.spaceSystems()
}
onApply_distance_after_measure_line(){
  Systeme.spaceAfterMeasureLines()
}
onChange_systeme_width(){
  Current.analyse && Current.analyse.fitWindowToSystems()
}
onChange_lock_systems(){
  Systeme.toggleLock(null, Preferences.getValueOf('lock_systems'), /* quiet = */ true)
}
onChange_thiness_cellule_line(){
  Grid.bSnap = Preferences.getValueOf('thiness_cellule_line')
}
onChange_grid_horizontal_space(){
  Grid.hSnap && (Grid.hSnap = Number(Preferences.getValueOf('grid_horizontal_space')))
  UI.rebuildGrid()
}
onChange_grid_vertical_space(){
  Grid.vSnap && (Grid.vSnap = Number(Preferences.getValueOf('grid_vertical_space')))
  UI.rebuildGrid()
}
// Notation d'affichage des accords : police des marques (cf. Notation.js)
onChange_notation_display(){
  Preferences.saveData('notation_display', Preferences.getValueOf('notation_display'))
  this.updateStylesInHead()
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
  // Systèmes toujours verrouillés à l'ouverture
  Preferences.set('lock_systems', true)
  Systeme.systemsLocked = true
  Systeme.lockAll()
  emit('systems:locked', {locked: true})
}

prepareOnChangeMethods(){
  const my = this
  Object.values(PreferencesAppData).forEach(dpref => {
    if ( dpref.hidden ) return
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
      // Épaisseur de bord par défaut : enregistrée par « Appliquer »
      // seulement (cf. applyBorder)
      if ( dpref.border ) return
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
  // Notation des accords (police des marques)
  selectors.push(notationCss())
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

  // Préférences par groupe (titre), puis celles d'aucun groupe
  const grouped = new Set(PREFS_GROUPS.flatMap(g => g.keys))
  const others  = Object.keys(PreferencesAppData).filter(k => !grouped.has(k))
  ;[...PREFS_GROUPS, {id: 'others', keys: others}].forEach(group => {
    const prefs = group.keys.map(k => PreferencesAppData[k]).filter(dp => dp && !dp.hidden)
    if ( !prefs.length ) return
    o.appendChild(DCreate('DIV', {class:'pref-group', text: t(`ui.prefs_groups.${group.id}`)}))
    prefs.forEach(dp => this.buildPref(o, dp))
  })

  // Pied de page : « Réglages par défaut », « Enregistrer » (bouton par
  // défaut)
  const btnDefaults = DCreate('BUTTON', {class:'btn-defaults', text: t('ui.buttons.defaults')})
  listen(btnDefaults, 'click', this.resetToDefaults.bind(this))
  const btnSave = DCreate('BUTTON', {class:'btn-default', text: t('ui.buttons.save')})
  listen(btnSave, 'click', this.save.bind(this))
  o.appendChild(DCreate('DIV', {class:'buttons', inner: [btnDefaults, btnSave]}))

  document.body.appendChild(o)

  this.obj = o
  this.observe()

  this.isBuilt = true

}

buildPref(o, dp){
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
}

// « Réglages par défaut » : valeurs par défaut réaffectées à toutes les
// préférences du panneau
resetToDefaults(){
  Object.values(PreferencesAppData).forEach(dp => {
    if ( dp.hidden ) return
    Preferences.set(dp.id, dp.default)
    Preferences.saveData(dp.id, dp.default)
  })
  this.updateStylesInHead()
  Current.analyse && Current.analyse.updateModeColor()
}

// Enregistrement des préférences de l'analyse, puis fermeture
save(){
  if ( !Current.analyse ) return erreur(t('errors.no_analyse_open'))
  Current.analyse.savePreferences()
  this.panneau.isOpened && this.toggle()
}

observe(){
  draggable(this.obj)
  listen(this.obj, 'dblclick', e => {
    console.log("-> double click préférences")
    return stopEvent(e)
  })
  // Pas de preventDefault : il empêcherait de cocher en cliquant le libellé
  listen(this.obj, 'click', e => { e.stopPropagation() })
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
  const current = Preferences.get(params.id)
  null != current && (menu.value = current)

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
  // 0 est une valeur (seules les valeurs absentes prennent le défaut)
  const value = (undefined === params.value || null === params.value || '' === params.value) ? params.default : params.value
  const field = DCreate('INPUT', {type:'text', id:domId, value: value})
  // Champ et bouton éventuel dans une même cellule (cf. Preferences.css)
  const cell = DCreate('SPAN', {class:'pref-field', inner: [field]})
  // Unité après le champ
  params.unite && cell.appendChild(DCreate('SPAN', {class:'pref-unit', text: params.unite}))
  div.appendChild(cell)
  // Bouton « Appliquer » (méthode onApply_<id>) pour régler tout de
  // suite l'analyse ouverte. Inutile pour les styles (taille,
  // épaisseur…), appliqués à chaque frappe (cf. prepareOnChangeMethods)
  const live = params.selector && !params.border && 'function' != typeof this[`onApply_${params.id}`]
  if ( params.apply && !live ) {
    const btn = DCreate('BUTTON', {class:'btn-apply', text: t('ui.buttons.apply')})
    listen(btn, 'click', (e) => {
      stopEvent(e)
      // Valeur affichée dans le champ, celle qu'on applique
      const old = Preferences.get(params.id)
      Preferences.saveData(params.id, field.value)
      this.apply(params.id, old)
    })
    cell.appendChild(btn)
  }
  // La description (if any)
  if (params.description){
    div.appendChild(DCreate('DIV', {class:'description', text:params.description}))
  };
  return div
}


}//PreferencesPanelClass

export const PreferencesPanel = new PreferencesPanelClass()
