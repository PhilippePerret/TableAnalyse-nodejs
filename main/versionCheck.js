/**
 * Version de l'application (#249)
 * -------------------------------
 * Dernière version publiée (Release GitHub du dépôt, celle que la page
 * de téléchargement du site affiche aussi) comparée à la version
 * chargée. « Actualiser » : page de téléchargement du site.
 */
import { net } from 'electron'

export const DOWNLOAD_PAGE = 'https://www.analyse-musicale.fr/table-analyse/'
const LATEST_URL = 'https://api.github.com/repos/PhilippePerret/TableAnalyse-nodejs/releases/latest'

// Tests : dernière version imposée (sans réseau)
let forcedLatest = null
export function forceLatestVersion(version){ forcedLatest = version }

export async function latestVersion(){
  if ( forcedLatest ) return forcedLatest
  const res = await net.fetch(LATEST_URL, {headers: {'Accept': 'application/vnd.github+json', 'User-Agent': 'Table-Analyse'}})
  if ( !res.ok ) throw new Error(`HTTP ${res.status}`)
  const tag = String((await res.json()).tag_name || '').trim()
  if ( !tag ) throw new Error('version introuvable')
  return tag.replace(/^v/i, '')
}

// {current, latest, different}
export async function checkVersion(current){
  const latest = await latestVersion()
  return {current, latest, different: latest != current}
}
