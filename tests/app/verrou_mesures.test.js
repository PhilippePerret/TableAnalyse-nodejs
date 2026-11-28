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
