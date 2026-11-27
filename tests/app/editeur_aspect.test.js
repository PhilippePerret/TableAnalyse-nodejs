// Panneau de valeur (édition d'une marque, #262) : « carte à entête »,
// titre et bouton du type dans l'entête, valeurs déjà utilisées en grille
// sous le champ, « Renoncer » puis « OK » à droite du pied, marges
const { AMark } = await T.imp('AMark')
const { AMark_Editor } = await T.imp('AMark_Editor')
const { AObjet } = await T.imp('AObjet')

T.test('aspect du panneau de valeur', async () => {
  const made = ['C', 'Am7', 'G7'].map((c, i) => T.mark({type: 'acc', content: c, top: 1300 + i * 50, left: 700}))
  const marks = await Promise.all(made)
  const ev = {pageX: 600, pageY: 600, clientX: 600, clientY: 600}
  const ed = new AMark_Editor({event: ev, type: 'acc', onReleaseMethod: () => {}})
  ed.proceed()
  const e = ed.editorOfAMarkContent
  const o = e.obj
  try {
    const head = o.querySelector(':scope > div.panneau-head')
    T.eq(head.querySelector('.panneau-title').textContent, "Nom de l'accord", 'titre dans l’entête')
    T.ok(head.querySelector('button.type'), 'bouton du type dans l’entête')
    T.no(o.querySelector(':scope > div.titre'), 'plus de titre dans le corps')
    const body = o.querySelector(':scope > div.body')
    const pane = body.querySelector('div.suggest-pane')
    T.ok(pane && !pane.classList.contains('hidden'), 'valeurs dans le corps')
    T.ok(pane.getBoundingClientRect().top >= e.textField.getBoundingClientRect().bottom, 'sous le champ')
    T.eq(getComputedStyle(e.suggestList).display, 'grid', 'en grille')
    const foot = o.querySelector(':scope > div.panneau-foot')
    T.eq(Array.from(foot.querySelectorAll('button')).map(b => b.className.split(' ')[0]), ['cancel', 'ok'], '« Renoncer » puis « OK »')
    // Numéros des valeurs lisibles (#266)
    const num = e.suggestList.querySelector('div.suggestion span.letter')
    const cs = getComputedStyle(num)
    T.ok(parseFloat(cs.fontSize) >= 13, 'numéro : taille ≥ 13 px')
    T.ok(cs.color.match(/\d+/g).slice(0, 3).every(v => Number(v) <= 0x66), 'numéro : couleur foncée')
    T.ok(Number(cs.fontWeight) >= 600, 'numéro : gras')
    const r = o.getBoundingClientRect(), f = e.textField.getBoundingClientRect()
    T.ok(f.left - r.left >= 24 && r.right - f.right >= 24, 'marges du champ (≥ 24 px)')
  } finally {
    e.hide()
    marks.forEach(m => AObjet.remove(m))
  }
})
