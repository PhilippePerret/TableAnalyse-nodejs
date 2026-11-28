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
    s0.positionne(s0.top + 30)
    T.eq(m.top, mTop, '1er système déplacé : marque immobile')
    s0.positionne(s0.top - 30)
    s1.positionne(top1 + 30)
    T.eq(m.top, mTop + 30, '2e système déplacé : marque déplacée avec lui')
  } finally { s1.positionne(top1) ; AObjet.remove(m) }
})
