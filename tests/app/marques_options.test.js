// Options des marques (menu contextuel) : verrouillage, suppression,
// alignements sur le même type / l'accord / l'harmonie, bords, version
// cadre ⇄ borne des marques de forme, changement de type ; marque image
const { AObjet } = await T.imp('AObjet')
const { AMark } = await T.imp('AMark')
const { Systeme } = await T.imp('Systeme')

const sys = Systeme.all[1]
const at = (dx, dy) => ({top: sys.top + dy, left: 300 + dx})
const clean = (...ms) => { AObjet.deselectAll() ; ms.forEach(m => m && AObjet.get(m.id) && AObjet.remove(m)) }

T.test('verrouillage : plus sélectionnable, ni groupé, puis déverrouillage', async () => {
  const a = await T.mark(Object.assign({type: 'acc', content: 'C'}, at(0, -100)))
  const b = await T.mark(Object.assign({type: 'acc', content: 'G'}, at(200, -100)))
  AObjet.deselectAll() ; AObjet.addToSelection(a) ; AObjet.addToSelection(b)
  a.onContextChoice('lock')
  T.ok(a.isLocked && b.isLocked, 'toute la sélection verrouillée')
  T.ok(a.obj.classList.contains('locked'), 'classe « locked »')
  AObjet.deselectAll() ; AObjet.addToSelection(a)
  T.eq((AObjet.selection || []).length, 0, 'marque verrouillée non sélectionnable')
  a.onContextChoice('lock')
  T.no(a.isLocked, 'déverrouillée')
  AObjet.addToSelection(a)
  T.eq(AObjet.selection.length, 1, 'de nouveau sélectionnable')
  clean(a, b)
})

T.test('suppression par le menu contextuel (toute la sélection)', async () => {
  const a = await T.mark(Object.assign({type: 'acc', content: 'C'}, at(0, -100)))
  const b = await T.mark(Object.assign({type: 'har', content: 'I'}, at(0, 40)))
  AObjet.deselectAll() ; AObjet.addToSelection(a) ; AObjet.addToSelection(b)
  a.onContextChoice('delete')
  T.no(AObjet.get(a.id) || AObjet.get(b.id), 'les deux supprimées')
})

T.test('alignements : même type (hauteur), sur l’accord, sur l’harmonie', async () => {
  const a1 = await T.mark(Object.assign({type: 'acc', content: 'C'}, at(0, -100)))
  const a2 = await T.mark(Object.assign({type: 'acc', content: 'G7'}, at(300, -130)))
  a2.onContextChoice('align')
  T.eq(a2.top, a1.top, 'accord aligné en hauteur sur l’accord voisin')
  const h = await T.mark(Object.assign({type: 'har', content: 'V'}, at(340, 40)))
  h.onContextChoice('alignChord')
  const center = m => { const r = m.textRect ; return r.left + r.width / 2 }
  T.ok(Math.abs(center(h) - center(a2)) <= 1, 'harmonie centrée sous son accord')
  a1.left = a1.left + 30
  const h2 = await T.mark(Object.assign({type: 'har', content: 'I'}, at(0, 40)))
  a1.onContextChoice('alignHarmony')
  T.ok(Math.abs(center(a1) - center(h2)) <= 1, 'accord centré sur son harmonie')
  clean(a1, a2, h, h2)
})

T.test('bords : aperçu, confirmation, annulation, valeur par défaut', async () => {
  const c = await T.mark(Object.assign({type: 'cir'}, at(0, 100)))
  const width = () => parseFloat(getComputedStyle(c.obj).borderTopWidth)
  const def = width()
  c.previewBorder({width: 9})
  T.eq(width(), 9, 'aperçu appliqué')
  c.cancelBorder()
  T.eq(width(), def, 'aperçu annulé')
  c.previewBorder({width: 7}) ; c.confirmBorder()
  T.eq([width(), c.data.border && c.data.border.width], [7, 7], 'bord confirmé et enregistré dans les données')
  c.resetBorder('width')
  T.eq([width(), c.data.border], [def, undefined], 'retour à la valeur par défaut')
  clean(c)
})

T.test('forme : version cadre ⇄ borne, changement de type', async () => {
  const p = await T.mark(Object.assign({type: 'frm', subtype: 'fpar', content: 'Exposition'}, at(0, -160)))
  T.ok(p.isBorne, 'borne')
  p.onContextChoice('toggleFrame')
  T.eq(p.subtype, 'prt', 'devenue cadre (prt)')
  T.ok(p.isFormeCadre && p.isBox, 'version cadre')
  p.onContextChoice('toggleFrame')
  T.eq(p.subtype, 'fpar', 'redevenue borne')
  const m = await T.mark(Object.assign({type: 'txt', subtype: 'size3', content: 'G'}, at(0, -100)))
  m.changeType('acc')
  T.eq([m.type, m.content], ['acc', 'G'], 'texte devenu accord, contenu gardé')
  T.ok(m.obj.classList.contains('acc') && m.obj.classList.contains('philnote'), 'classes de l’accord')
  clean(p, m)
})

T.test('marque image : chargée depuis le dossier images de l’analyse', async () => {
  const img = await T.mark(Object.assign({type: 'img', content: 'exemple.png'}, at(0, 100)))
  T.ok(img.img, 'balise image')
  await T.until(() => img.img.complete && img.img.naturalWidth > 0, 'image chargée')
  T.eq(img.img.naturalWidth, 200, 'largeur naturelle')
  clean(img)
})
