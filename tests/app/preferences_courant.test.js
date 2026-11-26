// Préférences de la fenêtre : boutons « Largeur actuelle », « Hauteur
// actuelle », « Scroll courant » (#248)
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { Preferences } = await T.imp('Preferences')

const btnOf = key => document.querySelector(`#pref-${key}`).closest('.div-data').querySelector('button.btn-current')

T.test('boutons à côté des champs, libellés', async () => {
  T.eq(btnOf('window_width') && btnOf('window_width').textContent, 'Largeur actuelle', 'largeur')
  T.eq(btnOf('window_height') && btnOf('window_height').textContent, 'Hauteur actuelle', 'hauteur')
  T.eq(btnOf('last_scroll') && btnOf('last_scroll').textContent, 'Scroll courant', 'scroll')
})

T.test('valeur courante mise dans le champ et enregistrée', async () => {
  window.scrollTo({top: 640}) ; await T.wait(100)
  const scroll = Math.round(window.scrollY)
  T.ok(scroll > 0, 'page défilée')
  PreferencesPanel.toggle() ; await T.wait(100)
  const cases = [['window_width', window.outerWidth], ['window_height', window.outerHeight], ['last_scroll', scroll]]
  for ( const [key, expected] of cases ) {
    const field = document.querySelector(`#pref-${key}`)
    field.value = '1'
    btnOf(key).click()
    T.eq(field.value, String(expected), `${key} : champ`)
    T.eq(String(Preferences.get(key)), String(expected), `${key} : préférence`)
  }
  T.ok(PreferencesPanel.panneau.isOpened, 'panneau resté ouvert')
  PreferencesPanel.toggle()
})
