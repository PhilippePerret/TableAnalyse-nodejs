/**
 * Construction d'une image SVG de partition à partir de code
 * « muscore », à l'aide de l'application externe ScoreImage.
 *
 * La commande utilisée est définie par la préférence d'application
 * 'score_image_command' (par défaut : 'score-image', cherchée dans le
 * PATH du shell de connexion).
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { clipboard } from 'electron'
import { AppPrefs } from './AppPrefs.js'
import { t } from './i18n.js'

function run(folder, musName){
  const command = AppPrefs.get('score_image_command') || 'score-image'
  const quote = s => `'${String(s).replace(/'/g, `'\\''`)}'`
  const script = `cd ${quote(folder)} && ${command} ${quote('./' + musName)} 2>&1`
  return new Promise(resolve => {
    execFile('/bin/zsh', ['-lc', script], (err, stdout, stderr) => {
      resolve(String(stdout || '') + String(stderr || '') + (err && !stdout ? err.message : ''))
    })
  })
}

export async function buildImageFromCode(analyse, code){
  const chantier = path.join(analyse.imagesFolder, '_Chantier')
  fs.mkdirSync(chantier, {recursive: true})

  let affixe
  const m = code.match(/^-> ([a-z\-_0-9]+)$/im)
  if ( m ) {
    affixe = m[1]
  } else {
    affixe = `img-${Math.round(Date.now() / 1000)}`
    code = `-> ${affixe}\n${code}`
  }
  const musName   = `${affixe}.mus`
  const builtPath = path.join(chantier, affixe, `${affixe}.svg`)
  const finalPath = path.join(analyse.imagesFolder, `${affixe}.svg`)
  fs.rmSync(builtPath, {force: true})
  fs.rmSync(finalPath, {force: true})
  fs.writeFileSync(path.join(chantier, musName), code)

  const res = await run(chantier, musName)
  if ( /produite avec succès/.test(res) && fs.existsSync(builtPath) ) {
    fs.renameSync(builtPath, finalPath)
    clipboard.writeText(`${affixe}.svg`)
    return {ok: true, image_name: `${affixe}.svg`}
  } else {
    return {ok: false, error: t('errors.score_image_failed', {output: res})}
  }
}
