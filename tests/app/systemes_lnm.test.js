// fixture: analyse-decoupee
// Appartenance des marques aux systèmes avec la ligne des numéros de
// mesure (LNM) : entre la LNM du système précédent et la sienne ; une
// marque déplacée change de système et ne suit plus l'ancien (#285)
const { AObjet } = await T.imp('AObjet')
const { Systeme } = await T.imp('Systeme')

const lineY = sys => sys.top + sys.obj.offsetHeight + Systeme.measureLineOffset

T.test('marques au-dessus / en dessous d’une LNM : bon système (#285)', async () => {
  const [s0, s1, s2] = Systeme.all
  const made = []
  try {
    const a = await T.mark({type: 'txt', subtype: 'size3', content: 'A', top: lineY(s0) - 30, left: 400}) ; made.push(a)
    const b = await T.mark({type: 'txt', subtype: 'size3', content: 'B', top: lineY(s0) + 10, left: 400}) ; made.push(b)
    const c = await T.mark({type: 'txt', subtype: 'size3', content: 'C', top: s1.top - 20, left: 400}) ; made.push(c)
    const d = await T.mark({type: 'txt', subtype: 'size3', content: 'D', top: lineY(s1) - 5, left: 400}) ; made.push(d)
    T.eq(Systeme.getSystemeAssociated(a), s0, 'au-dessus de la LNM du 1er : 1er système')
    T.eq(Systeme.getSystemeAssociated(b), s1, 'sous la LNM du 1er : 2e système')
    T.eq(Systeme.getSystemeAssociated(c), s1, 'juste au-dessus du 2e : 2e système')
    T.eq(Systeme.getSystemeAssociated(d), s1, 'juste au-dessus de la LNM du 2e : 2e système')
    T.ok(s1.objets.includes(b) && !s0.objets.includes(b), 'B dans les objets du 2e seulement')
  } finally { made.forEach(m => AObjet.remove(m)) }
})

T.test('marque déplacée dans un autre système : ne suit plus l’ancien (#285)', async () => {
  const [s0, s1] = Systeme.all
  const m = await T.mark({type: 'txt', subtype: 'size3', content: 'M', top: lineY(s0) - 40, left: 500})
  const top1 = s1.top
  try {
    T.ok(s0.objets.includes(m), 'dans le 1er système')
    // Déplacée sous la LNM du 1er : 2e système
    m.top = lineY(s0) + 20
    m.associateWithSystem()
    T.ok(s1.objets.includes(m), 'dans le 2e système')
    T.no(s0.objets.includes(m), 'plus dans le 1er')
    const mTop = m.top
    s1.positionne(top1 + 30)
    T.eq(m.top, mTop + 30, '2e système déplacé : marque déplacée avec lui')
  } finally { s1.positionne(top1) ; AObjet.remove(m) }
})

// Déplacement d'un système (mode normal) : ses marques et tout ce qui
// suit le suivent, AUCUNE marque du système précédent (#301)
T.test('système déplacé : marques du précédent immobiles (#301)', async () => {
  const [s0, s1, s2, s3] = Systeme.all
  const made = []
  const mk = async (content, top, height) => { const m = await T.mark({type: 'mot', content, top, left: 400}) ; height && (m.obj.style.height = `${height}px`, m.height = height) ; made.push(m) ; return m }
  try {
    // Motif du précédent qui descend sous sa LNM (haut au-dessus)
    const p  = await mk('P', lineY(s1) - 40, 200)
    const p2 = await mk('P2', s1.top + 20)
    const m  = await mk('M', Math.round((lineY(s1) + s2.top) / 2))
    const n  = await mk('N', s3.top + 10)
    // Marque du système passée au précédent aux flèches (Maj : 40 px)
    const { AMark } = await T.imp('AMark')
    const q = await mk('Q', Math.round((lineY(s1) + s2.top) / 2))
    AObjet.deselectAll() ; AObjet.addToSelection(q)
    while ( q.top > lineY(s1) - 60 ) AMark.moveSelection('up', 10, 4)
    AObjet.deselectAll()
    // Appartenance relevée AVANT des déplacements du précédent
    const before = Object.fromEntries(made.map(x => [x.content, x.top]))
    const tops = Systeme.all.map(s => s.top)
    // Déplacement du précédent puis du système (mode normal)
    Systeme.toggleLock(null, false, true)
    const move = (sys, dy) => {
      sys.moving = true
      sys.rectTop = 0
      sys.toggleMoving({clientY: sys.top + dy, altKey: false, shiftKey: false, preventDefault(){}, stopPropagation(){}})
    }
    move(s2, 100)
    T.eq(s2.top, tops[2] + 100, 'système déplacé')
    T.eq(p.top, before.P, 'motif du précédent (débordant sous sa LNM) : immobile')
    T.eq(p2.top, before.P2, 'autre marque du précédent : immobile')
    T.eq(q.top, before.Q, 'marque passée au précédent (flèches) : immobile')
    T.eq(m.top, before.M + 100, 'marque du système : suit')
    T.eq(n.top, before.N + 100, 'marque d’un système suivant : suit')
    T.eq(s3.top, tops[3] + 100, 'système suivant : suit')
    T.eq(s1.top, tops[1], 'système précédent : immobile')
    Systeme.toggleLock(null, false, true)
    move(s2, -100)
  } finally { made.forEach(x => AObjet.remove(x)) ; Systeme.toggleLock(null, true) }
})
