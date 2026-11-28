// Molette sur un panneau ouvert : le panneau défile, jamais la table, même
// arrivé au bout (#297). Vraie molette.
const { PreferencesPanel } = await T.imp('PreferencesPanel')

T.test('préférences : défilement du panneau, table immobile (#297)', async () => {
  window.scrollTo({top: 800, behavior: 'instant'})
  PreferencesPanel.toggle() ; await T.wait(200)
  const panel = document.querySelector('#preferences-panel')
  try {
    const r = panel.getBoundingClientRect()
    const x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2)
    const sy = window.scrollY
    panel.scrollTop = 0
    await T.invoke('test:realWheel', {x, y, dy: 300})
    T.ok(panel.scrollTop > 0, `panneau défilé (${panel.scrollTop})`)
    T.eq(window.scrollY, sy, 'table immobile')
    panel.scrollTop = panel.scrollHeight
    await T.wait(50)
    await T.invoke('test:realWheel', {x, y, dy: 600})
    T.eq(window.scrollY, sy, 'au bout du panneau : table immobile')
    await T.invoke('test:realWheel', {x, y, dy: -600})
    panel.scrollTop = 0 ; await T.wait(50)
    await T.invoke('test:realWheel', {x, y, dy: -600})
    T.eq(window.scrollY, sy, 'en haut du panneau : table immobile')
  } finally { PreferencesPanel.toggle() }
  // Hors panneau : la table défile
  const sy2 = window.scrollY
  await T.invoke('test:realWheel', {x: 50, y: 400, dy: 300})
  T.ok(window.scrollY != sy2, 'hors panneau : table défilée')
})
