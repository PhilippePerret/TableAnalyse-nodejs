// Export en couleur (#247) : case du panneau d'export accessible seulement
// quand des éléments sont en couleur ; sortie en couleur ou en gris
const { AObjet } = await T.imp('AObjet')
const { Current } = await T.imp('Current')
const { Preferences } = await T.imp('Preferences')
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { Stage, Exporter } = await T.imp('Exporter')

const BASE = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
const box = () => document.querySelector('#export_panel #export_color')
const openPanel = async () => { Exporter.ask() ; await Exporter.colorsDetection }
const closePanel = () => document.querySelector('#export_panel button.btn-close').click()
// Couleurs saturées (#rrggbb) d'un code SVG
const saturated = svg => (svg.match(/#[0-9a-f]{6}\b/gi) || []).filter(c => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16))
  return Math.max(r, g, b) - Math.min(r, g, b) > 12
})
const render = async (opts) => {
  const stage = new Stage()
  await stage.build() ; stage.respace(opts) ; stage.addLegend()
  stage.colors = !!opts.colors ; opts.colors || stage.toGray()
  const svg = (await stage.svgPages(stage.layout(opts))).join('\n')
  stage.remove()
  const st2 = new Stage()
  await st2.build() ; st2.respace(opts) ; st2.addLegend()
  st2.colors = !!opts.colors ; opts.colors || st2.toGray()
  const pdf = await st2.pdfData(st2.layout(opts))
  st2.remove()
  return {svg, pdf: pdf.code_html}
}

T.test('sans élément en couleur : case grisée et inaccessible', async () => {
  Current.analyse.toggleModeColor(false)
  await openPanel()
  T.ok(box(), 'case présente')
  T.eq(document.querySelector('label[for="export_color"]').textContent, 'Export en couleur', 'libellé')
  T.ok(box().disabled, 'inaccessible')
  T.ok(box().closest('.row').classList.contains('disabled'), 'grisée')
  T.eq(getComputedStyle(box().closest('.row')).opacity, '0.4', 'libellé grisé aussi')
  closePanel()
})

T.test('niveaux de gris seulement (aspect gris) : case grisée', async () => {
  const old = Preferences.get('theme')
  Preferences.set('theme', 'gris')
  const { Aspect } = await T.imp('Aspect') ; Aspect.apply()
  await openPanel()
  T.ok(box().disabled, 'inaccessible en aspect gris')
  closePanel()
  Preferences.set('theme', old) ; Aspect.apply()
})

T.test('éléments en couleur : case accessible, export en couleur ou en gris', async () => {
  const mod = await T.mark({type: 'mod', content: 'G', top: 1100, left: 500})
  const oldMod = Preferences.get('color_modulations')
  Preferences.set('color_modulations', '009900')
  Current.analyse.toggleModeColor(true)
  Current.analyse.updateModeColor()
  T.eq(getComputedStyle(mod.obj.querySelector('span.content')).color, 'rgb(0, 153, 0)', 'modulation en vert')
  await openPanel()
  T.no(box().disabled, 'accessible')
  T.no(box().closest('.row').classList.contains('disabled'), 'non grisée')
  // Choix transmis et mémorisé
  let got = null
  const orig = Exporter.export
  Exporter.export = (format, o) => { got = o }
  box().checked = true
  document.querySelector('#export_type').value = 'svg'
  document.querySelector('#export_panel button.btn-default').click()
  Exporter.export = orig
  T.eq(got && got.colors, true, 'export en couleur demandé')
  T.eq(Preferences.get('export_color'), true, 'choix mémorisé')
  // En couleur
  const color = await render(Object.assign({}, BASE, {colors: true}))
  T.ok(saturated(color.svg).length > 0, 'SVG en couleur')
  T.includes(color.pdf, '#009900', 'couleurs du mode couleur dans le PDF')
  // En gris
  const gray = await render(Object.assign({}, BASE, {colors: false}))
  T.eq(saturated(gray.svg), [], 'SVG sans couleur')
  T.no(gray.pdf.includes('#009900'), 'PDF sans le style du mode couleur')
  T.includes(gray.pdf, 'rgb(90, 90, 90)', 'gris de même luminance en ligne dans le PDF')
  // Fichier PDF produit
  const stage = new Stage()
  await stage.build() ; stage.respace(BASE) ; stage.colors = true
  const pdfPath = await T.invoke('analyse:exportPdf', await stage.pdfData(stage.layout(BASE)))
  stage.remove()
  T.ok(String(pdfPath).endsWith('.pdf'), 'PDF en couleur produit')
  Current.analyse.toggleModeColor(false)
  Preferences.set('color_modulations', oldMod) ; Current.analyse.updateModeColor()
  AObjet.remove(mod)
  Preferences.set('export_color', false)
})
