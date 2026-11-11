/**
 * Création d'une nouvelle analyse.
 */
import fs from 'node:fs'
import path from 'node:path'
import { Analyse, imageHeight, isSystemImage } from './Analyse.js'
import { APP_FOLDER, ASSETS_FOLDER } from './paths.js'

const FIRST_TAGS_MESSAGES = [
    "Double-cliquer sur la table pour créer une nouvelle marque d'analyse à l'endroit voulu."
  , "Jouer ⇧M pour ouvrir le manuel d'utilisation"
  , "Utiliser le menu « Fichier » pour ouvrir ou créer une analyse"
]

function firstTags(){
  return FIRST_TAGS_MESSAGES.map((msg, idx) => {
    return {id: idx + 1, top: 100, left: 220 * idx, width: 200, type: 'txt', subtype: 'size3', content: msg}
  })
}

function checkData(data){
  const folder = data.folder
  if ( !folder ) throw new Error("Il faut indiquer le dossier dans lequel créer l'analyse.")
  if ( path.resolve(folder) == APP_FOLDER ) throw new Error("Vous ne pouvez pas créer une analyse dans le dossier de l'application…")
  if ( !fs.existsSync(folder) ) throw new Error(`Le dossier '${folder}' est introuvable…`)
  const id = data.analyse_id || ''
  if ( id == '' || id.replace(/[a-zA-Z0-9_\-]/g, '') != '' ) {
    throw new Error(`L'identifiant '${id}' est invalide (il ne doit contenir que des lettres, des chiffres, des traits plats ou des tirets)`)
  }
  if ( fs.existsSync(path.join(folder, id)) ) {
    throw new Error(`L'analyse « ${id} » existe déjà dans le dossier '${folder}'…`)
  }
}

/**
 * Copie les images de systèmes du dossier +source+ (if any) dans le
 * dossier des systèmes de l'analyse.
 */
function copySystems(source, systemsFolder){
  if ( !source || !fs.existsSync(source) ) return
  fs.readdirSync(source).filter(isSystemImage).forEach(name => {
    fs.copyFileSync(path.join(source, name), path.join(systemsFolder, name))
  })
}

function prepareSystemsPositions(systemsFolder){
  let curtop = 400
  return fs.readdirSync(systemsFolder).filter(isSystemImage).sort().map((name, idx) => {
    const height = imageHeight(path.join(systemsFolder, name))
    const dsys = {id: idx + 1, image_name: name, top: curtop, left: 0, height: height}
    curtop += height + 100
    return dsys
  })
}

/**
 * @return {Analyse} la nouvelle analyse
 */
export function createAnalyse(data, appVersion){
  checkData(data)
  const analysePath = path.join(data.folder, data.analyse_id)
  const analyse = new Analyse(analysePath)
  fs.mkdirSync(analyse.systemsFolder, {recursive: true})
  copySystems(data.systems_source, analyse.systemsFolder)

  fs.copyFileSync(path.join(ASSETS_FOLDER, 'models', 'preferences.yaml'), analyse.preferencesPath)

  const now = Math.round(Date.now() / 1000)
  analyse.infos = {
      piece_title:    data.piece_title   || ''
    , composer:       data.composer      || ''
    , analyse_title:  data.analyse_title || ''
    , analyse_id:     data.analyse_id
    , folder:         data.folder
    , analyst:        data.analyst       || ''
    , systems:        prepareSystemsPositions(analyse.systemsFolder)
    , created_at:     now
    , updated_at:     now
    , app_version:    appVersion
  }
  analyse.saveInfos()

  analyse.tags = firstTags()
  analyse.saveTags()

  return analyse
}
