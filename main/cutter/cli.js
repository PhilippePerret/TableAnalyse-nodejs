/**
 * Découpe d'une partition PDF en systèmes (images JPG numérotées).
 *
 * Lancement : bin/decoupe-partition <partition.pdf> [options]
 * (ou : npx electron main/cutter/cli.js <partition.pdf> [options])
 *
 * Le travail est fait dans une fenêtre cachée (cutter.html / cutter.js),
 * qui rend les pages avec pdf.js et les analyse (analyse.js).
 */
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { DEFAULTS } from './analyse.js'
import { runCutter } from './runCutter.js'

const USAGE = `
Usage : decoupe-partition <partition.pdf> [options]

  --out <dossier>      Dossier de sortie (défaut : <partition>-systemes/)
  --dpi <n>            Résolution du rendu des pages (défaut : 300)
  --quality <n>        Qualité JPG, 1-100 (défaut : 90)
  --staves <n>         Nombre de portées par système (défaut : détection)
  --reach <n>          Distance max d'un élément à son système, en interlignes (défaut : ${DEFAULTS.reach})
  --margin <n>         Marge autour du système, en interlignes (défaut : ${DEFAULTS.margin})
  --threshold <n>      Seuil de noir, 0-255 (défaut : ${DEFAULTS.threshold})
  --effacer            Efface dans chaque système les éléments des autres systèmes
  --pages              Écrit aussi chaque page en JPG (dossier pages/)
  --controle           Écrit les pages de contrôle (dossier controle/)
`

function parseArgs(argv){
  const opts = {dpi: 300, quality: 90, pages: false, controle: false, effacer: false}
  const numeric = ['dpi', 'quality', 'staves', 'reach', 'margin', 'threshold']
  for ( let i = 0 ; i < argv.length ; ++i ) {
    const arg = argv[i]
    if ( ['--pages', '--controle', '--effacer'].includes(arg) ) opts[arg.slice(2)] = true
    else if ( arg === '--out' ) opts.out = argv[++i]
    else if ( arg.startsWith('--') && numeric.includes(arg.slice(2)) ) opts[arg.slice(2)] = Number(argv[++i])
    else if ( arg === '-h' || arg === '--help' ) opts.help = true
    else if ( !arg.startsWith('-') && !opts.pdf ) opts.pdf = arg
  }
  return opts
}

const opts = parseArgs(process.argv.slice(2))
if ( opts.help || !opts.pdf ) {
  console.log(USAGE)
  process.exit(opts.help ? 0 : 1)
}
opts.pdf = path.resolve(opts.pdf)
if ( !fs.existsSync(opts.pdf) ) {
  console.error(`Fichier introuvable : ${opts.pdf}`)
  process.exit(1)
}
opts.out = path.resolve(opts.out || opts.pdf.replace(/\.pdf$/i, '') + '-systemes')

// La fenêtre cachée détruite ne doit pas quitter avant le code de sortie
app.on('window-all-closed', () => {})

app.whenReady().then(() => {
  if ( app.dock ) app.dock.hide()
  runCutter(opts, (msg) => console.log(msg))
    .then(() => app.exit(0))
    .catch(err => { console.error(err.message); app.exit(1) })
})
