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
  T.ok(cb.obj.getBoundingClientRect().right <= innerWidth, 'copies visibles (à droite de la fenêtre)')
  // Couper
  AObjet.deselectAll() ; AObjet.addToSelection(c)
  T.key(document.body, 'x', CMD)
  T.no(AObjet.get(c.id), '⌘X : marque retirée')
  T.key(document.body, 'v', CMD)
  const pasted = AObjet.selection[0]
  T.eq([pasted.type, pasted.content], ['har', 'V'], '⌘V après ⌘X : marque recréée')
  clean(a, b, ca, cb, pasted)
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
