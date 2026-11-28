// Textes : taille selon le sous-type (gros, moyen, petit…), changée par
// le panneau de valeur ; « = » en tête de texte (#284)
const { AObjet } = await T.imp('AObjet')
const { Preferences } = await T.imp('Preferences')

const sizeOf = m => getComputedStyle(m.obj.querySelector('span.content')).fontSize

T.test('changement de sous-type : taille changée sur la table (#284)', async () => {
  const m = await T.mark({type: 'txt', subtype: 'size1', content: 'Bonjour', top: 1500, left: 600})
  try {
    T.eq(sizeOf(m), `${Preferences.get('marque_texte_size_1')}px`, 'gros texte')
    m.edit()
    const e = m.editor
    e.btnType.click()
    const g = Array.from(document.querySelectorAll('div.container_getter_in_list:not(.hidden)')).pop()
    Array.from(g.querySelectorAll('li')).find(li => li.getAttribute('value') == 'size3').click()
    T.eq(m.subtype, 'size3', 'sous-type changé')
    e.onClickOK ? e.onClickOK() : e.obj.querySelector('.btn-default').click()
    await T.wait(100)
    T.eq(sizeOf(m), `${Preferences.get('marque_texte_size_3')}px`, 'petit texte')
  } finally { AObjet.remove(m) }
})

T.test('« = » en tête de texte : affiché, taille du sous-type ; « = Titre = » : titre (#284)', async () => {
  const m = await T.mark({type: 'txt', subtype: 'size2', content: '= mes. 11-13', top: 1500, left: 600})
  const t = await T.mark({type: 'txt', subtype: 'size2', content: '= Titre =', top: 1700, left: 600})
  const h = await T.mark({type: 'txt', subtype: 'size2', content: '== mes. 4 =', top: 1900, left: 600})
  try {
    T.eq(m.obj.querySelector('span.content').textContent, '= mes. 11-13', '« = » affiché')
    T.no(m.obj.querySelector('span.txt-title'), 'pas un titre')
    T.eq(sizeOf(m), `${Preferences.get('marque_texte_size_2')}px`, 'taille du sous-type')
    m.subtype = 'size4'
    T.eq(sizeOf(m), `${Preferences.get('marque_texte_size_4')}px`, 'sous-type changé : taille changée')
    const title = t.obj.querySelector('span.txt-title.t1')
    T.ok(title && title.textContent == 'Titre', '« = Titre = » : titre de niveau 1')
    T.no(h.obj.querySelector('span.txt-title'), '« == … = » : pas un titre')
  } finally { [m, t, h].forEach(x => AObjet.remove(x)) }
})
