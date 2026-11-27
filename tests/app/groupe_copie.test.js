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
