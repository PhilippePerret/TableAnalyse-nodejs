// « Sous-type… » du panneau de valeur : liste à côté du panneau, jamais
// dessus ; sa case de fermeture la ferme, sans en ouvrir d'autre (#270)
const { AObjet } = await T.imp('AObjet')

T.test('« Sous-type… » : liste à côté du panneau de valeur (#270)', async () => {
  const m = await T.mark({type: 'not', subtype: 'np', content: 'NP', top: 1500, left: 600})
  try {
    m.edit()
    const e = m.editor
    const panel = e.obj.getBoundingClientRect()
    e.btnType.click()
    const g = Array.from(document.querySelectorAll('div.container_getter_in_list:not(.hidden)')).pop()
    T.ok(g, 'liste des sous-types ouverte')
    const r = g.getBoundingClientRect()
    const overlap = !(r.right <= panel.left || r.left >= panel.right || r.bottom <= panel.top || r.top >= panel.bottom)
    T.no(overlap && r.left < panel.right - 2, 'pas sur le panneau')
    T.ok(!e.obj.classList.contains('hidden'), 'panneau de valeur toujours ouvert')
    g.querySelector('span.panneau-close').click()
    T.ok(g.classList.contains('hidden'), 'case de fermeture : liste fermée')
    T.eq(document.querySelectorAll('div.container_getter_in_list:not(.hidden)').length, 0, 'aucune autre liste ouverte')
    e.onClickCancel()
  } finally { AObjet.remove(m) }
})
