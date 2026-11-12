/**
 * Préférences de l'application (dernière analyse ouverte, etc.),
 * enregistrées dans le dossier des données utilisateur d'Electron.
 */
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

const DEFAULT_PREFERENCES = {
    load_last_analyse:  true
  , lang:               'fr'
  , last_analyse_path:  null
  , last_dialog_folder: null
  , score_image_command: null
}

class AppPrefsClass {

  get path(){ return path.join(app.getPath('userData'), 'prefs.json') }

  get data(){
    if ( !this._data ) {
      try {
        this._data = Object.assign({}, DEFAULT_PREFERENCES, JSON.parse(fs.readFileSync(this.path, 'utf8')))
      } catch(err) {
        this._data = Object.assign({}, DEFAULT_PREFERENCES)
      }
    }
    return this._data
  }

  get(key){ return this.data[key] }

  set(values){
    Object.assign(this.data, values)
    fs.mkdirSync(path.dirname(this.path), {recursive: true})
    fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2))
  }
}

export const AppPrefs = new AppPrefsClass()
