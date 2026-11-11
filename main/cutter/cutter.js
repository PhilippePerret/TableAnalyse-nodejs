/**
 * Processus de rendu (fenêtre cachée) de la découpe de partition :
 * rend chaque page du PDF (pdf.js), l'analyse et écrit les systèmes en JPG.
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
  })
  const blob = await canvas.convertToBlob({type: 'image/jpeg', quality: 0.8})
  fs.writeFileSync(file, Buffer.from(await blob.arrayBuffer()))
}

async function run(){
  const pdf = await pdfjs.getDocument({data: new Uint8Array(fs.readFileSync(opts.pdf))}).promise
  fs.mkdirSync(opts.out, {recursive: true})
  const pagesFolder = path.join(opts.out, 'pages')
  const debugFolder = path.join(opts.out, 'controle')
  if ( opts.pages ) fs.mkdirSync(pagesFolder, {recursive: true})
  if ( opts.controle ) fs.mkdirSync(debugFolder, {recursive: true})

  let number = 0
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
    res.warnings.forEach(w => log(`  ! page ${p} : ${w}`))
    for ( let i = 0 ; i < res.systems.length ; ++i ) {
      const sys = res.systems[i]
      sys.number = ++number
      await saveJPG(extractSystem(img, res, i), path.join(opts.out, `system-${String(number).padStart(3, '0')}.jpg`))
    }
    const detail = res.systems.map(sys => sys.staves.length).join('+')
    log(`Page ${p}/${pdf.numPages} : ${res.staves.length} portées, ${res.systems.length} systèmes (${detail})`)
    if ( opts.controle ) await saveDebug(img, res, path.join(debugFolder, pageName))
  }
  log(`${number} systèmes écrits dans ${opts.out}`)
}

run()
  .then(() => ipcRenderer.send('cutter:done', 0))
  .catch(err => { log(`ERREUR : ${err.stack || err}`); ipcRenderer.send('cutter:done', 1) })
