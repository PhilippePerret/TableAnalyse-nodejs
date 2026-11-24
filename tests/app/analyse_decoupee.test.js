// fixture: analyse-decoupee
// Ouverture d'une analyse fraîchement découpée (12 systèmes, sans marques) :
// systèmes ajoutés, numéros de mesure importés de systems/mesures.yaml
// (une seule fois), posés sur la ligne des numéros
const { AObjet } = await T.imp('AObjet')
const { Systeme } = await T.imp('Systeme')
const { Forme } = await T.imp('Forme')
const { AnalyseSaver } = await T.imp('AnalyseSaver')

T.test('systèmes de la découpe affichés dans l’ordre', async () => {
  T.eq(Systeme.all.length, 12, 'systèmes')
  T.eq(Systeme.all.map(s => s.image_name), Array.from({length: 12}, (_, i) => `system-${String(i + 1).padStart(3, '0')}.jpg`), 'ordre des images')
  const tops = Systeme.all.map(s => s.top)
  T.ok(tops.every((t, i) => i == 0 || t > tops[i - 1] + 50), 'systèmes espacés, dans l’ordre')
})

T.test('numéros de mesure importés (1 à 72), sur la ligne, dans leur système', async () => {
  const marks = Forme.measureMarks
  T.eq(marks.length, 72, 'numéros importés')
  T.ok(marks.every(m => m.mark.data.line === true), 'posés sur la ligne des numéros')
  const ordered = marks.slice().sort((a, b) => (Systeme.all.indexOf(Systeme.systemOfMeasure(a.mark)) - Systeme.all.indexOf(Systeme.systemOfMeasure(b.mark))) || a.mark.left - b.mark.left)
  T.eq(ordered.map(m => m.number), Array.from({length: 72}, (_, i) => i + 1), 'ordre de la partition')
  T.eq(Forme.measureMarksOf(Systeme.all[0]).map(m => Number(m.content)), [1, 2, 3, 4, 5, 6, 7], 'mesures du premier système')
  T.ok(Systeme.all.every(s => s.data.measures_end > 0.8 && s.data.measures_end <= 1), 'fin des mesures de chaque système')
})

T.test('fichier des mesures renommé (import fait une seule fois), analyse enregistrée', async () => {
  const files = await T.listFiles('systems')
  T.ok(files.includes('mesures.importe.yaml'), 'mesures.importe.yaml')
  T.no(files.includes('mesures.yaml'), 'mesures.yaml n’existe plus')
  await AnalyseSaver.save()
  const tags = await T.readFile('analyse_tags.yaml')
  T.eq((tags.match(/subtype: mes/g) || []).length, 72, 'numéros enregistrés')
  T.eq((((await T.readFile('infos.yaml')) || '').match(/image_name:/g) || []).length, 12, 'systèmes enregistrés')
})
