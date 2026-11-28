// fixture: analyse-decoupee
// « Distance avec la numérotation… » (menu d'un système) : distance propre
// système ↔ ligne des numéros, fixe malgré les préférences (#292)
const { Systeme } = await T.imp('Systeme')
const { MeasureOffsetEditor } = await T.imp('MeasureOffsetEditor')
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { Preferences } = await T.imp('Preferences')
const { AnalyseSaver } = await T.imp('AnalyseSaver')

const gap = sys => parseFloat(sys.measureLine.style.top) - (sys.top + sys.obj.offsetHeight)
const panel = () => document.querySelector('#measure_offset_editor')

T.test('panneau : curseur à la distance actuelle, aperçu, Renoncer (#292)', async () => {
  const sys = Systeme.all[1]
  const start = gap(sys)
  sys.editMeasureOffset()
  T.ok(panel(), 'panneau ouvert')
  const field = panel().querySelector('input.range-value'), range = panel().querySelector('input[type="range"]')
  T.eq(Number(field.value), Math.round(start), 'distance actuelle')
  range.value = String(start + 60) ; range.dispatchEvent(new Event('input'))
  T.eq(Math.round(gap(sys)), Math.round(start + 60), 'aperçu immédiat')
  MeasureOffsetEditor.close()
  T.eq(Math.round(gap(sys)), Math.round(start), 'Renoncer : distance reprise')
  T.no(sys.hasOwnMeasureOffset, 'aucune distance propre')
})

T.test('OK : distance fixe, préférences sans effet sur elle, enregistrée (#292)', async () => {
  const [s0, s1, s2] = Systeme.all
  s1.editMeasureOffset()
  const field = panel().querySelector('input.range-value')
  field.value = '90' ; field.dispatchEvent(new Event('input'))
  panel().querySelector('.btn-default').click()
  T.no(panel(), 'panneau fermé')
  T.eq(Math.round(gap(s1)), 90, 'distance propre appliquée')
  // Changement de la préférence : les autres suivent, pas lui
  const old = Preferences.get('measure_line_offset')
  try {
    Preferences.set('measure_line_offset', 220)
    PreferencesPanel.onChange_measure_line_offset()
    T.eq(Math.round(gap(s0)), 220, 'autre système : préférence')
    T.eq(Math.round(gap(s2)), 220, 'autre système : préférence')
    T.eq(Math.round(gap(s1)), 90, 'système à distance propre : inchangé')
    // Déplacement du système : distance gardée
    s1.positionne(s1.top + 40)
    T.eq(Math.round(gap(s1)), 90, 'système déplacé : distance gardée')
    s1.positionne(s1.top - 40)
    await AnalyseSaver.save()
    const yaml = await T.readFile('infos.yaml') + (await T.readFile('analyse_tags.yaml')) + ((await T.readFile('systems.yaml')) || '')
    T.ok(/measure_offset: 90/.test(yaml), 'enregistrée')
  } finally {
    Preferences.set('measure_line_offset', old)
    PreferencesPanel.onChange_measure_line_offset()
  }
})

// Limite : 2000 px (#294)
T.test('distance jusqu’à 2000 px (panneau du système, préférences) (#294)', async () => {
  const sys = Systeme.all[3]
  sys.editMeasureOffset()
  const range = panel().querySelector('input[type="range"]')
  T.eq(range.max, '2000', 'panneau : 2000')
  range.value = '1500' ; range.dispatchEvent(new Event('input'))
  T.eq(Math.round(gap(sys)), 1500, '1500 px appliqués')
  MeasureOffsetEditor.close()
  const pr = document.querySelector('#pref-measure_line_offset').closest('tr, .div-data').querySelector('input[type="range"]')
  T.eq(pr.max, '2000', 'préférences : 2000')
})

// Distance augmentée : tout le reste de la partition repoussé (#300)
T.test('distance du système augmentée : la suite repoussée (#300)', async () => {
  const { AObjet } = await T.imp('AObjet')
  const [s0, s1, s2, s3] = Systeme.all
  Systeme.all.forEach(sys => delete sys.data.measure_offset) ; Systeme.placeMeasureNumbers()
  const lineY = sys => sys.top + sys.obj.offsetHeight + sys.measureOffset
  const a = await T.mark({type: 'txt', subtype: 'size3', content: 'A1', top: s1.top + 20, left: 400})
  const b = await T.mark({type: 'txt', subtype: 'size3', content: 'B2', top: Math.round((lineY(s1) + s2.top) / 2), left: 400})
  const c = await T.mark({type: 'txt', subtype: 'size3', content: 'C3', top: s3.top + 10, left: 400})
  AObjet.deselectAll()
  const tops = () => [s0.top, s1.top, s2.top, s3.top, a.top, b.top, c.top]
  const t0 = tops()
  try {
    s1.editMeasureOffset()
    const f = panel().querySelector('input.range-value')
    f.value = String(s1.measureOffset + 100) ; f.dispatchEvent(new Event('input'))
    const t1 = tops()
    T.eq(t1.slice(0, 2), t0.slice(0, 2), 'systèmes précédents et le système : immobiles')
    T.eq(t1[4], t0[4], 'marque du système (au-dessus de sa ligne) : immobile')
    T.eq([t1[2] - t0[2], t1[3] - t0[3]], [100, 100], 'systèmes suivants repoussés')
    T.eq([t1[5] - t0[5], t1[6] - t0[6]], [100, 100], 'marques suivantes repoussées')
    MeasureOffsetEditor.close()
    T.eq(tops(), t0, 'Renoncer : tout revenu')
    // Préférence : chaque ligne (sans distance propre) repousse la suite
    PreferencesPanel.toggle() ; await T.wait(100)
    const pf = document.querySelector('#pref-measure_line_offset')
    const old = Number(pf.value)
    pf.value = String(old + 50) ; pf.dispatchEvent(new Event('change'))
    const t2 = tops()
    T.eq([t2[0] - t0[0], t2[1] - t0[1], t2[2] - t0[2], t2[3] - t0[3]], [0, 50, 100, 150], 'préférence : systèmes repoussés (cumul)')
    T.eq([t2[5] - t0[5], t2[6] - t0[6]], [100, 150], 'préférence : marques repoussées')
    pf.value = String(old) ; pf.dispatchEvent(new Event('change'))
    T.eq(tops(), t0, 'préférence remise : tout revenu')
    PreferencesPanel.toggle()
  } finally { [a, b, c].forEach(m => AObjet.remove(m)) }
})
