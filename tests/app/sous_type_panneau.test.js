// « Sous-type… » du panneau de valeur : liste À LA PLACE du panneau
// (masqué, il revient après le choix ou l'abandon) ; sa case de fermeture
// la ferme, sans en ouvrir d'autre (#270)
const { AObjet } = await T.imp('AObjet')

T.test('« Sous-type… » : liste à la place du panneau de valeur (#270)', async () => {
  const m = await T.mark({type: 'txt', subtype: 'size1', content: 'Texte', top: 1500, left: 600})
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
    T.eq(m.subtype, 'size1', 'sous-type inchangé')
    // Choix d'un autre sous-type : panneau revenu, marque changée
    e.btnType.click()
    const g2 = Array.from(document.querySelectorAll('div.container_getter_in_list:not(.hidden)')).pop()
    const item = Array.from(g2.querySelectorAll('li')).find(li => li.getAttribute('value') == 'size3')
    item.click()
    T.no(e.obj.classList.contains('hidden'), 'choix fait : panneau de valeur revenu')
    T.eq(m.subtype, 'size3', 'nouveau sous-type')
    e.onClickCancel()
  } finally { AObjet.remove(m) }
})

// Réédition : sous-type courant sélectionné dans la liste (#293)
T.test('« Sous-type… » : sous-type courant sélectionné (#293)', async () => {
  for ( const [type, subtype, content] of [['txt', 'size3', 'Texte'], ['seg', 'v-left', 's']] ) {
    const m = await T.mark({type, subtype, content, top: 1500, left: 600})
    try {
      m.edit()
      const e = m.editor
      e.btnType.click()
      const g = Array.from(document.querySelectorAll('div.container_getter_in_list:not(.hidden)')).pop()
      const cur = Array.from(g.querySelectorAll('li.current'))
      T.eq(cur.map(li => li.getAttribute('value')), [subtype], `${type} : « ${subtype} » sélectionné`)
      T.eq(getComputedStyle(cur[0]).backgroundColor, 'rgb(37, 174, 255)', `${type} : sélection visible`)
      g.querySelector('span.panneau-close').click()
      e.onClickCancel()
    } finally { AObjet.remove(m) }
  }
})

// Type de note : la réédition ouvre directement la liste des sous-types ;
// le choix change le sous-type ET le texte (jamais modifiable), #303
T.test('note rééditée : liste des sous-types directement, texte changé (#303)', async () => {
  const m = await T.mark({type: 'not', subtype: 'np', content: 'NP', top: 1500, left: 600})
  try {
    AObjet.deselectAll()
    m.edit()
    T.no(document.querySelector('div.mini_editeur:not(.hidden)'), 'aucun champ de valeur')
    const g = Array.from(document.querySelectorAll('div.container_getter_in_list:not(.hidden)')).pop()
    T.ok(g, 'liste des sous-types ouverte')
    T.eq(Array.from(g.querySelectorAll('li.current')).map(li => li.getAttribute('value')), ['np'], 'sous-type courant sélectionné')
    Array.from(g.querySelectorAll('li')).find(li => li.getAttribute('value') == 'ap').click()
    T.eq(m.subtype, 'ap', 'nouveau sous-type')
    T.eq(m.content, 'AP', 'texte du nouveau sous-type')
    T.eq(m.obj.querySelector('span.content').textContent.trim(), 'AP', 'texte affiché')
    // Abandon : rien ne change
    m.edit()
    const g2 = Array.from(document.querySelectorAll('div.container_getter_in_list:not(.hidden)')).pop()
    g2.querySelector('span.panneau-close').click()
    T.eq([m.subtype, m.content], ['ap', 'AP'], 'abandon : inchangé')
    T.eq(document.querySelectorAll('div.container_getter_in_list:not(.hidden)').length, 0, 'liste fermée')
  } finally { AObjet.remove(m) }
})
