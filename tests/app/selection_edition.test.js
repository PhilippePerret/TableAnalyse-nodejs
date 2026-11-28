// Sélection (clic, Maj-clic, rectangle, Échap), déplacement au clavier,
// annulation (⌘Z), copier/couper/coller (⌘C, ⌘X, ⌘V), groupes (⌘G, ⌘⇧G),
// édition par Entrée
const { AObjet } = await T.imp('AObjet')
const { Groups } = await T.imp('Groups')

const CMD = window.api.platform == 'darwin' ? {metaKey: true} : {ctrlKey: true}
const sel = () => (AObjet.selection || []).map(m => m.id).sort()
const ids = (...ms) => ms.map(m => m.id).sort()
const click = (m, opts = {}) => {
  const r = m.obj.getBoundingClientRect()
  const o = Object.assign({clientX: r.left + 3, clientY: r.top + 3, detail: 1}, opts)
  T.mouse(m.obj, 'mousedown', o) ; T.mouse(m.obj, 'mouseup', o) ; T.mouse(m.obj, 'click', o)
}
// Trois marques en haut de la page, visibles
const three = async () => {
  scrollTo(0, 0)
  const a = await T.mark({type: 'acc', content: 'A', top: 120, left: 400})
  const b = await T.mark({type: 'acc', content: 'B', top: 120, left: 600})
  const c = await T.mark({type: 'har', content: 'V', top: 180, left: 800})
  AObjet.deselectAll()
  return [a, b, c]
}
const clean = (...ms) => { AObjet.deselectAll() ; ms.forEach(m => AObjet.get(m.id) && AObjet.remove(m)) }

T.test('sélection : clic, Maj-clic, Échap', async () => {
  const [a, b, c] = await three()
  click(a)
  T.eq(sel(), ids(a), 'clic : seule sélectionnée')
  T.ok(a.obj.classList.contains('selected'), 'classe « selected »')
  click(b, {shiftKey: true})
  T.eq(sel(), ids(a, b), 'Maj-clic : ajoutée')
  click(a, {shiftKey: true})
  T.eq(sel(), ids(b), 'Maj-clic sur une sélectionnée : retirée')
  click(c)
  T.eq(sel(), ids(c), 'clic : remplace la sélection')
  T.key(document.body, 'Escape')
  T.eq(sel(), [], 'Échap : plus rien de sélectionné')
  clean(a, b, c)
})

T.test('sélection par rectangle', async () => {
  const [a, b, c] = await three()
  const r1 = a.obj.getBoundingClientRect(), r2 = b.obj.getBoundingClientRect()
  const from = {clientX: r1.left - 20, clientY: r1.top - 20}
  const to   = {clientX: r2.right + 10, clientY: r2.bottom + 10}
  T.mouse(document.body, 'mousedown', from)
  T.mouse(document, 'mousemove', {clientX: from.clientX + 10, clientY: from.clientY + 10})
  T.mouse(document, 'mousemove', to)
  T.ok(document.querySelector('#selection_rect'), 'rectangle dessiné')
  T.mouse(document.body, 'mouseup', to)
  T.mouse(document.body, 'click', Object.assign({detail: 1}, to))
  T.eq(sel(), ids(a, b), 'marques touchées sélectionnées')
  T.no(document.querySelector('#selection_rect'), 'rectangle retiré')
  clean(a, b, c)
})

