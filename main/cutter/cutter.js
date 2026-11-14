/**
 * Processus de rendu (fenêtre cachée) de la découpe de partition :
 * rend chaque page du PDF (pdf.js), l'analyse et écrit les systèmes en JPG.
 *
 * Mode « numerotation » : ne fait que relever les mesures dans les images
 * de systèmes existantes (opts.images, dans opts.folder).
 *
 * Les options arrivent en JSON dans le paramètre « opts » de l'URL.
 */
import * as pdfjs from '../../node_modules/pdfjs-dist/build/pdf.mjs'
import { analysePage, extractSystem, debugImage } from './analyse.js'

const fs   = window.require('node:fs')
const path = window.require('node:path')
const { ipcRenderer } = window.require('electron')

pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../node_modules/pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href

const opts = JSON.parse(new URLSearchParams(location.search).get('opts'))
const log  = (msg) => ipcRenderer.send('cutter:log', msg)
// Textes du journal (locales/<lang>/messages.yaml, transmis par runCutter)
const T    = (key, params) => String(opts.texts[key]).replace(/%\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m))

async function saveJPG(imageData, file){
  const canvas = new OffscreenCanvas(imageData.width, imageData.height)
  canvas.getContext('2d').putImageData(imageData, 0, 0)
  const blob = await canvas.convertToBlob({type: 'image/jpeg', quality: opts.quality / 100})
  fs.writeFileSync(file, Buffer.from(await blob.arrayBuffer()))
}

async function saveDebug(img, res, file){
  const canvas = new OffscreenCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  ctx.putImageData(debugImage(img, res), 0, 0)
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(0,90,255,.6)'
  res.lines.forEach(l => {
    ctx.beginPath()
    ctx.moveTo(l.x0, l.yAt(l.x0))
    for ( let x = l.x0 + 32 ; x < l.x1 ; x += 64 ) ctx.lineTo(x, l.yAt(x))
    ctx.lineTo(l.x1, l.yAt(l.x1))
    ctx.stroke()
  })
  ctx.strokeStyle = 'rgba(160,160,160,.8)'
  if ( res.limits ) [res.limits.top, res.limits.bottom].forEach(y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(img.width, y); ctx.stroke() })
  ctx.lineWidth = 4
  res.systems.forEach((sys, i) => {
    const {x0, y0, x1, y1} = sys.crop
    ctx.strokeStyle = 'rgba(0,0,0,.5)'
    ctx.setLineDash([16, 10])
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0)
    ctx.setLineDash([])
    ctx.fillStyle = 'black'
    ctx.font = `bold ${Math.round(res.s * 3)}px sans-serif`
    ctx.fillText(String(sys.number), x0 + 4, y0 + res.s * 3)
    // Barres de mesure et numéros
    ctx.fillStyle = 'rgba(255,0,0,.45)'
    sys.barlines.forEach(b => ctx.fillRect(b.x0 - 2, sys.top - res.s, b.x1 - b.x0 + 5, sys.bottom - sys.top + 2 * res.s))
    ctx.font = `bold ${Math.round(res.s * 1.2)}px sans-serif`
    ctx.fillStyle = 'red'
    sys.measures.forEach(m => ctx.fillText(String(m.number), m.x, sys.bottom + res.s * 2.5))
  })
  const blob = await canvas.convertToBlob({type: 'image/jpeg', quality: 0.8})
  fs.writeFileSync(file, Buffer.from(await blob.arrayBuffer()))
}

/**
 * Fichier des numéros de mesure, en coordonnées de l'image de chaque
 * système (pixels) : importé par l'application comme marques texte.
 */
function mesuresYAML(mesures){
  const out = [
      opts.texts.measures_header
    , '---'
  ]
  for ( const m of mesures ) {
    out.push(`- image: ${m.image}`)
    out.push(`  width: ${m.width}`)
    out.push(`  height: ${m.height}`)
    out.push(`  measures:`)
    m.measures.forEach(me => out.push(`    - {number: ${me.number}, x: ${me.x - m.x0}}`))
    // Fin de la dernière mesure (dernière barre)
    null != m.end && out.push(`  end: ${m.end - m.x0}`)
  }
  return out.join('\n') + '\n'
}

