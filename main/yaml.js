/**
 * Lecture/écriture des fichiers YAML de l'analyse.
 *
 * Le schéma YAML 1.1 est utilisé pour lire les fichiers à l'identique
 * de ce que faisait Ruby (Psych) : « 000099 » reste une chaîne, etc.
 * Les clés écrites autrefois en symboles Ruby (« :image_name ») sont
 * ramenées à des clés simples (« image_name »).
 */
import fs from 'node:fs'
import * as YAML from 'js-yaml'

function normalizeKeys(value){
  if ( Array.isArray(value) ) return value.map(normalizeKeys)
  if ( value && typeof value == 'object' && !(value instanceof Date) ) {
    const res = {}
    for ( const [k, v] of Object.entries(value) ) {
      res[String(k).replace(/^:/, '')] = normalizeKeys(v)
    }
    return res
  }
  return value
}

export function loadYAML(path, defaultValue){
  if ( !fs.existsSync(path) ) return defaultValue
  const data = YAML.load(fs.readFileSync(path, 'utf8'), {schema: YAML.YAML11_SCHEMA})
  return normalizeKeys(data ?? defaultValue)
}

export function writeYAML(path, data){
  // Aller-retour JSON pour avoir la même sémantique qu'avant (les
  // valeurs undefined disparaissent, les null restent).
  data = JSON.parse(JSON.stringify(data ?? null))
  fs.writeFileSync(path, '---\n' + YAML.dump(data, {lineWidth: -1, noRefs: true}))
}
