// Menu Édition : Couper, Copier, Coller > le texte / la marque (les
// marques), raccourcis ⌘X, ⌘C, ⌘V affichés sur les marques
const { AObjet } = await T.imp('AObjet')
const { t } = await T.imp('i18n')

const OPES = [['cut', 'X'], ['copy', 'C'], ['paste', 'V']]
const sub = async ope => (await T.invoke('test:editMenu')).find(i => i.label == t(`ui.menu.${ope}`) && i.submenu)
const markItem = async ope => (await sub(ope)).submenu[1]
const clean = (...ms) => { AObjet.deselectAll() ; ms.forEach(m => m && AObjet.get(m.id) && AObjet.remove(m)) }

T.test('structure : le texte / la marque, raccourcis sur la marque', async () => {
  for ( const [ope, key] of OPES ) {
    const s = await sub(ope)
    T.ok(s, `sous-menu ${ope}`)
    T.eq(s.submenu[0].label, t('ui.menu.edit_text'), `${ope} : le texte`)
    T.ok([t('ui.menu.edit_mark'), t('ui.menu.edit_marks')].includes(s.submenu[1].label), `${ope} : la marque`)
    T.eq(s.submenu[0].accelerator, null, `${ope} : aucun raccourci sur le texte`)
    T.eq(s.submenu[1].accelerator, `CmdOrCtrl+${key}`, `${ope} : raccourci sur la marque`)
  }
})

T.test('libellés et état selon la sélection et le presse-papier', async () => {
  scrollTo(0, 0)
  const a = await T.mark({type: 'acc', content: 'A', top: 120, left: 400})
  const b = await T.mark({type: 'acc', content: 'B', top: 120, left: 600})
  const made = []
  try {
    AObjet.deselectAll()
    // (toujours actifs : un élément inactif ne répond plus au raccourci,
    // texte des champs de saisie compris)
    await T.until(async () => (await markItem('cut')).enabled && (await markItem('copy')).enabled, 'actifs sans sélection')
    AObjet.addToSelection(a)
    await T.until(async () => (await markItem('cut')).label == t('ui.menu.edit_mark'), 'une marque : « la marque »')
    AObjet.addToSelection(b)
    await T.until(async () => (await markItem('copy')).label == t('ui.menu.edit_marks'), 'deux marques : « les marques »')
    T.eq((await markItem('cut')).label, t('ui.menu.edit_marks'), 'couper : « les marques »')
    // Copier par le menu
    await T.invoke('test:editMenuClick', {path: [t('ui.menu.copy'), t('ui.menu.edit_marks')]})
    await T.until(async () => (await markItem('paste')).label == t('ui.menu.edit_marks'), 'coller : « les marques »')
    // Coller par le menu
    const n = AObjet.items.length
    await T.invoke('test:editMenuClick', {path: [t('ui.menu.paste'), t('ui.menu.edit_marks')]})
    await T.until(() => AObjet.items.length == n + 2, 'deux marques collées')
    made.push(...AObjet.selection)
    // Couper par le menu
    AObjet.deselectAll() ; AObjet.addToSelection(a)
    await T.until(async () => (await markItem('cut')).label == t('ui.menu.edit_mark'), 'une marque')
    await T.invoke('test:editMenuClick', {path: [t('ui.menu.cut'), t('ui.menu.edit_mark')]})
    await T.until(() => !AObjet.get(a.id), 'marque coupée')
    await T.until(async () => (await markItem('paste')).label == t('ui.menu.edit_mark'), 'coller : « la marque »')
  } finally { clean(a, b, ...made) }
})

// Raccourci du menu (macOS) dans un champ de saisie : texte coupé, copié,
// collé ; hors champ, aucune marque traitée deux fois
T.test('raccourcis dans un champ de saisie : le texte', async () => {
  const input = document.createElement('input')
  input.style.cssText = 'position:fixed;top:200px;left:200px;z-index:99999'
  document.body.appendChild(input)
  try {
    input.value = 'abcdef' ; input.focus() ; input.setSelectionRange(1, 3)
    await T.invoke('test:editMenuClick', {path: [t('ui.menu.cut'), (await markItem('cut')).label], accel: true})
    await T.until(() => input.value == 'adef', '⌘X : texte coupé')
    input.setSelectionRange(4, 4)
    await T.invoke('test:editMenuClick', {path: [t('ui.menu.paste'), (await markItem('paste')).label], accel: true})
    await T.until(() => input.value == 'adefbc', '⌘V : texte collé')
    input.blur()
    // Hors champ : raccourci du menu sans effet sur les marques (traitées
    // au relâchement)
    const n = AObjet.items.length
    await T.invoke('test:editMenuClick', {path: [t('ui.menu.paste'), (await markItem('paste')).label], accel: true})
    await T.wait(200)
    T.eq(AObjet.items.length, n, 'hors champ : rien collé par le menu')
  } finally { input.remove() }
})
