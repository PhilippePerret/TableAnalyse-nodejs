// Saisie rapide (clavier, #260, cf. .claude/saisie_rapide_260.md) : menu
// « Marques > Saisie », clavier de la langue, marque glissée sur une
// touche, touche tenue + clic, touche vide en rouge, touche vidée,
// affectations de l'analyse
const { QuickKeyboard } = await T.imp('QuickKeyboard')
const { InputMenu } = await T.imp('MenuAMark')
const { AObjet } = await T.imp('AObjet')
const { AMark_Editor } = await T.imp('AMark_Editor')
const { Preferences } = await T.imp('Preferences')
const { HeldLetter } = await T.imp('HeldLetter')

const kb = () => document.querySelector('#quick_keyboard')
const keyEl = l => kb().querySelector(`.qk-key[data-letter="${l}"]`)
const center = el => { const r = el.getBoundingClientRect() ; return {x: r.left + r.width / 2, y: r.top + r.height / 2} }
const kev = (type, key) => document.body.dispatchEvent(new KeyboardEvent(type, {bubbles: true, cancelable: true, key, code: `Key${key.toUpperCase()}`}))
const click = (x = 700, y = 500) => {
  for ( const type of ['mousedown', 'mouseup', 'click'] ) T.mouse(document.body, type, {clientX: x, clientY: y, pageX: x, pageY: y + window.scrollY, detail: 1})
}
const newIds = () => { const before = new Set(AObjet.items.map(m => m.id)) ; return () => AObjet.items.filter(m => !before.has(m.id)) }
const setMode = (m) => { const o = Array.from(InputMenu.menu.options).find(o => o.value == m) ; InputMenu.menu.value = m ; InputMenu.menu.dispatchEvent(new Event('change')) ; return o }

T.test('menu « Marques > Saisie » : « Normal », « Rapide (clavier) »', async () => {
  const opts = Array.from(document.querySelectorAll('select#input_menu option')).slice(1)
  T.eq(opts.map(o => o.textContent), ['Normal', 'Rapide (clavier)'], 'choix')
  T.ok(document.querySelector('select#amark_menu option[data-submenu="input_menu"]'), 'sous-menu de « Marques »')
  T.eq(QuickKeyboard.mode, 'normal', 'normal par défaut')
  T.ok(!kb() || kb().hidden, 'normal : pas de clavier')
  setMode('quick')
  T.eq(opts.find(o => o.value == 'quick').dataset.checked, 'true', 'rapide coché')
  T.ok(kb() && !kb().hidden, 'rapide : clavier affiché')
  setMode('normal')
  T.ok(kb().hidden, 'retour au normal : clavier masqué')
})

T.test('clavier de la langue, rangées décalées', async () => {
  setMode('quick')
  T.eq(Array.from(kb().querySelectorAll('.qk-row')).map(r => Array.from(r.querySelectorAll('.qk-key')).map(k => k.dataset.letter).join('')), ['azert', 'qsdfg', 'wxcvb'], 'AZERTY (français)')
  const x = r => kb().querySelector(`.qk-row.r${r} .qk-key`).getBoundingClientRect().left
  T.ok(x(1) < x(2) && x(2) < x(3), 'rangées décalées')
  T.eq(keyEl('a').querySelector('.qk-letter').textContent, 'a', 'nom de la touche')
  setMode('normal')
})

