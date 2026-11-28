// Extraits de partition (marque « ext ») : mesures demandées, morceaux,
// assemblage dans le compositeur, image enregistrée
const { AObjet } = await T.imp('AObjet')
const { AMExtrait } = await T.imp('AMark')
const { AnalyseSaver } = await T.imp('AnalyseSaver')

T.test('mesures demandées (« 3 », « 1-3, 7 », « 5 à 2 ») et refus', async () => {
  T.eq(AMExtrait.measureGroups('3'), [[3, 3]], 'une mesure')
  T.eq(AMExtrait.measureGroups('1-3, 7'), [[1, 3], [7, 7]], 'plage et mesure seule')
  T.eq(AMExtrait.measureGroups('5 à 2'), [[2, 5]], 'plage inversée')
  T.eq(AMExtrait.measureGroups('1–4'), [[1, 4]], 'demi-cadratin')
  T.eq(AMExtrait.measureGroups('a-3'), null, 'refus d’une valeur invalide')
})

T.test('morceaux d’un extrait sur deux systèmes', async () => {
  const ext = AMExtrait.extractOf('6-9')
  T.ok(ext && ext.pieces.length >= 3, 'en-tête + un morceau par système traversé')
  T.eq(ext.numbers.items.map(n => n.n), [6, 7, 8, 9], 'numéros des mesures de l’extrait')
  T.ok(ext.pieces.every(p => p.image && p.y2 > p.y1), 'morceaux valides')
  T.ok(new Set(ext.pieces.map(p => p.image)).size >= 2, 'deux systèmes')
  T.eq(AMExtrait.extractOf('500'), null, 'mesure inexistante : aucun extrait')
})

T.test('création, assemblage, image enregistrée', async () => {
  const m = await T.mark({type: 'ext', content: '2-3', top: 1100, left: 300})
  T.ok(m && m.type == 'ext', 'marque créée')
  await T.until(() => document.querySelector('#ext_composer_panel'), 'compositeur ouvert')
  const panel = document.querySelector('#ext_composer_panel')
  await T.until(() => panel.querySelectorAll('.ext-layer img, .ext-layer canvas, .ext-layer div').length, 'morceaux affichés')
  panel.querySelector('.btn-default').click()
  await T.until(() => m.data.file, 'image assemblée', 10000)
  T.eq(m.data.file, `extrait-${m.id}.png`, 'nom du fichier')
  const images = await T.listFiles('images')
  T.ok(images.includes(m.data.file), 'fichier dans images/')
  await T.until(() => m.img && m.img.complete && m.img.naturalWidth > 0, 'image affichée')
  await AnalyseSaver.save()
  T.includes(await T.readFile('analyse_tags.yaml'), `file: ${m.data.file}`, 'fichier enregistré dans les données')
  AObjet.remove(m)
})

// Anacrouse : « 0-4 » = mesures 1 à 4 et l'anacrouse de la mesure 1,
// mesure 0 sans numéro (#283)
T.test('mesure 0 (anacrouse) : « 0-4 » = anacrouse + mesures 1 à 4 (#283)', async () => {
  const { Forme } = await T.imp('Forme')
  const { Systeme } = await T.imp('Systeme')
  const marks = Forme.measureMarks.map(x => x.mark)
  const saved = marks.map(m => m.content)
  const setContent = (m, c) => { m.content = c ; m.data && (m.data.content = c) }
  try {
    // Premier numéro du premier système : anacrouse (sans numéro), les
    // suivants décalés (2 → 1, 3 → 2…)
    const first = Forme.measureMarks.slice().sort((a, b) => a.number - b.number)[0]
    marks.forEach(m => {
      const n = Number(String(m.content).trim())
      if ( m === first.mark ) m.subtype = 'anacrouse' ; else setContent(m, String(n - 1))
    })
    T.no(Forme.measureMarks.some(x => x.number == 0), 'aucune mesure numérotée 0')
    const sys = Systeme.getSystemeAssociated(first.mark)
    const ext = AMExtrait.extractOf('0-4')
    T.ok(ext, 'extrait produit')
    T.eq(ext.numbers.items.map(n => n.n), [1, 2, 3, 4], 'numéros 1 à 4')
    const body = ext.pieces.filter(p => p.image == sys.image_name)[1]
    const head = AMExtrait.headerOf(sys)
    T.eq(body && body.x1, head.x2, 'début après l’en-tête du système : anacrouse comprise')
    T.ok(ext.numbers.items[0].x > head.x2, 'numéro 1 sur la mesure 1, après l’anacrouse')
    const ext14 = AMExtrait.extractOf('1-4')
    const b14 = ext14.pieces.filter(p => p.image == sys.image_name)[1]
    T.ok(b14.x1 > body.x1, '« 1-4 » : sans l’anacrouse')
  } finally { marks.forEach((m, i) => setContent(m, saved[i])) ; marks.forEach(m => m.subtype == 'anacrouse' && (m.subtype = 'mes')) }
})
