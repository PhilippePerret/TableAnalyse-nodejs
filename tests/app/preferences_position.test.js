// Panneau des préférences : toujours ouvert au même endroit, position
// mémorisée (déplacement compris), quel que soit le dernier clic (#239)
const { PreferencesPanel } = await T.imp('PreferencesPanel')

const panel = () => document.querySelector('#preferences-panel')
const pos   = () => { const r = panel().getBoundingClientRect() ; return {left: Math.round(r.left), top: Math.round(r.top)} }
const open  = async () => { PreferencesPanel.panneau.isOpened || PreferencesPanel.toggle() ; await T.wait(150) }
const close = async () => { PreferencesPanel.panneau.isOpened && PreferencesPanel.toggle() ; await T.wait(50) }
const clickAt = (x, y) => T.mouse(document.body, 'mousedown', {clientX: x, clientY: y})

T.test('même position quel que soit le dernier clic', async () => {
  clickAt(100, 120)
  await open()
  const p1 = pos()
  await close()
  clickAt(window.innerWidth - 50, window.innerHeight - 50)
  await open()
  T.eq(pos(), p1, 'position inchangée après un clic ailleurs')
  await close()
})

T.test('position mémorisée après un déplacement', async () => {
  await open()
  const head = panel().querySelector('.panneau-head')
  T.mouse(head, 'mousedown', {clientX: 10, clientY: 10})
  Object.assign(panel().style, {left: '60px', top: '80px'})
  T.mouse(head, 'mouseup', {clientX: 10, clientY: 10})
  const moved = pos()
  await close()
  clickAt(window.innerWidth / 2, window.innerHeight / 2)
  await open()
  T.eq(pos(), moved, 'réouvert à la position où il a été déplacé')
  const saved = JSON.parse(localStorage.getItem('panneau-position-preferences-panel'))
  T.ok(saved && Number.isFinite(saved.left) && Number.isFinite(saved.top), 'position enregistrée')
  await close()
})
