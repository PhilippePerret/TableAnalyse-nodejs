/*

  Gestion des préférences de l'analyse (données)
  ----------------------------------------------
  Le panneau des préférences est géré par PreferencesPanel.js

*/
import { DGet } from './dom.js'
import { not } from './lib/common.js'
import { erreur } from './lib/Message.js'
import { invoke } from './api.js'
import { setModified } from './Current.js'
import { PreferencesAppData } from './Preferences_AppData.js'

class PreferencesClass {

/**
 * Appel au chargement de l'application
 * (avant le chargement de l'analyse)
 */
init(){
  this.data = PreferencesAppData
  this.data.theme.values = this.themesAsMenu.bind(this)
}

setValuesSaved(savedData){
  for(var prop in savedData){
    const dprop = this.data[prop]
    if ( !dprop ) continue // clé de préférence obsolète
    const value = (function(v, type){
      switch(type){
      case 'boolean': return v === true || v == 'true';
      case 'number' : return Number(v);
      default: return v
      }
    })(savedData[prop], dprop.typeV)
    Object.assign(this.data[prop], {value: value})
  }
}

/**
 * @return la valeur de préférence de la clé +key+
 * @usage     pref(<key>) OU Preferences.get(<key>)
 */
get(key){
  // console.debug("pref %s = %s (%s) in ", key, this.data[key].value, typeof this.data[key].value, this.data)
  const value = this.data[key].value
  return (undefined === value || null === value || '' === value) ? this.data[key].default : value
}
set(key,value){
  this.data[key].value = value

  let element = DGet(`#pref-${key}`)
  if ( element ) {  
    switch(this.data[key].type){
      case 'checkbox':
        element.checked = value
        break
      case 'inputtext':
      case 'select':
        element.value = value
        break
    }
  } else {
    console.error("L'élément préférences #%s est introuvable…", key)
  }

}

getValueOf(key, defaut){
  /**
   ** Méthode retournant la valeur de la clé préférence +key+ dans
   ** son champ (souvent après une modification) en lui donnant son
   ** bon type (défini en vtype dans les préférences de l'app.)
   **/
  const dkey = PreferencesAppData[key]
  if ( not(DGet(`#pref-${key}`)) ) {
    erreur("Impossible de trouver l'élément préférence d'identifiant #"+key)
    return null
  }
  switch(dkey.type){
  case 'checkbox':
    return DGet(`#pref-${key}`).checked
  default:
    return DGet(`#pref-${key}`).value || defaut
  }
}

/* --- Themes Methods --- */

/**
 * Chargement des thèmes (dossier assets/themes)
 */
async loadThemes(){
  this.themes = {}
  try {
    const themes = await invoke('app:themes')
    themes.forEach(theme => { this.themes[theme.name] = theme })
  } catch(err) {
    erreur(err.message)
  }
  return this.themes
}

/**
 * Liste des thèmes pour peupler le menu des thèmes
 */
themesAsMenu(){
  return Object.values(this.themes || {}).map(theme => {
    const name = theme.name.substring(0,1).toUpperCase() + theme.name.substring(1).toLowerCase()
    return {name: name, value: theme.name}
  })
}

/**
 * @return Une table des données avec en clé la clé des préférences
 * et en valeur la valeur. Pour enregistrement.
 * 
 */
getData(){
  var prefs = {}
  Object.keys(PreferencesAppData).forEach( key => {
    Object.assign(prefs, {[key]: this.get(key) })
  })
  return prefs
}

saveData(key,value){
  // console.debug("-> saveData(%s, %s)", key, value)
  // Rectification de la valeur en fonction du typeV
  switch(this.data[key].typeV){
  case 'number': value = Number(value)
  }
  Object.assign(this.data[key], {value: value})
  setModified()
}

}//PreferencesClass

export const Preferences = new PreferencesClass()
export const pref = Preferences.get.bind(Preferences)
