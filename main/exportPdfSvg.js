/**
 * Export de l'analyse en PDF et en SVG (pages préparées par le renderer,
 * cf. renderer/js/Exporter.js).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { BrowserWindow } from 'electron'
import { head, exportName } from './exportHtml.js'

/**
 * PDF des pages +code_html+ de +width+ × +height+ mm, produit par une
 * fenêtre cachée
 * @return {String} le chemin du fichier produit
 */
export async function exportToPdf(analyse, {code_html, width, height}){
  fs.mkdirSync(analyse.exportFolder, {recursive: true})
  const pageCss = `<style type="text/css">
  @page { size: ${width}mm ${height}mm; margin: 0; }
  html, body { margin: 0; padding: 0; }
  /* contain : sans quoi le contenu coupé réduit l'échelle à l'impression */
  div.pdf-page { position: relative; overflow: hidden; break-after: page; contain: strict; }
  div.pdf-page:last-child { break-after: auto; }
</style>
`
  const tmp = path.join(os.tmpdir(), `score-analyse-${process.pid}-${Date.now()}.html`)
  fs.writeFileSync(tmp, head(analyse.infos) + pageCss + code_html + '</body></html>')
  const win = new BrowserWindow({show: false, webPreferences: {sandbox: true, contextIsolation: true, nodeIntegration: false}})
  try {
    await win.loadFile(tmp)
    await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)')
    const pdf = await win.webContents.printToPDF({
        printBackground:    true
      , preferCSSPageSize:  true
      , pageSize:           {width: width / 25.4, height: height / 25.4}
      , margins:            {top: 0, bottom: 0, left: 0, right: 0}
    })
    const pdfPath = path.join(analyse.exportFolder, `${exportName()}.pdf`)
    fs.writeFileSync(pdfPath, pdf)
    return pdfPath
  } finally {
    win.destroy()
    fs.rmSync(tmp, {force: true})
  }
}

/**
 * Un fichier SVG par page (+pages+ : code SVG) dans un dossier de l'export
 * @return {String} le chemin du dossier
 */
export function exportToSvg(analyse, pages){
  const folder = path.join(analyse.exportFolder, `${exportName()}-svg`)
  fs.rmSync(folder, {recursive: true, force: true})
  fs.mkdirSync(folder, {recursive: true})
  const digits = String(pages.length).length
  pages.forEach((code, i) => {
    fs.writeFileSync(path.join(folder, `page-${String(i + 1).padStart(Math.max(2, digits), '0')}.svg`), code)
  })
  return folder
}