// Marque entièrement dans le rectangle, quel que soit le sens (#302)
T.test('sélection par rectangle : seulement les marques entièrement dedans (#302)', async () => {
  const drag = (from, to) => {
    AObjet.deselectAll()
    T.mouse(document.body, 'mousedown', from)
    T.mouse(document, 'mousemove', {clientX: from.clientX + (to.clientX > from.clientX ? 10 : -10), clientY: from.clientY + (to.clientY > from.clientY ? 10 : -10)})
    T.mouse(document, 'mousemove', to)
    T.mouse(document.body, 'mouseup', to)
    T.mouse(document.body, 'click', Object.assign({detail: 1}, to))
  }
  const [a, b, c] = await three()
  const r1 = a.obj.getBoundingClientRect(), r2 = b.obj.getBoundingClientRect()
  // Haut-gauche → bas-droite : b coupé à droite
  drag({clientX: r1.left - 10, clientY: r1.top - 10}, {clientX: r2.right - 5, clientY: r2.bottom + 10})
  T.eq(sel(), ids(a), 'haut-gauche → bas-droite : b (coupée) exclue')
  // Bas-droite → haut-gauche : a coupée à gauche
  drag({clientX: r2.right + 10, clientY: r2.bottom + 10}, {clientX: r1.left + 5, clientY: r1.top - 10})
  T.eq(sel(), ids(b), 'bas-droite → haut-gauche : a (coupée) exclue')
  // Coupées en haut
  drag({clientX: r1.left - 10, clientY: r1.top + 3}, {clientX: r2.right + 10, clientY: r2.bottom + 10})
  T.eq(sel(), [], 'coupées en haut : aucune')
  clean(a, b, c)
})

T.test('déplacement aux flèches (4 px, Maj ×10, Alt 1 px) et annulation ⌘Z', async () => {
  const [a, b, c] = await three()
  AObjet.addToSelection(a) ; AObjet.addToSelection(b)
  const [la, lb, ta] = [a.left, b.left, a.top]
  T.key(document.body, 'ArrowRight')
  T.eq([a.left, b.left], [la + 4, lb + 4], 'flèche droite : 4 px')
  T.key(document.body, 'ArrowDown', {shiftKey: true})
  T.eq(a.top, ta + 40, 'Maj-flèche bas : 40 px')
  T.key(document.body, 'ArrowLeft', {altKey: true})
  T.eq(a.left, la + 3, 'Alt-flèche gauche : 1 px')
  T.eq(c.left, 800, 'marque non sélectionnée immobile')
  // Annulations successives (chaque propriété de chaque marque)
  for ( let i = 0 ; i < 6 ; ++i ) T.key(document.body, 'z', CMD)
  T.eq([a.left, a.top, b.left], [la, ta, lb], '⌘Z : positions d’origine')
  clean(a, b, c)
})

T.test('copier / coller, couper / coller', async () => {
  const [a, b, c] = await three()
  AObjet.addToSelection(a) ; AObjet.addToSelection(b)
  const n = AObjet.items.length
  T.key(document.body, 'c', CMD)
  T.key(document.body, 'v', CMD)
  T.eq(AObjet.items.length, n + 2, '⌘V : deux copies')
  const copies = AObjet.selection.slice()
  T.eq(copies.map(m => m.content).sort(), ['A', 'B'], 'copies sélectionnées, mêmes contenus')
  T.ok(copies.every(m => ![a.id, b.id].includes(m.id)), 'nouveaux identifiants')
  const [ca, cb] = copies.sort((x, y) => x.left - y.left)
  T.eq(cb.left - ca.left, b.left - a.left, 'positions relatives gardées')
  T.ok(cb.obj.getBoundingClientRect().right <= innerWidth, 'copies visibles')
  // Couper
  AObjet.deselectAll() ; AObjet.addToSelection(c)
  T.key(document.body, 'x', CMD)
  T.no(AObjet.get(c.id), '⌘X : marque retirée')
  T.key(document.body, 'v', CMD)
  const pasted = AObjet.selection[0]
  T.eq([pasted.type, pasted.content], ['har', 'V'], '⌘V après ⌘X : marque recréée')
  clean(a, b, ca, cb, pasted)
})

