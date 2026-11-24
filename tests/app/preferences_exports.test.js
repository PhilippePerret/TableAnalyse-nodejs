// Préférences (panneau, tailles, couleurs, enregistrement), variables des
// textes, historique, exports PDF / SVG / HTML (fichiers produits)
const { Current } = await T.imp('Current')
const { AObjet } = await T.imp('AObjet')
const { Preferences } = await T.imp('Preferences')
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { Variables } = await T.imp('Variables')
const { History } = await T.imp('History')
const { Analyse } = await T.imp('Analyse')
const { Stage } = await T.imp('Exporter')
const { AnalyseSaver } = await T.imp('AnalyseSaver')

const ptToPx = pt => Math.round(pt * 96 / 72 * 100) / 100

T.test('panneau des préférences : groupes et champs', async () => {
  PreferencesPanel.toggle()
  const panel = document.querySelector('#preferences-panel')
  T.ok(panel && panel.getClientRects().length, 'panneau ouvert')
  for ( const key of ['autosave', 'mark_creation_click', 'theme', 'notation_input', 'notation_display', 'marque_accords_size', 'color_accords', 'animate', 'animation_tempo'] ) {
    T.ok(document.querySelector(`#pref-${key}`), `champ ${key}`)
  }
  const text = panel.textContent
  T.ok(text.indexOf('Entrée des notes') < text.indexOf('Affichage des notes'), 'entrée avant affichage')
  T.ok(text.lastIndexOf('Animation') > text.indexOf('Fenêtre'), 'section Animation en dernier')
  PreferencesPanel.toggle()
})

T.test('taille et couleur des accords (mode couleur) appliquées, puis enregistrées', async () => {
  const acc = await T.mark({type: 'acc', content: 'G7', top: 1100, left: 500})
  const span = acc.obj.querySelector('span.content')
  const size = document.querySelector('#pref-marque_accords_size')
  size.value = '40' ; size.dispatchEvent(new Event('input'))
  T.eq(Math.round(parseFloat(getComputedStyle(span).fontSize) * 100) / 100, ptToPx(40), 'taille (40 pt)')
  const color = document.querySelector('#pref-color_accords')
  color.value = 'FF0000' ; color.dispatchEvent(new Event('input'))
  PreferencesPanel.apply('color_accords')
  T.no(getComputedStyle(span).color == 'rgb(255, 0, 0)', 'noir et blanc : couleur non appliquée')
  Current.analyse.toggleModeColor(true)
  T.eq(getComputedStyle(span).color, 'rgb(255, 0, 0)', 'mode couleur : couleur appliquée')
  Current.analyse.toggleModeColor(false)
  await AnalyseSaver.save()
  const prefs = await T.readFile('preferences.yaml')
  T.includes(prefs, 'marque_accords_size: 40', 'taille enregistrée')
  T.ok(/color_accords: '?FF0000/i.test(prefs), 'couleur enregistrée')
  AObjet.remove(acc)
})

T.test('variables des textes : infos de l’analyse et motifs', async () => {
  Current.analyse.infos.piece_title = 'Sonate'
  const mot = await T.mark({type: 'mot', content: 'Thème A', top: 1100, left: 300})
  T.ok(mot.setVariable('theme'), 'variable du motif')
  const txt = await T.mark({type: 'txt', subtype: 'size3', content: '{title} : {theme} et {inconnue}', top: 1200, left: 300})
  T.eq(txt.obj.querySelector('span.content').textContent, 'Sonate : Thème A et {inconnue}', 'variables remplacées')
  mot.setValue('Thème B')
  T.eq(txt.obj.querySelector('span.content').textContent, 'Sonate : Thème B et {inconnue}', 'texte actualisé quand le motif change')
  T.no(mot.setVariable('title'), 'nom réservé refusé')
  const mot2 = await T.mark({type: 'mot', content: 'X', top: 1300, left: 300})
  T.no(mot2.setVariable('theme'), 'variable déjà utilisée refusée')
  ;[mot, mot2, txt].forEach(m => AObjet.remove(m))
})

T.test('historique : changements consignés dans history.jsonl', async () => {
  await T.until(() => History.ready, 'historique prêt')
  const before = ((await T.readFile('history.jsonl')) || '').split('\n').filter(Boolean).length
  const m = await T.mark({type: 'acc', content: 'Hist', top: 1100, left: 600})
  await History.capture()
  const lines = (await T.readFile('history.jsonl')).split('\n').filter(Boolean)
  T.eq(lines.length, before + 1, 'une étape ajoutée')
  const step = JSON.parse(lines[lines.length - 1])
  T.eq(step.diff && step.diff.marks && step.diff.marks[m.id] && step.diff.marks[m.id].content, 'Hist', 'nouvelle marque dans l’étape')
  AObjet.remove(m)
  await History.capture()
  const last = JSON.parse((await T.readFile('history.jsonl')).split('\n').filter(Boolean).pop())
  T.eq(last.diff.marks[m.id], null, 'suppression consignée')
  T.eq(History.stateAt(History.steps.length - 2).marks[m.id].content, 'Hist', 'état reconstitué à l’étape précédente')
})

T.test('exports PDF et SVG : fichiers produits', async () => {
  const acc = await T.mark({type: 'acc', content: 'Export7', top: 400, left: 500})
  const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
  let stage = new Stage()
  await stage.build() ; stage.respace(opts) ; stage.addLegend()
  const pages = await stage.svgPages(stage.layout(opts))
  T.ok(pages.length >= 2, `pages SVG (${pages.length})`)
  T.ok(pages.every(p => p.trim().startsWith('<svg') || p.includes('<svg')), 'code SVG')
  T.ok(pages.some(p => p.includes('Export7')), 'texte de la marque dans le SVG')
  const svgFolder = await T.invoke('analyse:exportSvg', {pages})
  stage.remove()
  const files = await T.listFiles('export')
  T.ok(files.some(f => f.endsWith('-svg')), 'dossier SVG')
  stage = new Stage()
  await stage.build() ; stage.respace(opts) ; stage.addLegend()
  const pdfPath = await T.invoke('analyse:exportPdf', await stage.pdfData(stage.layout(opts)))
  stage.remove()
  T.ok(String(pdfPath).endsWith('.pdf'), 'chemin du PDF')
  const files2 = await T.listFiles('export')
  T.ok(files2.some(f => f.endsWith('.pdf')), 'fichier PDF')
  const svgFiles = await T.listFiles(`export/${svgFolder.split(/[\\/]/).pop()}`)
  T.eq(svgFiles.length, pages.length, 'un fichier par page SVG')
  AObjet.remove(acc)
})

T.test('export HTML : fichier autonome', async () => {
  const acc = await T.mark({type: 'acc', content: 'Html7', top: 400, left: 500})
  await Analyse.exportCurrentToHtml()
  const files = await T.listFiles('export')
  const html = files.find(f => f.endsWith('.html'))
  T.ok(html, 'fichier HTML')
  const code = html ? await T.readFile(`export/${html}`) : ''
  T.includes(code, 'font-family:  PhilNote;', 'police embarquée')
  T.includes(code, 'Html7', 'marque dans le HTML')
  T.includes(code, 'data:image', 'images des systèmes embarquées')
  AObjet.remove(acc)
})
