// Systèmes (verrouillage, ordre), numéros de mesure (ordre, ajout,
// renumérotation), mesure d'une marque, alignements, liaisons, forme
const { AObjet } = await T.imp('AObjet')
const { Systeme } = await T.imp('Systeme')
const { Forme } = await T.imp('Forme')
const { FormeBuilder } = await T.imp('FormeBuilder')
const { AlignMenu: MenuAligner } = await T.imp('MenuAligner')
const { Liaison } = await T.imp('Liaison')
const { AnalyseSaver } = await T.imp('AnalyseSaver')

// Numéros de mesure dans l'ordre de la partition
const ordered = () => Systeme.measureMarks.slice().sort((a, b) => (Systeme.all.indexOf(Systeme.systemOfMeasure(a)) - Systeme.all.indexOf(Systeme.systemOfMeasure(b))) || a.left - b.left)
const numbers = () => ordered().map(m => Number(m.content))
const measureMark = n => Forme.measureMarks.find(m => m.number == n).mark

T.test('numéros de mesure : 1 à 49 dans l’ordre de la partition', async () => {
  T.eq(numbers(), Array.from({length: 49}, (_, i) => i + 1), 'suite des numéros')
  T.ok(Systeme.hasMeasureLine, 'ligne des numéros')
  Systeme.all.forEach((sys, i) => T.ok(Forme.measureMarksOf(sys).length > 0, `système ${i + 1} : numéros`))
  T.eq(Forme.lastMeasure, 49, 'dernière mesure')
})

T.test('numéro de mesure ajouté sur la ligne : suivants renumérotés, puis renumérotation complète', async () => {
  const m10 = measureMark(10), m11 = measureMark(11)
  const added = await T.mark({type: 'txt', subtype: 'mes', content: '11', top: m10.top, left: Math.round((m10.left + m11.left) / 2)})
  T.eq(added.data.line, true, 'posé sur la ligne des numéros')
  T.eq(numbers(), [...Array.from({length: 11}, (_, i) => i + 1), ...Array.from({length: 39}, (_, i) => i + 12)], 'suivants décalés (+1)')
  AObjet.remove(added)
  Systeme.renumberAllMeasures()
  T.eq(numbers(), Array.from({length: 49}, (_, i) => i + 1), 'renumérotation après suppression')
})

T.test('mesure d’une marque (Forme.measureOf)', async () => {
  for ( const n of [1, 7, 20, 33, 49] ) {
    const mm = measureMark(n)
    const sys = Systeme.systemOfMeasure(mm)
    const acc = await T.mark({type: 'acc', content: 'C', top: sys.top - 80, left: mm.left + 5})
    T.eq(Forme.measureOf(acc), n, `marque au début de la mesure ${n}`)
    AObjet.remove(acc)
  }
})

T.test('verrouillage des systèmes', async () => {
  Systeme.toggleLock(null, false, true)
  T.no(Systeme.systemsLocked, 'déverrouillés')
  T.ok(Systeme.all.every(s => !s.isLocked), 'aucun système verrouillé')
  Systeme.toggleLock(null, true, true)
  T.ok(Systeme.systemsLocked, 'reverrouillés')
  T.ok(Systeme.all.every(s => s.isLocked), 'tous verrouillés')
})

T.test('alignements (haut, bas, gauche, droite, centres) et annulation', async () => {
  scrollTo(0, 0)
  const a = await T.mark({type: 'acc', content: 'A', top: 100, left: 300})
  const b = await T.mark({type: 'acc', content: 'Bm7', top: 140, left: 500})
  const c = await T.mark({type: 'acc', content: 'C', top: 120, left: 450})
  const all = [a, b, c]
  const select = () => { AObjet.deselectAll() ; all.forEach(m => AObjet.addToSelection(m)) }
  const orig = all.map(m => [m.left, m.top])
  select() ; MenuAligner.onActivate(null, 'top')
  T.eq(all.map(m => m.top), [100, 100, 100], 'haut')
  select() ; MenuAligner.onActivate(null, 'cancel')
  T.eq(all.map(m => [m.left, m.top]), orig, 'annulation')
  select() ; MenuAligner.onActivate(null, 'left')
  T.eq(all.map(m => m.left), [300, 300, 300], 'gauche')
  select() ; MenuAligner.onActivate(null, 'right')
  const rights = all.map(m => m.left + m.width)
  T.ok(rights.every(r => r == rights[0]), 'droite : bords droits alignés')
  select() ; MenuAligner.onActivate(null, 'bottom')
  const bottoms = all.map(m => m.top + m.height)
  T.ok(bottoms.every(v => v == bottoms[0]), 'bas : bords bas alignés')
  select() ; MenuAligner.onActivate(null, 'hcenter')
  const centers = all.map(m => m.left + m.width / 2)
  T.ok(centers.every(v => Math.abs(v - centers[0]) <= 1), 'centre horizontal')
  AObjet.deselectAll() ; all.forEach(m => AObjet.remove(m))
})