// Collage à la souris, sinon au milieu de la fenêtre ; groupe entier
// copié (#279). Vrai déplacement de souris, page défilée.
const rectOf = ms => {
  const rs = ms.map(m => m.obj.getBoundingClientRect())
  return {left: Math.min(...rs.map(r => r.left)), top: Math.min(...rs.map(r => r.top)), right: Math.max(...rs.map(r => r.right)), bottom: Math.max(...rs.map(r => r.bottom))}
}
T.test('coller à l’endroit de la souris (#279)', async () => {
  window.scrollTo({top: 1000, behavior: 'instant'})
  const a = await T.mark({type: 'acc', content: 'A', top: 1150, left: 300})
  const b = await T.mark({type: 'har', content: 'V', top: 1250, left: 450})
  const made = []
  try {
    AObjet.deselectAll() ; AObjet.addToSelection(a) ; AObjet.addToSelection(b)
    T.key(document.body, 'c', CMD)
    await T.invoke('test:realMove', {x: 700, y: 400})
    T.key(document.body, 'v', CMD)
    made.push(...AObjet.selection)
    T.eq(made.length, 2, 'deux copies')
    const r = rectOf(made)
    T.ok(Math.abs(r.left - 700) <= 2 && Math.abs(r.top - 400) <= 2, `coin haut gauche à la souris (${Math.round(r.left)}, ${Math.round(r.top)})`)
    const [ca, cb] = made.slice().sort((x, y) => x.left - y.left)
    T.eq([cb.left - ca.left, cb.top - ca.top], [b.left - a.left, b.top - a.top], 'positions relatives gardées')
    // Deuxième collage ailleurs
    await T.invoke('test:realMove', {x: 400, y: 500})
    T.key(document.body, 'v', CMD)
    const second = AObjet.selection.slice()
    made.push(...second)
    const r2 = rectOf(second)
    T.ok(Math.abs(r2.left - 400) <= 2 && Math.abs(r2.top - 500) <= 2, 'deuxième collage à la nouvelle position')
  } finally { clean(a, b, ...made) }
})

T.test('coller au milieu de la fenêtre quand la souris est hors de la table (#279)', async () => {
  window.scrollTo({top: 1000, behavior: 'instant'})
  const a = await T.mark({type: 'acc', content: 'A', top: 1150, left: 300})
  const made = []
  try {
    AObjet.deselectAll() ; AObjet.addToSelection(a)
    T.key(document.body, 'c', CMD)
    document.documentElement.dispatchEvent(new MouseEvent('mouseleave'))
    T.key(document.body, 'v', CMD)
    made.push(...AObjet.selection)
    const r = rectOf(made)
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2
    const band = document.querySelector('#titlebar')
    const top = band ? band.getBoundingClientRect().bottom : 0
    const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight
    T.ok(Math.abs(cx - W / 2) <= 40, `centré horizontalement (${Math.round(cx)} / ${W / 2})`)
    T.ok(Math.abs(cy - (top + H) / 2) <= 40, `centré verticalement (${Math.round(cy)} / ${(top + H) / 2})`)
  } finally { clean(a, ...made) }
})

T.test('copier une marque d’un groupe : tout le groupe est collé (#279)', async () => {
  const [a, b, c] = await three()
  const made = []
  try {
    ;[a, b].forEach(m => AObjet.addToSelection(m))
    Groups.group([a, b])
    const g = Groups.outerOf(a)
    AObjet.deselectAll() ; AObjet.addToSelection(a) ; AObjet.addToSelection(c)
    T.key(document.body, 'c', CMD)
    await T.invoke('test:realMove', {x: 300, y: 450})
    T.key(document.body, 'v', CMD)
    made.push(...AObjet.selection)
    T.eq(made.map(m => m.content).sort(), ['A', 'B', 'V'], 'groupe entier + marque seule')
    const byC = Object.fromEntries(made.map(m => [m.content, m]))
    const ng = Groups.outerOf(byC.A)
    T.ok(ng && ng != g && Groups.outerOf(byC.B) == ng, 'copies du groupe : nouveau groupe')
    T.no(Groups.outerOf(byC.V), 'marque seule : sans groupe')
  } finally { clean(a, b, c, ...made) }
})

