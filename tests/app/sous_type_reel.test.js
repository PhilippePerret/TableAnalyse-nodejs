// « Sous-type… » cliqué « pour de vrai » (événements du système) : la
// liste des sous-types s'ouvre à la place du panneau de valeur (#275)
const { AObjet } = await T.imp('AObjet')

T.test('clic réel sur « Sous-type… » : liste des sous-types ouverte', async () => {
  window.scrollTo({top: 0, behavior: 'instant'})
  const m = await T.mark({type: 'not', subtype: 'np', content: 'NP', top: 300, left: 600})
  try {
    // Double-clic réel sur la marque : édition
    const mr = m.obj.getBoundingClientRect()
    await T.invoke('test:realClick', {x: Math.round(mr.left + mr.width / 2), y: Math.round(mr.top + mr.height / 2), clickCount: 2})
    await T.until(() => m.editor && !m.editor.obj.classList.contains('hidden'), 'panneau de valeur ouvert')
    const e = m.editor
    const r = e.btnType.getBoundingClientRect()
    await T.invoke('test:realClick', {x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2)})
    await T.until(() => document.querySelectorAll('div.container_getter_in_list:not(.hidden)').length == 1, 'liste des sous-types visible')
    const g = document.querySelector('div.container_getter_in_list:not(.hidden)')
    const gr = g && g.getBoundingClientRect()
    T.ok(gr && gr.width > 0 && gr.top >= 0 && gr.bottom <= window.innerHeight, 'liste dans la fenêtre')
    T.ok(e.obj.classList.contains('hidden'), 'panneau de valeur à sa place masqué')
    g && g.querySelector('span.panneau-close').click()
    T.no(e.obj.classList.contains('hidden'), 'panneau de valeur revenu')
    e.onClickCancel()
  } finally { AObjet.remove(m) }
})

for ( const [type, subtype, content] of [['txt', 'size3', 'Texte'], ['bbx', 'cel', 'C1'], ['cad', 'par', 'I'], ['seg', 'h-up', 's'], ['txt', 'mes', '12'], ['not', 'ap', 'AP']] ) {
  T.test(`clic réel sur « Sous-type… » (${type}/${subtype}), page défilée, deux fois`, async () => {
    window.scrollTo({top: 1500, behavior: 'instant'})
    const m = await T.mark({type, subtype, content, top: 1500 + 300, left: 600})
    try {
      for ( const round of [1, 2] ) {
        const mr = m.obj.getBoundingClientRect()
        await T.invoke('test:realClick', {x: Math.round(mr.left + Math.min(10, mr.width / 2)), y: Math.round(mr.top + Math.min(10, mr.height / 2)), clickCount: 2})
        await T.until(() => m.editor && !m.editor.obj.classList.contains('hidden'), `${round} : panneau de valeur ouvert`)
        const e = m.editor
        const r = e.btnType.getBoundingClientRect()
        await T.invoke('test:realClick', {x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2)})
        await T.until(() => document.querySelectorAll('div.container_getter_in_list:not(.hidden)').length == 1, `${round} : liste visible`)
        const g = document.querySelector('div.container_getter_in_list:not(.hidden)')
        const gr = g && g.getBoundingClientRect()
        T.ok(gr && gr.width > 0 && gr.top >= 0 && gr.bottom <= window.innerHeight + 1, `${round} : liste dans la fenêtre`)
        g && g.querySelector('span.panneau-close').click()
        e.onClickCancel()
      }
    } finally { AObjet.remove(m) ; window.scrollTo({top: 0, behavior: 'instant'}) }
  })
}

T.test('panneau de valeur déplacé par son entête, page défilée : il suit la souris (#275)', async () => {
  window.scrollTo({top: 1500, behavior: 'instant'})
  const m = await T.mark({type: 'acc', content: 'C', top: 1800, left: 600})
  try {
    m.edit()
    const e = m.editor
    await T.wait(100)
    const before = e.obj.getBoundingClientRect()
    const t = e.obj.querySelector('.panneau-head .panneau-title').getBoundingClientRect()
    await T.invoke('test:realDrag', {x: Math.round(t.left + 20), y: Math.round(t.top + t.height / 2), dx: 80, dy: 60})
    const after = e.obj.getBoundingClientRect()
    T.ok(Math.abs(after.left - before.left - 80) <= 6 && Math.abs(after.top - before.top - 60) <= 6, `déplacé de (80, 60) : (${Math.round(after.left - before.left)}, ${Math.round(after.top - before.top)})`)
    e.onClickCancel()
  } finally { AObjet.remove(m) ; window.scrollTo({top: 0, behavior: 'instant'}) }
})
