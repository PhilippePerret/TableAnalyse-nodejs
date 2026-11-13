/**
 * Analyse côté processus principal : lecture, écriture, backups,
 * relève des systèmes.
 */
import fs from 'node:fs'
import path from 'node:path'
import { imageSize } from 'image-size'
import { loadYAML, writeYAML } from './yaml.js'
import { t } from './i18n.js'

const SYSTEM_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg']
const MAX_BACKUPS = 100
export const MEASURES_FILE = 'mesures.yaml' // numéros de mesure produits par la découpe

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
  get measuresPath()    { return path.join(this.systemsFolder, MEASURES_FILE) }

  get infos(){
    if ( undefined === this._infos ) {
      if ( !fs.existsSync(this.infosPath) ) throw new Error(t('errors.infos_not_found', {path: this.infosPath}))
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

  // Taille de la fenêtre écrite seule dans le fichier des préférences
  saveWindowSize(width, height){
    const prefs = loadYAML(this.preferencesPath, {}) || {}
    Object.assign(prefs, {window_width: width, window_height: height})
    writeYAML(this.preferencesPath, prefs)
    if ( this._prefs ) Object.assign(this._prefs, {window_width: width, window_height: height})
  }

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

  /**
   * Positions initiales des systèmes du dossier, les uns sous les autres.
   */
  layoutSystems(){
    let curtop = 400
    // Avec les numéros de mesure : place pour leur ligne sous le système
    const gap = fs.existsSync(this.measuresPath)
      ? (Number(this.preferences.measure_line_offset) || 150) + (Number(this.preferences.distance_after_measure_line) || 250)
      : 100
    return this.systemsInFolder.map((name, idx) => {
      const height = imageHeight(path.join(this.systemsFolder, name))
      const dsys = {id: idx + 1, image_name: name, top: curtop, left: 0, height: height}
      curtop += height + gap
      return dsys
    })
  }

  /**
   * Remplace les images de systèmes (et les numéros de mesure) par celles
   * du dossier +source+ (produit par la découpe) et replace les systèmes.
   */
  replaceSystems(source){
    this.systemsInFolder.forEach(name => fs.rmSync(path.join(this.systemsFolder, name)))
    fs.readdirSync(source).filter(name => isSystemImage(name) || name == MEASURES_FILE).forEach(name => {
      fs.copyFileSync(path.join(source, name), path.join(this.systemsFolder, name))
    })
    this.infos = Object.assign({}, this.infos, {systems: this.layoutSystems()})
    this.saveInfos()
  }

  /**
   * Numéros de mesure détectés par la découpe (systems/mesures.yaml, en
   * pixels de chaque image) : transformés en marques texte « numéro de
   * mesure » posées sur la ligne des numéros, sous chaque système
   * (`line: true`), à valider dans l'interface. Ils remplacent ceux d'une
   * numérotation précédente. Fait une seule fois : le fichier est ensuite
   * renommé.
   * @return le nombre de marques créées
   */
  importMeasures(){
    if ( !fs.existsSync(this.measuresPath) ) return 0
    const entries = loadYAML(this.measuresPath, []) || []
    const findSystem = (image) => this.dataSystems.find(dsys => dsys.image_name == image)
    if ( entries.some(e => !findSystem(e.image)) ) this.updateSystems()
    const width  = Number(this.preferences.systeme_width) || 1860
    const offset = Number(this.preferences.measure_line_offset) || 150 // ligne des numéros (repositionnés à l'affichage)
    let id = this.tags.reduce((max, tag) => Math.max(max, Number(tag.id) || 0), 0)
    const newTags = []
    for ( const e of entries ) {
      const dsys = findSystem(e.image)
      if ( !dsys ) continue
      const scale = width / e.width
      for ( const m of e.measures ) {
        newTags.push({
            id:       ++id
          , type:     'txt'
          , subtype:  'mes'
          , content:  String(m.number)
          , top:      Math.round(dsys.top + e.height * scale + offset - 30)
          , left:     Math.round(m.x * scale)
          , line:     true
        })
      }
    }
    const oldTags = this.tags.filter(tag => !(tag.subtype == 'mes' && tag.line))
    this.tags = [...oldTags, ...newTags]
    this.saveTags()
    fs.renameSync(this.measuresPath, this.measuresPath.replace(/\.yaml$/, '.importe.yaml'))
    return newTags.length
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
