// Vérifications (#237) : accords qui se chevauchent écrits en rouge,
// marqueur « ! » dans la bande du haut, liste des erreurs, retrait à la
// main ; seuls les accords sont contrôlés
const { AObjet } = await T.imp('AObjet')
const { Verifications } = await T.imp('Verifications')
const { Preferences } = await T.imp('Preferences')
const { AnalyseSaver } = await T.imp('AnalyseSaver')
const { Systeme } = await T.imp('Systeme')
const { Stage } = await T.imp('Exporter')

const flag = () => document.querySelector('#check-flag')
const flagShown = () => !!flag() && !flag().classList.contains('hidden')
const red = m => m.obj.classList.contains('chord-overlap')
const settle = async () => { await T.wait(450) ; await new Promise(r => requestAnimationFrame(r)) }
const setPref = (key, v) => { const el = document.querySelector(`#pref-${key}`) ; el.value = v ; el.dispatchEvent(new Event('change')) }
const sys = Systeme.all[2]
const at = (left) => ({top: sys.top - 90, left})

T.test('au chargement : aucune erreur, marqueur caché', async () => {
  await settle()
  T.eq(Verifications.check().length, 0, 'aucun chevauchement')
  T.no(flagShown(), 'marqueur caché')
})

T.test('deux accords qui se chevauchent : rouge, marqueur, liste, sélection', async () => {
  const a = await T.mark(Object.assign({type: 'acc', content: 'Fm75-'}, at(400)))
  const b = await T.mark(Object.assign({type: 'acc', content: 'G7'}, at(430)))
  await settle()
  T.eq(Verifications.errors.length, 1, 'une erreur (contrôle après modification)')
  T.ok(red(a) && red(b), 'les deux accords en rouge')
  T.ok(flagShown(), 'marqueur « ! » affiché')
  T.eq(flag().textContent, '!', 'texte du marqueur')
  T.ok(flag().getBoundingClientRect().left > innerWidth / 2, 'marqueur à droite de la bande')
  flag().click()
  const panel = document.querySelector('#checks-panel')
  T.ok(panel, 'liste ouverte')
  const items = panel.querySelectorAll('li')
  T.eq(items.length, 1, 'une ligne')
  T.includes(items[0].textContent, 'Fm75-', 'accords nommés')
  T.ok(/mesure \d+/.test(items[0].textContent), 'mesure indiquée')
  items[0].querySelector('.check-message').click()
  T.eq(AObjet.selection.map(m => m.id).sort(), [a.id, b.id].sort(), 'clic : accords sélectionnés')
  // Écartés : plus d'erreur
  b.left = 900 ; await settle()
  T.eq(Verifications.errors.length, 0, 'écartés : plus d’erreur')
  T.no(red(a) || red(b), 'plus en rouge')
  T.no(flagShown(), 'marqueur caché')
  T.no(document.querySelector('#checks-panel'), 'liste fermée sans erreur')
  AObjet.deselectAll() ; AObjet.remove(a) ; AObjet.remove(b)
})

T.test('erreur retirée à la main : plus signalée, enregistrée', async () => {
  const a = await T.mark(Object.assign({type: 'acc', content: 'C'}, at(400)))
  const b = await T.mark(Object.assign({type: 'acc', content: 'D'}, at(410)))
  await settle()
  flag().click()
  document.querySelector('#checks-panel li .check-dismiss').click()
  T.eq(Verifications.errors.length, 0, 'erreur retirée')
  T.no(red(a) || red(b), 'accords plus en rouge')
  T.no(flagShown(), 'marqueur caché')
  T.includes(Preferences.get('checks_dismissed'), `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`, 'retrait consigné')
  await AnalyseSaver.save()
  T.includes(await T.readFile('preferences.yaml'), 'checks_dismissed', 'retrait enregistré')
  b.left = 412 ; await settle()
  T.eq(Verifications.errors.length, 0, 'toujours plus signalée après un déplacement')
  AObjet.remove(a) ; AObjet.remove(b)
})

T.test('passage de l’écriture batave à l’italienne : chevauchement signalé, puis plus', async () => {
  setPref('notation_display', 'bat')
  const a = await T.mark(Object.assign({type: 'acc', content: 'F'}, at(400)))
  await settle()
  const b = await T.mark(Object.assign({type: 'acc', content: 'G'}, at(Math.round(a.textRect.right - a.obj.getBoundingClientRect().left + a.left + 6))))
  await settle()
  T.eq(Verifications.errors.length, 0, 'en batave : côte à côte sans chevauchement')
  setPref('notation_display', 'it')
  await document.fonts.load('26pt PhilNoteIt', 'Fa') ; await settle()
  T.eq(Verifications.errors.length, 1, 'en italien : « Fa » chevauche « Sol »')
  setPref('notation_display', 'bat') ; await settle()
  T.eq(Verifications.errors.length, 0, 'retour en batave : plus d’erreur')
  AObjet.remove(a) ; AObjet.remove(b)
})

T.test('autres marques superposées : jamais signalées', async () => {
  const pairs = [['har', 'V', 'har', 'I'], ['txt', 'Texte', 'acc', 'C'], ['mod', 'G', 'acc', 'C'], ['emp', 'D', 'emp', 'E']]
  for ( const [t1, c1, t2, c2] of pairs ) {
    const a = await T.mark(Object.assign({type: t1, subtype: t1 == 'txt' ? 'size3' : undefined, content: c1}, at(400)))
    const b = await T.mark(Object.assign({type: t2, content: c2}, at(405)))
    await settle()
    T.eq(Verifications.errors.length, 0, `${t1} sur ${t2} : pas d’erreur`)
    AObjet.remove(a) ; AObjet.remove(b)
  }
})

T.test('exports : accords jamais en rouge', async () => {
  const a = await T.mark(Object.assign({type: 'acc', content: 'Fm75-'}, at(400)))
  const b = await T.mark(Object.assign({type: 'acc', content: 'G7'}, at(420)))
  await settle()
  T.ok(red(a), 'en rouge sur la table')
  const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
  const stage = new Stage()
  await stage.build() ; stage.respace(opts)
  T.eq(stage.content ? stage.content.querySelectorAll('.chord-overlap').length : 0, 0, 'classe retirée de la copie exportée')
  const svg = (await stage.svgPages(stage.layout(opts))).join('\n')
  stage.remove()
  T.no(/rgb\(217, 83, 79\)|#d9534f/i.test(svg), 'pas de rouge dans le SVG')
  AObjet.remove(a) ; AObjet.remove(b)
})
