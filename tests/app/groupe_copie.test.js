// Alt + glisser une marque d'un groupe : tout le groupe est copié, mêmes
// positions relatives, dans un nouveau groupe (#269)
const { AObjet } = await T.imp('AObjet')
const { Groups } = await T.imp('Groups')

const altDrag = (m, dx, dy) => {
  const r = m.obj.getBoundingClientRect()
  const x = r.left + r.width / 2, y = r.top + r.height / 2
  const at = (cx, cy) => ({clientX: cx, clientY: cy, pageX: cx + window.scrollX, pageY: cy + window.scrollY, altKey: true})
  T.mouse(m.obj, 'mousedown', at(x, y))
  T.mouse(document, 'mousemove', at(x + dx / 2, y + dy / 2))
  T.mouse(document, 'mousemove', at(x + dx, y + dy))
  T.mouse(document, 'mouseup', at(x + dx, y + dy))
}
const newIds = () => { const before = new Set(AObjet.items.map(m => m.id)) ; return () => AObjet.items.filter(m => !before.has(m.id)) }

T.test('Alt + glisser une marque d’un groupe : groupe entier copié', async () => {
  const a = await T.mark({type: 'acc', content: 'C', top: 1600, left: 500})
  const b = await T.mark({type: 'har', content: 'I', top: 1700, left: 520})
  const c = await T.mark({type: 'acc', content: 'G7', top: 1600, left: 800})
  const made = []
  try {
    AObjet.deselectAll()
    ;[a, b, c].forEach(m => AObjet.addToSelection(m))
    Groups.group([a, b, c])
    const g = Groups.outerOf(a)
    T.ok(g && Groups.outerOf(c) == g, 'groupe')
    AObjet.deselectAll()
    const orig = [a, b, c].map(m => [m.left, m.top])
    const found = newIds()
    altDrag(b, 200, 300)
    made.push(...found())
    T.eq(made.length, 3, 'trois copies')
    T.eq([a, b, c].map(m => [m.left, m.top]), orig, 'originaux à leur place')
    const byContent = Object.fromEntries(made.map(m => [m.content, m]))
    T.eq(Object.keys(byContent).sort(), ['C', 'G7', 'I'], 'toutes les marques du groupe')
    const dx = byContent.I.left - b.left, dy = byContent.I.top - b.top
    T.ok(Math.abs(dx - 200) <= 40 && Math.abs(dy - 300) <= 40, 'déplacées à l’endroit lâché')
    T.eq([byContent.C.left - dx, byContent.C.top - dy], [a.left, a.top], 'C : même position relative')
    T.eq([byContent.G7.left - dx, byContent.G7.top - dy], [c.left, c.top], 'G7 : même position relative')
    const ng = Groups.outerOf(byContent.C)
    T.ok(ng && ng != g, 'nouveau groupe')
    T.ok(made.every(m => Groups.outerOf(m) == ng), 'les copies forment un groupe')
    T.ok(made.every(m => m.isSelected), 'copies sélectionnées')
    T.eq(document.querySelectorAll('div.amark:not([id])').length, 0, 'aucun aperçu resté')
    // Marque seule : une seule copie
    const d = await T.mark({type: 'acc', content: 'F', top: 2200, left: 500})
    AObjet.deselectAll()
    const found2 = newIds()
    altDrag(d, 100, 100)
    const single = found2()
    T.eq(single.map(m => m.content), ['F'], 'marque seule : une copie')
    made.push(d, ...single)
  } finally {
    AObjet.deselectAll()
    ;[a, b, c, ...made].forEach(m => AObjet.get(m.id) && AObjet.remove(m))
  }
})

// Vrais événements de souris (Alt tenu), page défilée
const realAltDrag = async (m, dx, dy) => {
  const r = m.obj.getBoundingClientRect()
  await T.invoke('test:realDrag', {x: Math.round(r.left + Math.min(12, r.width / 2)), y: Math.round(r.top + Math.min(12, r.height / 2)), dx, dy, modifiers: ['alt']})
}
const centerOf = m => { const r = m.obj.getBoundingClientRect() ; return {x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2)} }

