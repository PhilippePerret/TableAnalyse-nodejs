// Marque verrouillée (motif) : reste au-dessus de l'image du système, sous
// les autres marques (#286)
const { AObjet } = await T.imp('AObjet')
const { Systeme } = await T.imp('Systeme')

T.test('motif verrouillé : traits visibles au-dessus du système (#286)', async () => {
  const sys = Systeme.all[1]
  window.scrollTo({top: sys.top - 100, behavior: 'instant'})
  const m = await T.mark({type: 'mot', content: 'A', top: sys.top + 30, left: 400})
  const o = await T.mark({type: 'acc', content: 'C', top: sys.top + 30, left: 480})
  try {
    m.lock()
    const r = m.obj.getBoundingClientRect()
    const at = document.elementFromPoint(r.left + 1, r.top + r.height / 2)
    T.ok(at && (at === m.obj || m.obj.contains(at)), `bord gauche du motif au-dessus du système (${at && at.tagName}.${at && at.className})`)
    const ro = o.obj.getBoundingClientRect()
    const atO = document.elementFromPoint(ro.left + ro.width / 2, ro.top + ro.height / 2)
    T.ok(atO && (atO === o.obj || o.obj.contains(atO)), 'autre marque au-dessus du motif verrouillé')
  } finally { m.unlock() ; AObjet.remove(m) ; AObjet.remove(o) }
})

T.test('motif verrouillé sur un extrait (image) : traits visibles (#286)', async () => {
  const { UI } = await T.imp('UI')
  const sys = Systeme.all[1]
  window.scrollTo({top: sys.top - 100, behavior: 'instant'})
  const m = await T.mark({type: 'mot', content: 'A', top: sys.top + 30, left: 400})
  AObjet.deselectAll()
  // Image (marque « img ») par-dessus, placée après le motif
  const img = document.createElement('div')
  img.className = 'amark aobj img'
  Object.assign(img.style, {position: 'absolute', top: `${sys.top + 20}px`, left: '380px', width: '300px', height: '200px', background: 'white'})
  UI.TableAnalyse.appendChild(img)
  try {
    m.lock()
    const r = m.obj.getBoundingClientRect()
    const at = document.elementFromPoint(r.left + 1, r.top + r.height / 2)
    T.ok(at && (at === m.obj || m.obj.contains(at)), 'motif au-dessus de l’image')
  } finally { m.unlock() ; AObjet.remove(m) ; img.remove() }
})