async function run(){
  const pdf = await pdfjs.getDocument({data: new Uint8Array(fs.readFileSync(opts.pdf))}).promise
  fs.mkdirSync(opts.out, {recursive: true})
  const pagesFolder = path.join(opts.out, 'pages')
  const debugFolder = path.join(opts.out, 'controle')
  if ( opts.pages ) fs.mkdirSync(pagesFolder, {recursive: true})
  if ( opts.controle ) fs.mkdirSync(debugFolder, {recursive: true})

  let number = 0, measure = 0
  const mesures = []
  for ( let p = 1 ; p <= pdf.numPages ; ++p ) {
    const page     = await pdf.getPage(p)
    const viewport = page.getViewport({scale: opts.dpi / 72})
    const canvas   = document.createElement('canvas')
    canvas.width   = Math.round(viewport.width)
    canvas.height  = Math.round(viewport.height)
    const ctx = canvas.getContext('2d', {willReadFrequently: true})
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({canvas, canvasContext: ctx, viewport}).promise
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pageName = `page-${String(p).padStart(2, '0')}.jpg`
    if ( opts.pages ) await saveJPG(img, path.join(pagesFolder, pageName))

    const res = analysePage(img, opts)
    res.warnings.forEach(w => log(T('page_warning', {page: p, warning: w})))
    for ( let i = 0 ; i < res.systems.length ; ++i ) {
      const sys = res.systems[i]
      sys.number = ++number
      sys.measures.forEach(m => m.number = ++measure)
      const image = `system-${String(number).padStart(3, '0')}.jpg`
      await saveJPG(extractSystem(img, res, i), path.join(opts.out, image))
      const {x0, y0, x1, y1} = sys.crop
      mesures.push({image, width: x1 - x0 + 1, height: y1 - y0 + 1, measures: sys.measures, end: sys.lastBar, x0})
    }
    const detail = res.systems.map(sys => sys.staves.length).join('+')
    log(T('page', {page: p, pages: pdf.numPages, staves: res.staves.length, systems: res.systems.length, detail}))
    if ( opts.controle ) await saveDebug(img, res, path.join(debugFolder, pageName))
  }
  fs.writeFileSync(path.join(opts.out, 'mesures.yaml'), mesuresYAML(mesures))
  log(T('done', {systems: number, measures: measure, out: opts.out}))
}

async function loadImage(file){
  const bitmap = await createImageBitmap(new Blob([fs.readFileSync(file)]))
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d', {willReadFrequently: true})
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

async function runNumbering(){
  let measure = 0
  const mesures = []
  for ( const image of opts.images ) {
    const img = await loadImage(path.join(opts.folder, image))
    const res = analysePage(img, opts)
    res.warnings.forEach(w => log(T('image_warning', {image, warning: w})))
    if ( res.systems.length > 1 ) log(T('image_systems', {image, count: res.systems.length}))
    const measures = res.systems.flatMap(sys => sys.measures)
    measures.forEach(m => m.number = ++measure)
    // Fin de la dernière mesure : seulement pour une image d'un système
    const end = res.systems.length == 1 ? res.systems[0].lastBar : null
    mesures.push({image, width: img.width, height: img.height, measures, end, x0: 0})
    log(T('image_measures', {image, count: measures.length}))
  }
  fs.writeFileSync(path.join(opts.out, 'mesures.yaml'), mesuresYAML(mesures))
  log(T('numbered', {measures: measure, systems: opts.images.length}))
}

;(opts.mode === 'numerotation' ? runNumbering() : run())
  .then(() => ipcRenderer.send('cutter:done', 0))
  .catch(err => { ipcRenderer.send('cutter:error', String(err.stack || err)); ipcRenderer.send('cutter:done', 1) })
