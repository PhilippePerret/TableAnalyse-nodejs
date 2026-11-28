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
import { emit, once } from './events.js'
import { onKeyDownUniversel } from './KeyboardEvents.js'
import { t } from './i18n.js'
import { notationCss } from './Notation.js'
import { Verifications } from './Verifications.js'
import { invoke } from './api.js'
import { AObjet } from './AObjet.js'
import { setModified } from './Current.js'
import { Aspect } from './Aspect.js'

// Groupes du panneau (titres : ui.prefs_groups.<id>)
// Traits (tableau de la section « Traits ») : [nom, préférence d'épaisseur]
const LINES_KEYS = [
    ['circle', 'border_circle'], ['box', 'border_box'], ['cellule', 'thiness_cellule_line']
  , ['text', 'thiness_border'], ['motif', 'thiness_motif_line'], ['segment', 'thiness_segment_line']
  , ['emprunt', 'border_emprunt'], ['cadence', 'border_cadence'], ['note', 'border_note']
  , ['form', 'border_form'], ['measure', 'border_measure']
]
// Tailles (tableau de la section « Taille des marques », #281) : [nom,
// préférence]
const MARKS_KEYS = [
    ['accords', 'marque_accords_size'], ['harmonie', 'marque_harmonie_size'], ['cadence', 'marque_cadence_type_size']
  , ['modulation', 'marque_modulation_size'], ['emprunt', 'marque_emprunt_size'], ['cellule', 'marque_cellule_size']
  , ['motif', 'marque_motif_size'], ['pedale', 'marque_pedale_size']
  , ['partie', 'marque_partie_size'], ['section', 'marque_section_size'], ['segment', 'marque_segment_size']
  , ['texte_1', 'marque_texte_size_1'], ['texte_2', 'marque_texte_size_2'], ['texte_3', 'marque_texte_size_3'], ['texte_4', 'marque_texte_size_4']
]
// Bornes du curseur des valeurs numériques (#281) ; sinon de 0 au triple
// de la valeur par défaut
const RANGES = {
    systeme_width: [200, 4000], window_width: [400, 5000], window_height: [300, 3000]
  , last_scroll: [0, 50000], animation_tempo: [10, 240], top_first_system: [0, 2000]
  , measure_line_offset: [0, 2000]
}
const rangeOf = dp => RANGES[dp.id] || (dp.id.startsWith('intensity_') ? [0, 100] : [0, Math.max(10, Math.ceil(Number(dp.default || 0) * 3))])
// Valeurs courantes (boutons des préférences de la fenêtre, #248)
const CURRENT_VALUES = {
    width:  () => window.outerWidth
  , height: () => window.outerHeight
  , scroll: () => Math.round(window.scrollY)
}
const PREFS_GROUPS = [
    {id: 'general',  keys: ['autosave', 'mark_creation_click', 'theme', 'auto_update', 'help_format']}
  , {id: 'notation', keys: ['notation_input', 'notation_display', 'note_char']}
  , {id: 'systems',  keys: ['lock_systems', 'systeme_width', 'top_first_system', 'distance_systemes', 'max_table_blank', 'export_systems_gap']}
  , {id: 'measures', keys: ['measure_line_offset', 'distance_after_measure_line', 'marque_measure', 'color_mesure']}
  , {id: 'grid',     keys: ['adjust_same_mark', 'snap_for_adjust_pos', 'grid_horizontal_space', 'grid_vertical_space']}
  , {id: 'marks',    keys: MARKS_KEYS.map(([, k]) => k)}
  , {id: 'form',     keys: ['form_height_1', 'form_height_2', 'form_height_3', 'form_position']}
  , {id: 'layout',   keys: [1, 2, 3].flatMap(n => ['font', 'size', 'before', 'after'].map(k => `layout_title_${n}_${k}`))}
  , {id: 'lines',    keys: LINES_KEYS.flatMap(([, k]) => [k, BORDER_INTENSITY[k]])}
  , {id: 'colors',   keys: ['color_accords', 'color_harmonie', 'color_mark_parties', 'color_mark_sections', 'color_cellule', 'color_modulations', 'color_emprunts', 'color_segments']}
  , {id: 'window',   keys: ['window_width', 'window_height', 'last_scroll']}
  , {id: 'animation', keys: ['animate', 'animation_tempo']}
]

