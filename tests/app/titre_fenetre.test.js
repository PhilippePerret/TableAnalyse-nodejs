// Nom de la fenêtre pour le système (listes de capture : OBS, Zoom…) :
// le même que celui de la bande supérieure (#256)
const { setWindowTitle } = await T.imp('Analyse')
const { t } = await T.imp('i18n')

T.test('nom de la fenêtre = titre affiché dans la bande supérieure', async () => {
  setWindowTitle({piece_title: 'Sonate n^o^ 3', composer: 'Mozart', analyse_title: 'Analyse harmonique'})
  await T.until(async () => (await T.invoke('test:windowTitle')) == 'Sonate no 3, Mozart, Analyse harmonique', 'nom de la fenêtre')
  T.includes(document.querySelector('#window-title').innerHTML, '<sup>o</sup>', 'bande supérieure : exposant')
  setWindowTitle({piece_title: '  ', composer: ''})
  await T.until(async () => (await T.invoke('test:windowTitle')) == t('ui.app.untitled'), 'sans titre : nom par défaut')
  setWindowTitle(Object.assign({}, (await T.imp('Current')).Current.analyse.infos))
})
