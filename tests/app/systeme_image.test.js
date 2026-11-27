// Correction de l'image d'un système (#253) : masques blancs
// (rectangles, polygones), nouvelle image, « Appliquer à tous les
// systèmes », copie préalable de tous les systèmes, « Remettre l'image
// originale », menu « Marques > Corriger l'image du système »
const { Systeme } = await T.imp('Systeme')
const { SystemImageEditor } = await T.imp('SystemImageEditor')
const { AObjet } = await T.imp('AObjet')
const { emit } = await T.imp('events')
const { analyseUrl } = await T.imp('api')

const kev = (type, key, target = document.body) => target.dispatchEvent(new KeyboardEvent(type, {bubbles: true, cancelable: true, key, code: key}))
const openEditor = async (sys) => {
  await Systeme.fixImage(sys)
  const ed = SystemImageEditor.current
  await T.until(() => ed && ed.source && ed.svg, 'éditeur prêt')
  return ed
}
// Pixel (r, g, b) de l'image actuelle du système, en pixels de l'image
const pixel = (sys, x, y) => new Promise((resolve, reject) => {
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = img.naturalWidth ; c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    resolve(Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3)))
  }
  img.onerror = reject
  img.src = analyseUrl(`systems/${sys.image_name}`) + `?t=${Date.now()}`
})
const isWhite = rgb => rgb.every(v => v >= 245)
// Point noir (encre) de l'image originale du système
const inkPoint = (sys) => new Promise((resolve) => {
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = img.naturalWidth ; c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    for ( let y = 10 ; y < c.height - 10 ; y += 3 ) for ( let x = 10 ; x < c.width - 10 ; x += 3 ) {
      const i = (y * c.width + x) * 4
      if ( d[i] < 60 && d[i + 1] < 60 && d[i + 2] < 60 ) return resolve([x, y])
    }
    resolve(null)
  }
  img.src = analyseUrl(`systems/${sys.image_name}`) + `?t=${Date.now()}`
})

T.test('menu « Marques > Corriger l’image du système » : seulement avec un système sélectionné', async () => {
  const opt = document.querySelector('select#amark_menu option[value="fixSystemImage"]')
  T.ok(opt, 'menu présent')
  T.eq(opt.textContent, 'Corriger l’image du système', 'libellé')
  T.ok(opt.disabled, 'aucun système sélectionné : inactif')
  const sys = Systeme.all[0]
  sys.moving = true ; emit('system:selection')
  T.no(opt.disabled, 'système sélectionné : actif')
  sys.stopMoving()
  T.ok(opt.disabled, 'plus de système sélectionné : inactif')
})

T.test('masques rectangle et polygone, nouvelle image, image originale remise', async () => {
  const sys = Systeme.all[0]
  T.ok(sys, 'système')
  const ink = await inkPoint(sys)
  T.ok(ink, 'encre trouvée dans l’image')
  const before = await T.readFile(`systems/${sys.image_name}`)
  const ed = await openEditor(sys)
  T.ok(document.querySelector('#sys_image_panel'), 'panneau ouvert')
  // Rectangle sur l'encre
  const r = ed.addRect()
  Object.assign(r, {x: ink[0] - 5, y: ink[1] - 5, w: 10, h: 10})
  ed.placeRect(r.el)
  // Polygone (tracé par clics)
  ed.startPolygon()
  T.ok(ed.panel.classList.contains('drawing'), 'tracé en cours')
  ed.drawing.push([20, 20], [60, 20], [40, 50])
  const poly = ed.endPolygon()
  T.ok(poly && poly.el, 'polygone créé')
  T.eq(ed.masks.length, 2, 'deux masques')
  // Effacer : le masque choisi seulement (pas les marques de la table)
  const mark = await T.mark({type: 'acc', content: 'C', top: 1000, left: 800})
  AObjet.addToSelection(mark)
  const r2 = ed.addRect()
  kev('keydown', 'Backspace') ; kev('keyup', 'Backspace')
  T.no(ed.masks.includes(r2), 'masque choisi supprimé')
  T.ok(AObjet.get(mark.id), 'marque de la table conservée')
  AObjet.deselectAll() ; AObjet.remove(mark)
  await ed.apply()
  T.no(SystemImageEditor.current, 'éditeur fermé')
  const after = await T.readFile(`systems/${sys.image_name}`)
  T.ok(after != before, 'image modifiée')
  T.ok(isWhite(await pixel(sys, ink[0], ink[1])), 'encre couverte par le masque rectangle')
  T.ok(isWhite(await pixel(sys, 40, 30)), 'zone du polygone blanche')
  // Copie préalable de TOUS les systèmes
  const originals = (await T.listFiles('systems/originaux')).sort()
  T.eq(originals, Systeme.all.map(s => s.image_name).sort(), 'tous les systèmes copiés')
  T.eq(await T.readFile(`systems/originaux/${sys.image_name}`), before, 'copie = image originale')
  T.includes(sys.obj.src, '?v=', 'affichage actualisé')
  // Remettre l'image originale
  T.ok(await T.invoke('system:hasOriginal', {name: sys.image_name}), 'image originale disponible')
  await sys.restoreImage()
  T.eq(await T.readFile(`systems/${sys.image_name}`), before, 'image originale remise')
  T.no(isWhite(await pixel(sys, ink[0], ink[1])), 'encre revenue')
})