T.test('liaisons : relier, enregistrer, délier', async () => {
  const a = await T.mark({type: 'txt', subtype: 'size3', content: 'un', top: 1100, left: 300})
  const b = await T.mark({type: 'txt', subtype: 'size3', content: 'deux', top: 1100, left: 700})
  const acc = await T.mark({type: 'acc', content: 'C', top: 1100, left: 900})
  T.no(Liaison.canLink([a, acc]), 'un accord n’est pas reliable')
  T.ok(Liaison.canLink([a, b]), 'deux textes reliables')
  const lia = Liaison.link([a, b])
  T.ok(lia && Liaison.linkOf([a, b]) === lia, 'liaison créée')
  T.no(Liaison.canLink([a, b]), 'déjà reliées')
  T.ok(document.querySelector(`#amark-${lia.id}`) || lia.obj, 'liaison dessinée')
  await AnalyseSaver.save()
  const tags = await T.readFile('analyse_tags.yaml')
  T.includes(tags, 'type: lia', 'liaison enregistrée')
  T.includes(tags, `from: ${a.id}`, 'marque de départ') ; T.includes(tags, `to: ${b.id}`, 'marque d’arrivée')
  Liaison.unlink([a, b])
  T.no(Liaison.linkOf([a, b]), 'déliées')
  ;[a, b, acc].forEach(m => AObjet.remove(m))
})

T.test('forme : portions, construction du diagramme, tonalités', async () => {
  const at = (n, dy) => { const mm = measureMark(n) ; return {top: Systeme.systemOfMeasure(mm).top - dy, left: mm.left} }
  const p1 = await T.mark(Object.assign({type: 'frm', subtype: 'fpar', content: 'Exposition'}, at(1, 160)))
  const p2 = await T.mark(Object.assign({type: 'frm', subtype: 'fpar', content: 'Développement'}, at(20, 160)))
  const s1 = await T.mark(Object.assign({type: 'frm', subtype: 'fsec', content: 'Thème A'}, at(1, 120)))
  const s2 = await T.mark(Object.assign({type: 'frm', subtype: 'fsec', content: 'Thème B'}, at(9, 120)))
  ;[p1, p2, s1, s2].forEach(m => Forme.placeOnMeasure(m))
  const mod = await T.mark(Object.assign({type: 'mod', content: 'G'}, at(9, 80)))
  mod.left = measureMark(9).left + 30
  T.eq(Forme.measureOf(mod), 9, 'modulation à la mesure 9')
  T.eq([p1, p2, s1, s2].map(m => Forme.measureOf(m)), [1, 20, 1, 9], 'mesures des débuts de portion')
  const portions = FormeBuilder.portions(49)
  T.eq(portions.map(p => [p.name, p.from, p.to]), [['Exposition', 0, 19], ['Thème A', 0, 8], ['Thème B', 8, 19], ['Développement', 19, 49]], 'portions (une portion finit où commence la suivante de même niveau ou de niveau supérieur)')
  T.eq(FormeBuilder.keyChanges().map(k => [k.key, k.m]), [['G', 8]], 'changement de tonalité')
  T.ok(FormeBuilder.build(), 'forme construite')
  const diag = document.querySelector('#form-diagram')
  T.ok(diag, 'diagramme affiché')
  T.includes(diag && diag.textContent, 'Exposition', 'nom de partie dans le diagramme')
  T.includes(diag && diag.textContent, 'Thème B', 'nom de section dans le diagramme')
  FormeBuilder.remove()
  T.no(document.querySelector('#form-diagram'), 'diagramme retiré')
  ;[p1, p2, s1, s2, mod].forEach(m => AObjet.remove(m))
})
