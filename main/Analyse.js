/**
 * Analyse côté processus principal : lecture, écriture, backups,
 * relève des systèmes.
 */
import fs from 'node:fs'
import path from 'node:path'
import { imageSize } from 'image-size'
import { loadYAML, writeYAML } from './yaml.js'

const SYSTEM_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg']
const MAX_BACKUPS = 100

export function imageHeight(imgPath){
  try {
    return imageSize(fs.readFileSync(imgPath)).height || 0
  } catch(err) {
    return 0
  }
}

export function isSystemImage(fileName){
  return SYSTEM_IMAGE_EXTENSIONS.includes(path.extname(fileName).toLowerCase())
}

export class Analyse {

  /**
   * @return true si +folder+ est le dossier d'une analyse (dossier
   * contenant un dossier 'systems' et un fichier 'infos.yaml')
   */
  static isConform(folder){
    try {
      return fs.statSync(folder).isDirectory()
        && fs.existsSync(path.join(folder, 'systems'))
        && fs.existsSync(path.join(folder, 'infos.yaml'))
    } catch(err) {
      return false
    }
  }

  constructor(folder){
    this.path = folder
  }

  get name(){ return path.basename(this.path) }

  get infosPath()       { return path.join(this.path, 'infos.yaml') }
  get preferencesPath() { return path.join(this.path, 'preferences.yaml') }
  get tagsPath()        { return path.join(this.path, 'analyse_tags.yaml') }
  get systemsFolder()   { return path.join(this.path, 'systems') }
  get imagesFolder()    { return path.join(this.path, 'images') }
  get backupsFolder()   { return path.join(this.path, 'backups') }
  get exportFolder()    { return path.join(this.path, 'export') }

  get infos(){
    if ( undefined === this._infos ) {
      if ( !fs.existsSync(this.infosPath) ) throw new Error(`Les infos sont introuvables (${this.infosPath}) !`)
      this._infos = loadYAML(this.infosPath, {}) || {}
    }
    return this._infos
  }
  set infos(v){ this._infos = v }

  get preferences(){
    if ( undefined === this._prefs ) {
      this._prefs = loadYAML(this.preferencesPath, {autosave: true, animate: false})
    }
    return this._prefs
  }
  set preferences(v){ this._prefs = v }

  get tags(){
    if ( undefined === this._tags ) this._tags = loadYAML(this.tagsPath, []) || []
    return this._tags
  }
  set tags(v){ this._tags = v }

  saveInfos(){        writeYAML(this.infosPath, this.infos) }
  savePreferences(){  writeYAML(this.preferencesPath, this.preferences) }
  saveTags(){         writeYAML(this.tagsPath, this.tags) }

  get dataSystems(){
    return this.infos.systems || []
  }

  /**
   * Noms des images de systèmes présentes dans le dossier, classés
   * par ordre alphabétique.
   */
  get systemsInFolder(){
    if ( !fs.existsSync(this.systemsFolder) ) return []
    return fs.readdirSync(this.systemsFolder).filter(isSystemImage).sort()
  }

  /**
   * Données envoyées au renderer pour afficher l'analyse
   */
  allDataForClient(){
    return {
        infos:              this.infos
      , preferences:        this.preferences
      , systems:            this.dataSystems
      , systems_in_folder:  this.systemsInFolder
      , analyse_tags:       this.tags
      , path:               this.path
    }
  }

  /**
   * Actualise la liste des systèmes (ajouts et retraits d'images dans
   * le dossier des systèmes) et l'enregistre.
   */
  updateSystems(){
    const known = {}
    this.dataSystems.forEach(dsys => { known[dsys.image_name] = dsys })
    let currentTop = 0
    const newSystems = this.systemsInFolder.map(img => {
      const dsys = known[img] || {
          image_name: img
        , left:       0
        , top:        currentTop
        , height:     imageHeight(path.join(this.systemsFolder, img))
      }
      currentTop += dsys.height || 0
      return dsys
    })
    this.infos = Object.assign({}, this.infos, {systems: newSystems})
    this.saveInfos()
    return newSystems
  }

  makeBackup(){
    const stamp = new Date()
    const pad = n => String(n).padStart(2, '0')
    const name = `${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}-${pad(stamp.getMinutes())}-Backup`
    const folder = path.join(this.backupsFolder, name)
    fs.mkdirSync(folder, {recursive: true})
    ;[this.tagsPath, this.infosPath, this.preferencesPath].forEach(src => {
      if ( fs.existsSync(src) ) fs.copyFileSync(src, path.join(folder, path.basename(src)))
    })
    const backups = fs.readdirSync(this.backupsFolder).filter(n => !n.startsWith('.')).sort()
    while ( backups.length > MAX_BACKUPS ) {
      fs.rmSync(path.join(this.backupsFolder, backups.shift()), {recursive: true, force: true})
    }
  }
}