T.test('marque glissée sur une touche : affectée, et la marque revient à sa place', async () => {
  setMode('quick')
  try {
    const m = await T.mark({type: 'acc', content: 'Am7', top: 900, left: 700})
    m.data.css = ['ungray']
    const {top, left} = m
    const from = center(m.obj), to = center(keyEl('z'))
    T.mouse(m.obj, 'mousedown', {clientX: from.x, clientY: from.y})
    T.mouse(document, 'mousemove', {clientX: from.x + 20, clientY: from.y + 20})
    T.mouse(document, 'mousemove', {clientX: to.x, clientY: to.y})
    T.mouse(document, 'mouseup', {clientX: to.x, clientY: to.y})
    T.eq([m.top, m.left], [top, left], 'marque à sa place (données)')
    T.eq([parseInt(m.obj.style.top), parseInt(m.obj.style.left)], [top, left], 'marque à sa place (affichage)')
    const d = QuickKeyboard.dataOf('z')
    T.eq([d && d.type, d && d.content, d && d.css], ['acc', 'Am7', ['ungray']], 'toute la marque affectée')
    T.no(d && ('id' in d || 'top' in d || 'left' in d), 'ni identifiant ni place')
    T.no(keyEl('z').classList.contains('empty'), 'touche affectée')
    T.ok(keyEl('z').querySelector('.qk-mark div.amark.acc'), 'marque affichée dans la touche')
    T.eq(keyEl('z').title, 'Am7', 'texte au survol')
    T.eq((Preferences.getData().quick_keys || {}).z.content, 'Am7', 'affectation enregistrée avec l’analyse')
    AObjet.remove(m)
  } finally { setMode('normal') }
})

T.test('touche tenue + simple clic : marque posée (plusieurs clics, plusieurs marques)', async () => {
  setMode('quick')
  const P = AMark_Editor.prototype, orig = P.getAMarkType
  let editor = 0
  P.getAMarkType = function(){ editor++ }
  try {
    QuickKeyboard.assign('q', {type: 'not', subtype: 'np', content: 'NP'})
    const found = newIds()
    kev('keydown', 'q')
    T.ok(keyEl('q').classList.contains('on'), 'touche tenue : en exergue')
    click(700, 500) ; click(800, 520)
    kev('keyup', 'q')
    T.no(keyEl('q').classList.contains('on'), 'relâchée : plus en exergue')
    const made = found()
    T.eq(made.length, 2, 'deux marques')
    T.eq(made.map(m => [m.type, m.subtype, m.content]), [['not', 'np', 'NP'], ['not', 'np', 'NP']], 'marques de la touche')
    T.eq(editor, 0, 'aucun éditeur ouvert')
    made.forEach(m => AObjet.remove(m))
    // Touche vide : en rouge, rien d'autre
    const found2 = newIds()
    kev('keydown', 't')
    click()
    T.ok(keyEl('t').classList.contains('miss'), 'touche vide : en rouge')
    T.eq(found2().length, 0, 'aucune marque')
    T.eq(editor, 0, 'aucun éditeur')
    kev('keyup', 't')
    T.no(keyEl('t').classList.contains('miss'), 'relâchée : plus en rouge')
    // Lettre hors du clavier : rien (saisie accélérée désactivée)
    kev('keydown', 'h') ; click() ; kev('keyup', 'h')
    T.eq(found2().length + editor, 0, 'saisie accélérée désactivée')
    // Clic sur le clavier lui-même : aucune marque
    kev('keydown', 'q')
    const c = center(keyEl('g'))
    for ( const type of ['mousedown', 'mouseup', 'click'] ) T.mouse(keyEl('g'), type, {clientX: c.x, clientY: c.y, detail: 1})
    kev('keyup', 'q')
    T.eq(found2().length, 0, 'clic sur le clavier : rien')
  } finally {
    P.getAMarkType = orig
    HeldLetter.reset()
    setMode('normal')
  }
})

T.test('touche vidée (menu contextuel)', async () => {
  setMode('quick')
  QuickKeyboard.assign('e', {type: 'har', content: 'V7'})
  T.no(keyEl('e').classList.contains('empty'), 'affectée')
  QuickKeyboard.clear('e')
  T.ok(keyEl('e').classList.contains('empty'), 'vidée')
  T.no('e' in (Preferences.getData().quick_keys || {}), 'retirée des affectations')
  T.no(keyEl('e').querySelector('.qk-mark'), 'plus de marque affichée')
  setMode('normal')
})

T.test('saisie normale : lettre + clic reste la saisie accélérée', async () => {
  setMode('normal')
  const P = AMark_Editor.prototype, origC = P.getAMarkContent
  let step = null
  P.getAMarkContent = function(){ step = this.amark_type }
  try {
    kev('keydown', 'h') ; click() ; kev('keyup', 'h')
    T.eq(step, 'har', 'h + clic : harmonie')
  } finally { P.getAMarkContent = origC ; HeldLetter.reset() }
})
