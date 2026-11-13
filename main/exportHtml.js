/**
 * Export de l'analyse en fichier HTML autonome.
 *
 * Le code HTML reçu du renderer contient déjà les images embarquées
 * (base64/svg). Il reste à ajouter l'entête (fontes et styles en dur)
 * et la page de titre.
 */
import fs from 'node:fs'
import path from 'node:path'
import { ASSETS_FOLDER, RENDERER_FOLDER } from './paths.js'

const CSS_FILES = ['AMark', 'AObjet', 'Forme', 'main', 'Print']

function escapeHtml(str){
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fontSource(name){
  const b64 = fs.readFileSync(path.join(ASSETS_FOLDER, 'fonts', name)).toString('base64')
  return `data:font/otf;base64,${b64}`
}

function stylesCss(){
  return CSS_FILES.map(affixe => fs.readFileSync(path.join(RENDERER_FOLDER, 'css', `${affixe}.css`), 'utf8')).join('\n')
}

function pageTitre(infos){
  return `<div id="page_titre">
  <div class="mot">Analyse de</div>
  <div id="titre_oeuvre">${escapeHtml(infos.piece_title)}</div>
  <div class="mot">de</div>
  <div id="composer_oeuvre">${escapeHtml(infos.composer)}</div>
  <div id="titre_analyse">${escapeHtml(infos.analyse_title)}</div>
  <div class="mot">par</div>
  <div id="analyst">${escapeHtml(infos.analyst)}</div>
</div>
`
}

export function head(infos){
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Analyse ${escapeHtml(infos.piece_title)}</title>
  <style type="text/css">
    @font-face {
      font-family:  PhilNote;
      src: url(${fontSource('PhilNote2-Regular.otf')});
    }
    @font-face {
      font-family:  PhilNote;
      src: url(${fontSource('PhilNote2-Bold.otf')});
      font-weight: bold;
    }
    .philnote {
      font-family: PhilNote;
      font-size: 32px;
    }
    div#page_titre {
      padding:4em;
      margin-bottom:4em;
      font-size:32pt;
    }
    div#page_titre > div {
      text-align: center;
      margin-top:1em;
      margin-bottom:1em;
    }
    div#page_titre div.mot {font-size:0.75em}
    section#content {
      position:relative;
    }
    ${stylesCss()}
  </style>
</head>
<body>
`
}

// Nom des fichiers d'export : analyse-<jour>_<mois>_<année>
export function exportName(){
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `analyse-${pad(d.getDate())}_${pad(d.getMonth() + 1)}_${d.getFullYear()}`
}

/**
 * Chemin libre dans +folder+ pour l'export +suffix+ (« .pdf », « -svg »…) :
 * numéro de version incrémenté (-v2, -v3…) plutôt qu'écraser un export
 */
export function exportPath(folder, suffix){
  const base = exportName()
  let p = path.join(folder, base + suffix)
  for ( let v = 2 ; fs.existsSync(p) ; ++v ) p = path.join(folder, `${base}-v${v}${suffix}`)
  return p
}

/**
 * @return {String} le chemin du fichier produit
 */
export function exportToHtml(analyse, codeHtml){
  fs.mkdirSync(analyse.exportFolder, {recursive: true})
  const htmlPath = exportPath(analyse.exportFolder, '.html')
  fs.writeFileSync(htmlPath, head(analyse.infos) + pageTitre(analyse.infos) + codeHtml + '</body></html>')
  return htmlPath
}
