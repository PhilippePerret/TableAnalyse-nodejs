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
