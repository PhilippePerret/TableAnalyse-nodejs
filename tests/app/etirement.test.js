// Accord, harmonie étirés par leur bord droit (#268) : trait de
// prolongation à partir d'un certain allongement, retiré quand la marque
// reprend sa taille normale ; « -- » en fin de texte toujours possible
const { AObjet } = await T.imp('AObjet')
const { Current } = await T.imp('Current')

// Poignée droite tirée de +dx+ pixels
const stretch = (m, dx) => {
  const h = m.obj.querySelector('.ui-resizable-handle.ui-resizable-e')
  const r = h.getBoundingClientRect()
  const x = r.left + r.width / 2, y = r.top + r.height / 2
  T.mouse(h, 'mousedown', {clientX: x, clientY: y, pageX: x + window.scrollX, pageY: y + window.scrollY})
  T.mouse(document, 'mousemove', {clientX: x + dx / 2, clientY: y, pageX: x + dx / 2 + window.scrollX, pageY: y + window.scrollY})
  T.mouse(document, 'mousemove', {clientX: x + dx, clientY: y, pageX: x + dx + window.scrollX, pageY: y + window.scrollY})
  T.mouse(document, 'mouseup', {clientX: x + dx, clientY: y, pageX: x + dx + window.scrollX, pageY: y + window.scrollY})
}

for ( const type of ['acc', 'har'] ) {
  T.test(`${type} : étiré par le bord droit`, async () => {
    const m = await T.mark({type, content: type == 'acc' ? 'C' : 'V', top: 1400, left: 600})
    try {
      T.ok(m.obj.querySelector('.ui-resizable-handle.ui-resizable-e'), 'poignée droite')
      T.no(m.prolong || m.hasProlongLine, 'pas de trait au départ')
      const natural = m.obj.offsetWidth
      // Petit allongement : rien
      stretch(m, 15)
      T.no(m.prolong || m.hasProlongLine, 'petit allongement : pas de trait')
      T.eq(m.obj.style.width, '', 'petit allongement : taille normale')
      // Grand allongement : trait de prolongation
      Current.analyse.modified = false
      stretch(m, 150)
      T.ok(m.prolong && m.hasProlongLine, 'grand allongement : trait')
      T.ok(m.prolongLine.offsetWidth > 100, 'trait long')
      T.ok(Math.abs(m.data.width - (natural + 150)) <= 30, 'largeur enregistrée')
      T.ok(Current.analyse.modified, 'analyse modifiée')
      // Ramenée à la taille normale : plus de trait
      stretch(m, -(m.obj.offsetWidth - natural) + 10)
      T.no(m.prolong || m.hasProlongLine, 'ramenée : plus de trait')
      T.eq(m.data.width, null, 'ramenée : plus de largeur')
      T.eq(m.obj.style.width, '', 'ramenée : taille normale')
      // Trait par « -- » : toujours possible, et étirable
      m.setValue((type == 'acc' ? 'C' : 'V') + '--')
      T.ok(m.prolong && m.hasProlongLine, '« -- » : trait')
      T.ok(m.obj.querySelector('.ui-resizable-handle.ui-resizable-e'), '« -- » : poignée toujours là')
    } finally { AObjet.remove(m) }
  })
}

// Vrais événements, page défilée (#276)
const real = (x, y, o = {}) => T.invoke('test:realClick', Object.assign({x: Math.round(x), y: Math.round(y)}, o))

T.test('accord étiré, édité puis validé : il garde son trait (#276)', async () => {
  window.scrollTo({top: 900, behavior: 'instant'})
  const m = await T.mark({type: 'acc', content: 'C', top: 1300, left: 500})
  try {
    const h = m.obj.querySelector('.ui-resizable-handle.ui-resizable-e').getBoundingClientRect()
    await T.invoke('test:realDrag', {x: Math.round(h.left + h.width / 2), y: Math.round(h.top + h.height / 2), dx: 200, dy: 0})
    T.ok(m.prolong && m.hasProlongLine, 'étiré : trait')
    const width = m.obj.offsetWidth
    for ( const how of ['OK', 'Entrée', 'nouveau texte'] ) {
      const r = m.contentSpan.getBoundingClientRect()
      await real(r.left + 5, r.top + 5, {clickCount: 2})
      await T.until(() => m.editor && !m.editor.obj.classList.contains('hidden'), `${how} : édition`)
      const e = m.editor
      T.no(e.textField.value.endsWith('--'), `${how} : pas de « -- » dans le champ`)
      if ( how == 'nouveau texte' ) e.textField.value = 'G7'
      if ( how == 'Entrée' ) {
        e.textField.focus()
        for ( const type of ['keydown', 'keypress', 'keyup'] ) e.textField.dispatchEvent(new KeyboardEvent(type, {bubbles: true, cancelable: true, key: 'Enter', code: 'Enter'}))
      } else {
        const ok = e.btnOK.getBoundingClientRect()
        await real(ok.left + ok.width / 2, ok.top + ok.height / 2)
      }
      await T.until(() => e.obj.classList.contains('hidden'), `${how} : validé`)
      T.ok(m.prolong && m.hasProlongLine, `${how} : trait gardé`)
      T.ok(Math.abs(m.obj.offsetWidth - width) <= 30, `${how} : longueur gardée`)
    }
    T.eq(m.content, 'G7', 'texte changé')
  } finally { AObjet.remove(m) ; window.scrollTo({top: 0, behavior: 'instant'}) }
})