T.test('Alt + glisser une marque de la sélection (harmonies + cadence, sans groupe) : toute la sélection copiée (#277)', async () => {
  window.scrollTo({top: 1000, behavior: 'instant'})
  const h1 = await T.mark({type: 'har', content: 'I', top: 1300, left: 500})
  const h2 = await T.mark({type: 'har', content: 'V', top: 1300, left: 700})
  const cad = await T.mark({type: 'cad', subtype: 'par', content: 'I', top: 1420, left: 900})
  const made = []
  try {
    AObjet.deselectAll()
    ;[h1, h2, cad].forEach(m => AObjet.addToSelection(m))
    const orig = [h1, h2, cad].map(m => [m.left, m.top])
    const found = newIds()
    await realAltDrag(cad, 150, 250)
    made.push(...found())
    T.eq(made.length, 3, 'trois copies (deux harmonies et la cadence)')
    T.eq([h1, h2, cad].map(m => [m.left, m.top]), orig, 'originaux à leur place')
    const byKey = Object.fromEntries(made.map(m => [`${m.type}:${m.content}`, m]))
    T.eq(Object.keys(byKey).sort(), ['cad:I', 'har:I', 'har:V'], 'toute la sélection')
    const c = byKey['cad:I'], dx = c.left - cad.left, dy = c.top - cad.top
    T.ok(Math.abs(dx - 150) <= 40 && Math.abs(dy - 250) <= 40, `copie à l’endroit lâché (${dx}, ${dy})`)
    T.eq([byKey['har:I'].left - dx, byKey['har:I'].top - dy], [h1.left, h1.top], 'I : même position relative')
    T.eq([byKey['har:V'].left - dx, byKey['har:V'].top - dy], [h2.left, h2.top], 'V : même position relative')
    T.ok(made.every(m => m.isSelected) && ![h1, h2, cad].some(m => m.isSelected), 'les copies deviennent la sélection')
    T.eq(document.querySelectorAll('div.amark:not([id])').length, 0, 'aucun aperçu resté')
  } finally {
    AObjet.deselectAll()
    ;[h1, h2, cad, ...made].forEach(m => AObjet.get(m.id) && AObjet.remove(m))
    window.scrollTo({top: 0, behavior: 'instant'})
  }
})

T.test('Alt + glisser (vrais événements) une marque d’un groupe non sélectionné : groupe copié', async () => {
  window.scrollTo({top: 800, behavior: 'instant'})
  const a = await T.mark({type: 'acc', content: 'C', top: 1100, left: 500})
  const b = await T.mark({type: 'acc', content: 'F', top: 1100, left: 750})
  const made = []
  try {
    Groups.group([a, b])
    AObjet.deselectAll()
    const found = newIds()
    await realAltDrag(a, 100, 200)
    made.push(...found())
    T.eq(made.map(m => m.content).sort(), ['C', 'F'], 'groupe copié')
    T.ok(Groups.outerOf(made[0]) && Groups.outerOf(made[0]) == Groups.outerOf(made[1]) && Groups.outerOf(made[0]) != Groups.outerOf(a), 'nouveau groupe')
  } finally {
    AObjet.deselectAll()
    ;[a, b, ...made].forEach(m => AObjet.get(m.id) && AObjet.remove(m))
    window.scrollTo({top: 0, behavior: 'instant'})
  }
})

T.test('glisser sans Alt (vrais événements) : la sélection se déplace, pas de copie', async () => {
  window.scrollTo({top: 800, behavior: 'instant'})
  const a = await T.mark({type: 'har', content: 'II', top: 1100, left: 500})
  const b = await T.mark({type: 'har', content: 'III', top: 1100, left: 700})
  try {
    AObjet.deselectAll()
    ;[a, b].forEach(m => AObjet.addToSelection(m))
    const found = newIds()
    const r = a.obj.getBoundingClientRect()
    const [ax, bx] = [a.left, b.left]
    await T.invoke('test:realDrag', {x: Math.round(r.left + 10), y: Math.round(r.top + 10), dx: 120, dy: 0})
    T.eq(found().length, 0, 'aucune copie')
    T.ok(Math.abs(a.left - ax - 120) <= 30 && Math.abs(b.left - bx - 120) <= 30, 'les deux déplacées')
  } finally {
    AObjet.deselectAll()
    ;[a, b].forEach(m => AObjet.get(m.id) && AObjet.remove(m))
    window.scrollTo({top: 0, behavior: 'instant'})
  }
})
