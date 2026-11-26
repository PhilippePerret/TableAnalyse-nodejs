// Export : type de document « Normal (type KDP) » ou « Imprimeur »
// (hirondelles aux coins, page agrandie autour de la ligne de coupe) (#241)
const { AObjet } = await T.imp('AObjet')
const { Stage, Exporter, cropMarks } = await T.imp('Exporter')
const { Preferences } = await T.imp('Preferences')

const BASE = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
const mm2pt = mm => mm * 72 / 25.4

T.test('panneau d’export : menu du type de document', async () => {
  Exporter.ask()
  const sel = document.querySelector('#export_panel #export_document')
  T.ok(sel, 'menu présent')
  const opts = sel ? [...sel.options].map(o => [o.value, o.textContent]) : []
  T.eq(opts, [['normal', 'Normal (type KDP)'], ['printer', 'Imprimeur']], 'items et noms exacts')
  T.eq(sel && sel.value, 'normal', 'normal par défaut')
  // Choix transmis à l'export et mémorisé
  let got = null
  const orig = Exporter.export
  Exporter.export = (format, o) => { got = {format, o} }
  document.querySelector('#export_type').value = 'svg'
  document.querySelector('#export_type').dispatchEvent(new Event('change'))
  T.ok(!sel.closest('.row').hidden, 'menu visible en SVG')
  sel.value = 'printer'
  document.querySelector('#export_panel button.btn-default').click()
  Exporter.export = orig
  T.eq(got && got.o.document, 'printer', 'type transmis à l’export')
  T.eq(Preferences.get('export_document'), 'printer', 'choix mémorisé')
  Exporter.ask()
  T.eq(document.querySelector('#export_document').value, 'printer', 'choix retrouvé')
  document.querySelector('#export_type').value = 'html'
  document.querySelector('#export_type').dispatchEvent(new Event('change'))
  T.ok(document.querySelector('#export_document').closest('.row').hidden, 'menu caché en HTML')
  document.querySelector('#export_panel button.btn-close').click()
  Preferences.set('export_document', 'normal')
})

T.test('hirondelles : huit traits hors de la page, prolongeant ses bords', async () => {
  const lines = cropMarks(210, 297, 10)
  T.eq(lines.length, 8, 'deux traits par coin')
  const inside = ([x, y]) => x > 10 && x < 220 && y > 10 && y < 307
  T.ok(lines.every(([x1, y1, x2, y2]) => !inside([x1, y1]) && !inside([x2, y2])), 'aucun trait dans la page')
  T.ok(lines.every(([x1, y1, x2, y2]) => [x1, x2, y1, y2].every(v => v >= 0) && x1 <= 230 && x2 <= 230 && y1 <= 317 && y2 <= 317), 'traits dans la page agrandie')
  T.ok(lines.every(([x1, y1, x2, y2]) => (y1 == y2 && [10, 307].includes(y1)) || (x1 == x2 && [10, 220].includes(x1))), 'alignés sur les lignes de coupe')
})

T.test('export SVG imprimeur : page agrandie, hirondelles, contenu décalé', async () => {
  const acc = await T.mark({type: 'acc', content: 'Hiron7', top: 400, left: 500})
  for ( const document of ['normal', 'printer'] ) {
    const opts = Object.assign({}, BASE, {document})
    const stage = new Stage()
    await stage.build() ; stage.respace(opts) ; stage.addLegend()
    const pages = await stage.svgPages(stage.layout(opts))
    stage.remove()
    const p = pages[0]
    if ( document == 'printer' ) {
      T.includes(p, 'width="230mm" height="317mm"', 'page agrandie (SVG)')
      T.eq((p.match(/<line /g) || []).length >= 8 && pages.every(pg => pg.includes('class="crop-marks"')), true, 'hirondelles sur chaque page')
      T.includes(p, 'translate(20 20)', 'contenu décalé de la bande')
      T.ok(pages.some(pg => pg.includes('Hiron7')), 'marque exportée')
    } else {
      T.includes(p, 'width="210mm" height="297mm"', 'page normale (SVG)')
      T.no(pages.some(pg => pg.includes('crop-marks')), 'aucune hirondelle en normal')
    }
  }
  AObjet.remove(acc)
})

T.test('export PDF imprimeur : page agrandie et hirondelles dans le fichier', async () => {
  const opts = Object.assign({}, BASE, {document: 'printer'})
  const stage = new Stage()
  await stage.build() ; stage.respace(opts) ; stage.addLegend()
  const data = await stage.pdfData(stage.layout(opts))
  stage.remove()
  T.eq([data.width, data.height], [230, 317], 'taille de la page PDF')
  T.includes(data.code_html, 'class="crop-marks"', 'hirondelles dans les pages')
  T.includes(data.code_html, 'left:20mm;top:20mm;', 'contenu décalé de la bande')
  const pdfPath = await T.invoke('analyse:exportPdf', data)
  const code = await T.readFile(`export/${String(pdfPath).split(/[\\/]/).pop()}`)
  const box = code.match(/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/)
  T.ok(box, 'MediaBox lue')
  box && T.ok(Math.abs(Number(box[1]) - mm2pt(230)) < 1.5 && Math.abs(Number(box[2]) - mm2pt(317)) < 1.5, `format du PDF (${box[1]} × ${box[2]} pt)`)
  const normal = Object.assign({}, BASE, {document: 'normal'})
  const st2 = new Stage()
  await st2.build() ; st2.respace(normal) ; st2.addLegend()
  const d2 = await st2.pdfData(st2.layout(normal))
  st2.remove()
  T.eq([d2.width, d2.height], [210, 297], 'PDF normal inchangé')
  T.no(d2.code_html.includes('crop-marks'), 'aucune hirondelle en normal')
})
