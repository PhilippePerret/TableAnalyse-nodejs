/**
 * Création d'une nouvelle analyse.
 */
import fs from 'node:fs'
import path from 'node:path'
import { Analyse, MEASURES_FILE, isSystemImage } from './Analyse.js'
import { APP_FOLDER, ASSETS_FOLDER } from './paths.js'
import { t } from './i18n.js'

function checkData(data){
  const folder = data.folder
  if ( !folder ) throw new Error(t('errors.creation.folder_required'))
  if ( path.resolve(folder) == APP_FOLDER ) throw new Error(t('errors.creation.folder_is_app'))
  if ( !fs.existsSync(folder) ) throw new Error(t('errors.creation.folder_not_found', {folder}))
  const id = data.analyse_id || ''
  if ( id == '' || id.replace(/[a-zA-Z0-9_\-]/g, '') != '' ) {
    throw new Error(t('errors.creation.invalid_id', {id}))
  }
  if ( fs.existsSync(path.join(folder, id)) ) {
    throw new Error(t('errors.creation.already_exists', {id, folder}))
  }
}

/**
 * Copie les images de systèmes du dossier +source+ (if any) dans le
 * dossier des systèmes de l'analyse, ainsi que les numéros de mesure
 * produits par la découpe.
 */
function copySystems(source, systemsFolder){
  if ( !source || !fs.existsSync(source) ) return
  fs.readdirSync(source).filter(name => isSystemImage(name) || name == MEASURES_FILE).forEach(name => {
    fs.copyFileSync(path.join(source, name), path.join(systemsFolder, name))
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
    , systems:        analyse.layoutSystems()
    , created_at:     now
    , updated_at:     now
    , app_version:    appVersion
  }
  analyse.saveInfos()

  analyse.tags = []
  analyse.saveTags()

  return analyse
}