T.test('groupes : ⌘G, sélection du groupe entier, ⌘⇧G', async () => {
  const [a, b, c] = await three()
  AObjet.addToSelection(a) ; AObjet.addToSelection(b)
  T.key(document.body, 'g', CMD)
  T.ok(Groups.outerOf(a) && Groups.outerOf(a) == Groups.outerOf(b), 'même groupe')
  T.no(Groups.outerOf(c), 'troisième marque hors groupe')
  AObjet.deselectAll()
  click(a)
  T.eq(sel(), ids(a, b), 'clic sur une marque groupée : tout le groupe')
  // Groupe dans un groupe
  AObjet.addToSelection(c)
  T.key(document.body, 'g', CMD)
  AObjet.deselectAll() ; click(c)
  T.eq(sel(), ids(a, b, c), 'groupe imbriqué : tout le groupe extérieur')
  T.key(document.body, 'G', Object.assign({shiftKey: true}, CMD))
  AObjet.deselectAll() ; click(a)
  T.eq(sel(), ids(a, b), '⌘⇧G : retour au groupe intérieur')
  T.key(document.body, 'G', Object.assign({shiftKey: true}, CMD))
  AObjet.deselectAll() ; click(a)
  T.eq(sel(), ids(a), 'plus aucun groupe')
  clean(a, b, c)
})

T.test('Entrée : édition de la marque seule sélectionnée', async () => {
  const [a, b, c] = await three()
  AObjet.addToSelection(a)
  T.key(document.body, 'Enter')
  T.ok(a.editor && a.editor.obj && a.editor.obj.getClientRects().length, 'éditeur ouvert')
  T.eq(a.editor.textField.value, 'A', 'contenu dans le champ')
  a.editor.textField.value = 'Am'
  a.editor.onClickOK()
  T.eq(a.content, 'Am', 'contenu modifié')
  AObjet.addToSelection(b)
  T.key(document.body, 'Enter')
  T.no(b.editor, 'plusieurs marques sélectionnées : pas d’édition')
  clean(a, b, c)
})

// Plusieurs marques déplacées : TOUTES se calent sur les marques déjà
// posées (#305). Vrai glissement, page défilée.
T.test('déplacement de plusieurs accords : tous calés sur les marques posées (#305)', async () => {
  const { Preferences } = await T.imp('Preferences')
  const oldAdj = Preferences.get('adjust_same_mark')
  Preferences.set('adjust_same_mark', true)
  window.scrollTo({top: 1000, behavior: 'instant'})
  const p1 = await T.mark({type: 'acc', content: 'C', top: 1300, left: 300})
  const p2 = await T.mark({type: 'har', content: 'I', top: 1300, left: 900})
  const g  = await T.mark({type: 'acc', content: 'G', top: 1500, left: 500})
  const d  = await T.mark({type: 'acc', content: 'D', top: 1508, left: 700})
  const h  = await T.mark({type: 'har', content: 'V', top: 1512, left: 600})
  try {
    AObjet.deselectAll()
    ;[g, d, h].forEach(m => AObjet.addToSelection(m))
    const r = g.obj.getBoundingClientRect()
    await T.invoke('test:realDrag', {x: Math.round(r.left + Math.min(8, r.width / 2)), y: Math.round(r.top + Math.min(8, r.height / 2)), dx: 0, dy: -195})
    T.eq([g.top, d.top, h.top], [1300, 1300, 1300], `toutes calées (${g.top}, ${d.top}, ${h.top})`)
    T.eq([p1.top, p2.top], [1300, 1300], 'marques posées immobiles')
  } finally {
    Preferences.set('adjust_same_mark', oldAdj)
    clean(p1, p2, g, d, h) ; window.scrollTo({top: 0, behavior: 'instant'})
  }
})