T.test('« Appliquer à tous les systèmes » : mêmes masques sur chaque système', async () => {
  const all = Systeme.all
  T.ok(all.length > 1, 'plusieurs systèmes')
  const befores = await Promise.all(all.map(s => T.readFile(`systems/${s.image_name}`)))
  const ed = await openEditor(all[0])
  const r = ed.addRect()
  Object.assign(r, {x: 0, y: 0, w: 30, h: 30})
  ed.allBox.checked = true
  await ed.apply()
  for ( const [i, s] of all.entries() ) {
    T.ok(await T.readFile(`systems/${s.image_name}`) != befores[i] || isWhite(await pixel(s, 15, 15)), `${s.image_name} corrigé`)
    T.ok(isWhite(await pixel(s, 15, 15)), `${s.image_name} : zone masquée blanche`)
  }
  // Images originales gardées (pas écrasées par la seconde correction)
  for ( const s of all ) await s.restoreImage()
  const restored = await Promise.all(all.map(s => T.readFile(`systems/${s.image_name}`)))
  T.eq(restored, befores, 'toutes les images originales remises')
})

T.test('« Renoncer » : rien n’est modifié', async () => {
  const sys = Systeme.all[0]
  const before = await T.readFile(`systems/${sys.image_name}`)
  const ed = await openEditor(sys)
  ed.addRect()
  ed.panel.querySelector('button.btn-close').click()
  T.no(SystemImageEditor.current, 'éditeur fermé')
  T.eq(await T.readFile(`systems/${sys.image_name}`), before, 'image inchangée')
})

T.test('polygone tracé à la souris : un clic par point, clic sur le premier point pour le fermer', async () => {
  const ed = await openEditor(Systeme.all[0])
  try {
    ed.btnPoly.click()
    T.ok(ed.drawing, 'tracé commencé par le bouton')
    T.eq(ed.btnPoly.textContent, 'Terminer le polygone', 'libellé du bouton pendant le tracé')
    const r = ed.svg.getBoundingClientRect()
    const at = (fx, fy) => T.mouse(ed.layer, 'click', {clientX: r.left + r.width * fx, clientY: r.top + r.height * fy, detail: 1})
    at(0.1, 0.1) ; at(0.3, 0.1) ; at(0.2, 0.4)
    T.eq(ed.drawing.length, 3, 'trois points')
    at(0.1, 0.1) // premier point : fermeture
    T.no(ed.drawing, 'tracé fini')
    T.eq(ed.masks.length, 1, 'polygone ajouté')
    T.eq(ed.masks[0].points.length, 3, 'avec ses trois points')
    T.eq(ed.btnPoly.textContent, 'Masque polygonal', 'libellé rétabli')
    // Double-clic : fin du tracé
    ed.btnPoly.click()
    at(0.5, 0.2) ; at(0.7, 0.2) ; at(0.6, 0.5)
    T.mouse(ed.layer, 'dblclick', {clientX: r.left + r.width * 0.6, clientY: r.top + r.height * 0.5})
    T.eq(ed.masks.length, 2, 'double-clic : second polygone')
  } finally { ed.close() }
})
