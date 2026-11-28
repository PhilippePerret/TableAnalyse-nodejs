// fixture: analyse-decoupee
// Options > « Verrouiller les numéros de mesure » : non verrouillés après
// la découpe (#295)
const { Systeme } = await T.imp('Systeme')
const { Forme } = await T.imp('Forme')
const { AObjet } = await T.imp('AObjet')
const { OptionsTool } = await T.imp('MenuOptions')
const { Preferences } = await T.imp('Preferences')
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { AnalyseSaver } = await T.imp('AnalyseSaver')

const option = () => document.querySelector('option[value="toggleLockMeasures"]')
const gap = sys => parseFloat(sys.measureLine.style.top) - (sys.top + sys.obj.offsetHeight)
const marks = () => Forme.measureMarks.map(x => x.mark)

T.test('après la découpe : numéros non verrouillés, option décochée (#295)', async () => {
  T.ok(option(), 'menu « Verrouiller les numéros de mesure »')
  T.eq(option().textContent.trim(), 'Verrouiller les numéros de mesure', 'libellé')
  T.eq(option().dataset.checked, 'false', 'décoché')
  T.ok(marks().length > 0 && marks().every(m => !m.isLocked), 'aucun numéro verrouillé')
})

T.test('verrouillés, puis déverrouillés (#295)', async () => {
  const [s0, s1] = Systeme.all
  const old = Preferences.get('measure_line_offset')
  const g0 = gap(s0)
  try {
    OptionsTool.onActivate_toggleLockMeasures(null, option())
    T.eq(option().dataset.checked, 'true', 'coché')
    T.ok(marks().every(m => m.isLocked), 'numéros verrouillés')
    AObjet.deselectAll() ; AObjet.addToSelection(marks()[0])
    T.eq((AObjet.selection || []).length, 0, 'numéro non sélectionnable')
    // Ligne : ni sélection ni déplacement à la souris
    T.eq(getComputedStyle(s0.measureLine).pointerEvents, 'none', 'ligne insensible à la souris')
    // Réglages de distance : LNM (ligne + numéros) placée où voulu
    const numTop = m => parseFloat(m.obj.style.top)
    const m0 = Systeme.measureMarksOf(s0)[0], m1 = Systeme.measureMarksOf(s1)[0]
    const n0 = numTop(m0), n1 = numTop(m1)
    Preferences.set('measure_line_offset', Number(old) + 100)
    PreferencesPanel.onChange_measure_line_offset()
    T.eq(Math.round(gap(s0)), Number(old) + 100, 'préférence : ligne déplacée')
    T.eq(Math.round(numTop(m0) - n0), 100, 'préférence : numéros déplacés')
    s1.editMeasureOffset()
    const f = document.querySelector('#measure_offset_editor input.range-value')
    T.ok(f, '« Distance avec la numérotation… » accessible')
    f.value = '300' ; f.dispatchEvent(new Event('input'))
    document.querySelector('#measure_offset_editor .btn-default').click()
    T.eq(Math.round(gap(s1)), 300, 'distance du système : ligne déplacée')
    T.ok(Math.abs(numTop(m1) - n1) > 50, 'distance du système : numéros déplacés')
    T.ok(marks().every(m => m.isLocked), 'numéros toujours verrouillés')
    delete s1.data.measure_offset
    await AnalyseSaver.save()
    T.includes(await T.readFile('preferences.yaml'), 'lock_measures: true', 'option enregistrée')
    // Déverrouillage
    OptionsTool.onActivate_toggleLockMeasures(null, option())
    T.eq(option().dataset.checked, 'false', 'décoché')
    T.ok(marks().every(m => !m.isLocked), 'numéros déverrouillés')
  } finally {
    Preferences.set('measure_line_offset', old)
    PreferencesPanel.onChange_measure_line_offset()
  }
})
