// « Sous-type… » du panneau de valeur : liste À LA PLACE du panneau
// (masqué, il revient après le choix ou l'abandon) ; sa case de fermeture
// la ferme, sans en ouvrir d'autre (#270)
const { AObjet } = await T.imp('AObjet')

T.test('« Sous-type… » : liste à la place du panneau de valeur (#270)', async () => {
  const m = await T.mark({type: 'not', subtype: 'np', content: 'NP', top: 1500, left: 600})
  try {
    m.edit()
    const e = m.editor
    const panel = e.obj.getBoundingClientRect()
    e.btnType.click()
    const g = Array.from(document.querySelectorAll('div.container_getter_in_list:not(.hidden)')).pop()
    T.ok(g, 'liste des sous-types ouverte')
    T.ok(e.obj.classList.contains('hidden'), 'panneau de valeur masqué')
    const r = g.getBoundingClientRect()
    T.ok(Math.abs(r.left - panel.left) <= 2 && Math.abs(r.top - panel.top) <= 2, 'liste à la place du panneau')
    // Abandon (case de fermeture) : panneau de valeur revenu, aucune autre liste
    g.querySelector('span.panneau-close').click()
    T.ok(g.classList.contains('hidden'), 'liste fermée')
    T.no(e.obj.classList.contains('hidden'), 'panneau de valeur revenu')
    T.eq(document.querySelectorAll('div.container_getter_in_list:not(.hidden)').length, 0, 'aucune autre liste ouverte')
    T.eq(m.subtype, 'np', 'sous-type inchangé')
    // Choix d'un autre sous-type : panneau revenu, marque changée
    e.btnType.click()
    const g2 = Array.from(document.querySelectorAll('div.container_getter_in_list:not(.hidden)')).pop()
    const item = Array.from(g2.querySelectorAll('li')).find(li => li.getAttribute('value') == 'ap')
    item.click()
    T.no(e.obj.classList.contains('hidden'), 'choix fait : panneau de valeur revenu')
    T.eq(m.subtype, 'ap', 'nouveau sous-type')
    e.onClickCancel()
  } finally { AObjet.remove(m) }
})
