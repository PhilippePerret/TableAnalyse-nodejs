// Préférences, section « Général » : « Actualisation automatique de
// l'application » (préférence de l'application), « Vérifier la version »,
// « Actualiser maintenant » (#249)
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { Preferences } = await T.imp('Preferences')
const { Current } = await T.imp('Current')

const row = () => document.querySelector('#preferences-panel div.pref-version')
const status = () => row().querySelector('.pref-version-status').textContent

T.test('case à cocher et boutons à la fin de la section « Général »', async () => {
  const cb = document.querySelector('#pref-auto_update')
  T.ok(cb, 'case à cocher')
  T.eq(cb.closest('label, .div-data').textContent.trim(), 'Actualisation automatique de l’application', 'libellé')
  T.ok(row(), 'ligne de la version')
  T.eq(row().querySelector('.btn-check-version').textContent, 'Vérifier la version', 'bouton de vérification')
  T.eq(row().querySelector('.btn-update-now').textContent, 'Actualiser maintenant', 'bouton d’actualisation')
  T.ok(row().querySelector('.btn-update-now').disabled, 'actualisation impossible avant vérification')
  // Fin de la section « Général » : avant le titre de la section suivante
  let el = cb.closest('.div-data'), seen = []
  while ( (el = el.nextElementSibling) && !el.classList.contains('pref-group') ) seen.push(el)
  T.ok(seen.includes(row()), 'dans la section « Général »')
  T.eq(cb.closest('.div-data').nextElementSibling, row(), 'boutons juste sous « Actualisation automatique » (#282)')
})

// Aucun texte d'explication, libellés exacts (#282)
T.test('sans baratin : libellés exacts, aucune description (#282)', async () => {
  const P = document.querySelector('#preferences-panel')
  const divOf = id => P.querySelector(`#pref-${id}`).closest('.div-data')
  for ( const id of ['auto_update', 'note_char'] ) {
    const next = divOf(id).nextElementSibling
    T.no(next && next.classList.contains('description'), `${id} : aucune description`)
  }
  T.ok(divOf('help_format').textContent.includes('Aide ouverte par le raccourci ⌘ + Maj + m'), 'libellé de l’aide')
  T.ok(divOf('note_char').textContent.includes('Caractère précédent une note dans les textes'), 'libellé du caractère des notes')
  T.eq([...P.querySelectorAll('#pref-note_char option')].map(o => o.textContent), ['_ (_F)', ': (:F)', '! (!F)', '^ (^F)'], 'menu du caractère des notes')
})

T.test('préférence de l’application : enregistrée hors de l’analyse', async () => {
  const before = Current.analyse.modified
  Preferences.saveData('auto_update', false)
  T.eq(Current.analyse.modified, before, 'analyse non modifiée')
  T.no('auto_update' in Preferences.getData(), 'absente des préférences de l’analyse')
  await T.wait(100)
  Preferences.data.auto_update.value = true
  await Preferences.loadAppPrefs()
  T.eq(Preferences.get('auto_update'), false, 'relue dans les préférences de l’application')
  Preferences.saveData('auto_update', true)
  await T.wait(100)
  await Preferences.loadAppPrefs()
  T.eq(Preferences.get('auto_update'), true, 'cochée de nouveau')
})

T.test('« Vérifier la version », puis « Actualiser maintenant »', async () => {
  await T.invoke('test:latestVersion', {version: '99.0.0'})
  row().querySelector('.btn-check-version').click()
  await T.until(() => status().includes('99.0.0'), 'version publiée affichée')
  T.ok(!row().querySelector('.btn-update-now').disabled, 'actualisation possible')
  row().querySelector('.btn-update-now').click()
  await T.until(async () => (await T.invoke('test:openedUrls')).includes('https://www.analyse-musicale.fr/table-analyse/'), 'page de téléchargement ouverte')
  // Même version : à jour, pas d'actualisation
  const res = await T.invoke('app:checkVersion')
  await T.invoke('test:latestVersion', {version: res.current})
  row().querySelector('.btn-check-version').click()
  await T.until(() => status().includes('à jour'), 'application à jour')
  T.ok(row().querySelector('.btn-update-now').disabled, 'actualisation impossible')
  await T.invoke('test:latestVersion', {version: null})
})
