// Menu « Forme > Marques » : « Bornes », « Cadres » cochés ou non ;
// seuls les sous-types cochés sont proposés (#280)
const { AObjet } = await T.imp('AObjet')
const { TYPES_FORME } = await T.imp('Constants')
const { t } = await T.imp('i18n')

const path = kind => [t('ui.menu.form_menu'), t('ui.menu.form_marks'), t(`ui.menu.form_${kind}`)]
const checked = async kind => (await T.invoke('test:appMenu', {path: path(kind)})).checked
const toggle = kind => T.invoke('test:appMenu', {path: path(kind), click: true})
const offered = async () => {
  const m = await T.mark({type: 'frm', subtype: 'fpar', content: 'Expo', top: 1500, left: 600})
  try {
    m.edit()
    m.editor.btnType.click()
    const g = Array.from(document.querySelectorAll('div.container_getter_in_list:not(.hidden)')).pop()
    const values = Array.from(g.querySelectorAll('li')).map(li => li.getAttribute('value')).filter(Boolean)
    g.querySelector('span.panneau-close').click()
    m.editor.onClickCancel()
    return values
  } finally { AObjet.remove(m) }
}
const FRAMES = Object.values(TYPES_FORME).filter(d => d.frame).map(d => d.value)
const BOUNDS = Object.values(TYPES_FORME).filter(d => !d.frame).map(d => d.value)

T.test('bornes et cadres : cochés par défaut, tous proposés', async () => {
  T.ok(await checked('bounds'), 'Bornes cochées')
  T.ok(await checked('frames'), 'Cadres cochés')
  T.eq((await offered()).sort(), [...BOUNDS, ...FRAMES].sort(), 'tous les sous-types')
})

T.test('cadres décochés : bornes seules ; bornes décochées : cadres seuls', async () => {
  try {
    await toggle('frames')
    await T.until(async () => !(await checked('frames')), 'Cadres décochés')
    await T.wait(100)
    T.eq((await offered()).sort(), BOUNDS.slice().sort(), 'bornes seules')
    await toggle('frames') ; await toggle('bounds')
    await T.until(async () => !(await checked('bounds')), 'Bornes décochées')
    await T.wait(100)
    T.eq((await offered()).sort(), FRAMES.slice().sort(), 'cadres seuls')
    // Jamais aucun : le dernier coché le reste
    await toggle('frames')
    await T.wait(100)
    T.ok(await checked('frames'), 'Cadres restés cochés')
  } finally {
    (await checked('bounds')) || await toggle('bounds')
    ;(await checked('frames')) || await toggle('frames')
  }
})