class PreferencesPanelClass {

toggle(){this.panneau.toggle.call(this.panneau)}
get panneau(){return this._pano || (this._pano = new Panneau(this))}
get panneauId(){return 'preferences-panel'}
get panneauTitle(){return t('ui.panels.prefs.title')}
get panneauFixedPosition(){return true} // toujours au même endroit (#239)
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
  'function' == typeof this[`onChange_${key}`] && this[`onChange_${key}`](old)
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

// +old+ (valeur précédente) : tout ce qui suit la ligne de chaque système
// (sans distance propre) est décalé d'autant (#300)
onChange_measure_line_offset(old){
  const value = Number(Preferences.getValueOf('measure_line_offset'))
  if ( null == old || '' === old || isNaN(Number(old)) ) return Systeme.placeMeasureNumbers(value)
  // (préférence déjà changée : ancienne valeur remise le temps de relever
  // l'appartenance des marques)
  Preferences.set('measure_line_offset', old)
  Systeme.changeMeasureOffsets(() => Preferences.set('measure_line_offset', value))
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
// Distance de magnétisation grisée, inaccessible, quand « Ajuster en
// hauteur les marques de même type » est décoché (#246)
onChange_adjust_same_mark(){
  const cb = DGet('#pref-adjust_same_mark'), field = DGet('#pref-snap_for_adjust_pos')
  if ( !cb || !field ) return
  field.disabled = !cb.checked
  const row = field.closest('.div-data')
  row.classList.toggle('pref-disabled', !cb.checked)
  // Tout le texte de la ligne grisé (libellé, champ, unité ; la ligne
  // elle-même n'a pas de boite, cf. display: contents)
  ;[row, ...row.children].forEach(e => {
    e.style.opacity = cb.checked ? '' : '0.4'
    e.style.pointerEvents = cb.checked ? '' : 'none'
  })
}
onChange_notation_display(){
  Preferences.saveData('notation_display', Preferences.getValueOf('notation_display'))
  this.updateStylesInHead()
}
// Caractère de note : textes des marques réécrits (#250)
onChange_note_char(){
  Preferences.saveData('note_char', Preferences.getValueOf('note_char'))
  AObjet.items.forEach(m => m.isMark && m.contentSpan && (m.contentSpan.innerHTML = m.formated_content))
}
onChange_theme(){
  const theme = Preferences.getValueOf('theme')
  const theme_data = Preferences.themes[theme]
  // console.debug("theme_data = ", theme_data)
  for (var key in theme_data) {
    if ( key == 'name' ) continue
    Preferences.set(key, theme_data[key])
  }
  Preferences.set('theme', theme)
  Aspect.apply()
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
  Aspect.apply()
  this.prepareOnChangeMethods()
  this.onChange_adjust_same_mark()
  // Accords qui se chevauchent, une fois les systèmes affichés
  once('systems:loaded', () => Verifications.schedule())
  Verifications.schedule()
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
    // Valeurs numériques : cf. buildNumberControl
    if ( dpref.type == 'inputtext' && dpref.typeV == 'number' ) return
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
  // Tailles, écriture des accords : chevauchements à recontrôler
  Verifications.schedule()
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
    if ( group.id == 'layout' ) return this.buildLayoutRows(o)
    if ( group.id == 'lines' )  return this.buildLinesRows(o)
    if ( group.id == 'marks' )  return this.buildMarksRows(o)
    prefs.forEach(dp => {
      this.buildPref(o, dp)
      dp.id == 'auto_update' && o.appendChild(this.buildVersionRow())
    })
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

/**
 * Version de l'application (#249) : « Vérifier la version » (version
 * publiée comparée à celle chargée), « Actualiser maintenant » (page de
 * téléchargement), possible quand les versions diffèrent
 */
buildVersionRow(){
  const T = (k, d) => t(`ui.prefs_version.${k}`, d)
  const status   = DCreate('SPAN', {class: 'pref-version-status'})
  const btnCheck = DCreate('BUTTON', {class: 'btn-check-version', text: T('check')})
  const btnNow   = DCreate('BUTTON', {class: 'btn-update-now', text: T('update_now')})
  btnNow.disabled = true
  listen(btnCheck, 'click', async (e) => {
    stopEvent(e)
    status.textContent = T('checking')
    btnNow.disabled = true
    try {
      const res = await invoke('app:checkVersion')
      status.textContent = T(res.different ? 'available' : 'up_to_date', res)
      btnNow.disabled = !res.different
    } catch(err) {
      status.textContent = T('error', {error: err.message})
    }
  })
  listen(btnNow, 'click', (e) => {
    stopEvent(e)
    invoke('app:openDownloadPage').catch(err => erreur(err.message))
  })
  return DCreate('DIV', {class: 'div-data pref-version', inner: [btnCheck, btnNow, status]})
}

/**
 * Ligne de la grille (colonne 1 : libellé, colonne 2 : réglage) de la
 * préférence +key+, libellé +main+ et, éventuellement, sous-libellé
 * discret +sub+ (aligné à droite dans la colonne 1), #306
 */
subRow(o, key, main, sub){
  const dp = PreferencesAppData[key]
  if ( !dp ) return
  const div = this.buildInputText(dp)
  const lab = div.querySelector('label')
  lab.textContent = ''
  main && lab.appendChild(DCreate('SPAN', {class: 'main', text: main}))
  sub  && lab.appendChild(DCreate('SPAN', {class: 'sub', text: sub}))
  sub  && lab.classList.add('sublab')
  div.classList.add('pref-row')
  o.appendChild(div)
}

// Tailles (section « Taille des marques ») : une ligne par marque (#281)
buildMarksRows(o){
  MARKS_KEYS.forEach(([name, key]) => this.subRow(o, key, t(`ui.prefs_marks.kinds.${name}`)))
}

// Titres (section « Mise en page ») : police, taille, espace avant,
// espace après, une ligne chacun
buildLayoutRows(o){
  const S = k => t(`ui.prefs_rows.${k}`)
  ;[1, 2, 3].forEach(n => {
    this.subRow(o, `layout_title_${n}_font`,   t('ui.prefs_layout.level', {n}), S('font'))
    this.subRow(o, `layout_title_${n}_size`,   '', S('size'))
    this.subRow(o, `layout_title_${n}_before`, '', S('before'))
    this.subRow(o, `layout_title_${n}_after`,  '', S('after'))
  })
}

// Traits (section « Traits ») : épaisseur puis intensité, une ligne chacune
buildLinesRows(o){
  const S = k => t(`ui.prefs_rows.${k}`)
  LINES_KEYS.forEach(([name, key]) => {
    this.subRow(o, key, t(`ui.prefs_lines.kinds.${name}`), S('thickness'))
    this.subRow(o, BORDER_INTENSITY[key], '', S('intensity'))
  })
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
  this.onChange_adjust_same_mark()
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

  const label = DCreate('LABEL', {for: `pref-${params.id}`, text: params.label })
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
  // Libellé en colonne 1, case en colonne 2 (#306)
  const d = DCreate('DIV', {class:'div-checkbox div-data type-valeur'})

  /*
  |  ID DOM de l'élément
  */
  const domId = `pref-${params.id}`

  // La case à cocher    
  const cb = DCreate('INPUT',{type:'checkbox', id: domId, value:params.value})

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
  d.appendChild(DCreate('SPAN', {class: 'pref-field', inner: [cb]}))

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
  const lab = DCreate('LABEL', {for: params.id, text:params.label})
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
/**
 * Curseur « < [====] > » de la valeur numérique +params+ (champ +field+) :
 * le champ, le curseur et les flèches (± 1) changent la valeur, enregistrée
 * et appliquée tout de suite (cf. apply). Épaisseurs et intensités de bord
 * par défaut : styles à chaque changement, marques à valeur propre à la
 * fin du réglage seulement (question, cf. applyBorder)
 */
buildNumberControl(params, field){
  const [min, max] = rangeOf(params)
  const slider = DCreate('INPUT', {type: 'range', min: String(min), max: String(max), step: '1'})
  const minus  = DCreate('BUTTON', {class: 'pref-step', text: '<'})
  const plus   = DCreate('BUTTON', {class: 'pref-step', text: '>'})
  const syncSlider = () => { const n = Number(field.value) ; '' !== field.value && !isNaN(n) && (slider.value = String(n)) }
  syncSlider()
  let borderOld = null
  const set = (value, commit) => {
    const n = Number(value)
    if ( '' === String(value).trim() || isNaN(n) ) return
    const old = Preferences.get(params.id)
    if ( params.border && null === borderOld ) borderOld = old
    field.value = String(value)
    syncSlider()
    Preferences.saveData(params.id, field.value)
    if ( params.border ) {
      this.updateStylesInHead()
      if ( commit ) { const o = borderOld ; borderOld = null ; this.applyBorder(params.id, o) }
    } else {
      this.apply(params.id, old)
    }
  }
  // (frappe : styles seulement, tout de suite ; le reste — systèmes,
  // fenêtre… — à la validation, pour ne pas suivre « 1 », « 18 »…)
  listen(field,  'input',  () => params.selector ? set(field.value, false) : syncSlider())
  listen(field,  'change', () => set(field.value, true))
  listen(slider, 'input',  () => set(slider.value, false))
  listen(slider, 'change', () => set(slider.value, true))
  const step = d => (e) => { stopEvent(e) ; set(Math.round(Number(field.value) || 0) + d, true) }
  listen(minus, 'click', step(-1))
  listen(plus,  'click', step(+1))
  return DCreate('SPAN', {class: 'pref-slider', inner: [minus, slider, plus]})
}

buildInputText(params){
  const my = this
  const domId = `pref-${params.id}`
  const prop = params.id.split('-')[1]
  const div = DCreate('DIV', {id:`div-${params.id}`, class:'type-valeur div-data'})
  const lab = DCreate('LABEL', {for: domId, text:params.label})
  div.appendChild(lab)
  // 0 est une valeur (seules les valeurs absentes prennent le défaut)
  const value = (undefined === params.value || null === params.value || '' === params.value) ? params.default : params.value
  const field = DCreate('INPUT', {type:'text', id:domId, value: value})
  // Champ et bouton éventuel dans une même cellule (cf. Preferences.css)
  const cell = DCreate('SPAN', {class:'pref-field', inner: [field]})
  // Couleur : sélecteur de couleur avant le champ (#306)
  if ( params.typeV == 'color' ) {
    const hex = v => '#' + (String(v || '').replace(/^#/, '').match(/^[0-9a-f]{6}$/i) ? String(v).replace(/^#/, '') : '000000')
    const picker = DCreate('INPUT', {type: 'color', class: 'pref-color', value: hex(value)})
    listen(picker, 'input', () => {
      field.value = picker.value.slice(1).toUpperCase()
      field.dispatchEvent(new Event('input'))
    })
    listen(field, 'input', () => { /^#?[0-9a-f]{6}$/i.test(field.value) && (picker.value = hex(field.value)) })
    cell.insertBefore(picker, field)
  }
  // Unité après le champ
  params.unite && cell.appendChild(DCreate('SPAN', {class:'pref-unit', text: params.unite}))
  div.appendChild(cell)
  // Valeur numérique : curseur entre « < » et « > » (pas de 1), effet
  // immédiat sur l'analyse (#281)
  if ( params.typeV == 'number' ) {
    cell.appendChild(this.buildNumberControl(params, field))
  } else {
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
  }
  // Bouton de la valeur courante (« Largeur actuelle », « Scroll
  // courant »…) : mise dans le champ (et enregistrée), #248
  if ( params.current ) {
    const btn = DCreate('BUTTON', {class:'btn-current', text: t(`ui.prefs_current.${params.current}`)})
    listen(btn, 'click', (e) => {
      stopEvent(e)
      field.value = String(CURRENT_VALUES[params.current]())
      field.dispatchEvent(new Event(params.typeV == 'number' ? 'change' : 'input'))
    })
    // (sous le réglage, cf. Preferences.css)
    cell.classList.add('with-current')
    const line = DCreate('SPAN', {class: 'pref-line', inner: [...cell.childNodes]})
    cell.appendChild(line)
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
