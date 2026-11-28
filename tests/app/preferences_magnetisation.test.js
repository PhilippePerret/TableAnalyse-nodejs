// Préférence « Distance maximale de magnétisation des marques » (#246) :
// libellé, 30 px par défaut, sous « Ajuster en hauteur… », grisée et
// inaccessible quand celle-ci est décochée, effet sur les marques
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { PreferencesAppData } = await T.imp('Preferences_AppData')
const { Preferences } = await T.imp('Preferences')
const { AObjet } = await T.imp('AObjet')

const field = () => document.querySelector('#pref-snap_for_adjust_pos')
const cb    = () => document.querySelector('#pref-adjust_same_mark')

T.test('libellé, valeur par défaut, position, sans texte explicatif', async () => {
  T.eq(PreferencesAppData.snap_for_adjust_pos.default, 30, '30 px par défaut')
  const row = field().closest('.div-data')
  T.eq(row.querySelector('label').textContent, 'Distance de magnétisation (marques)', 'libellé')
  T.ok(cb().closest('.div-data').nextElementSibling === row, 'juste sous « Ajuster en hauteur »')
  T.no(row.nextElementSibling && row.nextElementSibling.classList.contains('description'), 'aucun texte explicatif')
})

T.test('grisée et inaccessible quand « Ajuster en hauteur » est décoché', async () => {
  PreferencesPanel.toggle() ; await T.wait(100)
  if ( !cb().checked ) cb().click()
  T.no(field().disabled, 'accessible (coché)')
  cb().click()
  T.no(cb().checked, 'décoché')
  T.ok(field().disabled, 'inaccessible (décoché)')
  T.ok(field().closest('.div-data').classList.contains('pref-disabled'), 'grisée')
  const row = field().closest('.div-data')
  T.eq(getComputedStyle(row).opacity, '0.4', 'toute la ligne grisée')
  T.ok(row.contains(row.querySelector('label')) && row.querySelector('label').textContent.includes('magnétisation'), 'libellé dans la ligne grisée')
  cb().click()
  T.no(field().disabled, 'de nouveau accessible')
  T.no(field().closest('.div-data').classList.contains('pref-disabled'), 'plus grisée')
  T.eq(getComputedStyle(field().closest('.div-data')).opacity, '1', 'opacité normale')
  PreferencesPanel.toggle()
})

T.test('magnétisation des marques selon la distance', async () => {
  Preferences.set('adjust_same_mark', true)
  Preferences.set('snap_for_adjust_pos', 30)
  const a = await T.mark({type: 'acc', content: 'C', top: 1000, left: 400})
  const b = await T.mark({type: 'acc', content: 'D', top: 1025, left: 600})
  T.eq(b.top, a.top, 'à 25 px : alignée')
  const c = await T.mark({type: 'acc', content: 'E', top: 1040, left: 800})
  T.eq(c.top, 1040, 'à 40 px : non alignée')
  ;[a, b, c].forEach(m => AObjet.remove(m))
})
