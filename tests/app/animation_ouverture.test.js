// « Animer l’animation à l’ouverture » : libellé, animation lancée à la
// réouverture quand la préférence est cochée (phase 2)
const { Preferences } = await T.imp('Preferences')
const { AnalyseSaver } = await T.imp('AnalyseSaver')
const { Animation } = await T.imp('Animation')

if ( T.phase == 1 ) {
  T.test('libellés, aucune animation sans la préférence', async () => {
    const row = document.querySelector('#pref-animate').closest('.div-data')
    T.eq(row.querySelector('label').textContent, 'Animer l’animation à l’ouverture', 'libellé')
    const tempo = document.querySelector('#pref-animation_tempo').closest('.div-data')
    T.no(tempo.nextElementSibling && tempo.nextElementSibling.classList.contains('description'), 'aucune explication sous le tempo')
    await T.wait(800)
    T.no(Animation.sequence, 'pas d’animation à l’ouverture (préférence décochée)')
    Preferences.saveData('animate', true) ; Preferences.set('animate', true)
    T.eq(await AnalyseSaver.save(), true, 'enregistrement')
  })
} else {
  T.test('animation lancée à l’ouverture (préférence cochée)', async () => {
    T.eq(Preferences.get('animate'), true, 'préférence relue')
    await T.until(() => Animation.sequence && Animation.sequence.length, 'animation lancée', 6000)
    T.ok(document.querySelector('#animation_box') || Animation.box, 'boite de l’animation')
    Animation.finish && Animation.finish()
  })
}
