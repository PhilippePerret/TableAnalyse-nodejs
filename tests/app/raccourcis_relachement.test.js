// Raccourcis clavier : déclenchés au RELÂCHEMENT de la touche, jamais à
// l'appui ; un clic pendant que la touche est tenue les annule
const { AMark } = await T.imp('AMark')
const { AObjet } = await T.imp('AObjet')
const { AMark_Editor } = await T.imp('AMark_Editor')
const { AnalyseSaver } = await T.imp('AnalyseSaver')
const { Preferences } = await T.imp('Preferences')
const { hasPendingShortcut, cancelPendingShortcut } = await T.imp('KeyRelease')

const kev = (type, key, opts = {}, target = document.activeElement || document.body) => {
  const ev = new KeyboardEvent(type, Object.assign({bubbles: true, cancelable: true, key}, opts))
  target.dispatchEvent(ev)
  return ev
}
const getterShown = () => !!document.querySelector('div.container_getter_in_list:not(.hidden)')
const clickTable = () => {
  for ( const type of ['mousedown', 'mouseup', 'click'] ) T.mouse(document.body, type, {clientX: 500, clientY: 500, detail: 1})
}

T.test('liste des types : la lettre choisit au relâchement, pas à l’appui', async () => {
  const P = AMark_Editor.prototype
  const origContent = P.getAMarkContent
  let step = null
  P.getAMarkContent = function(){ step = 'content:' + this.amark_type }
  Preferences.saveData('mark_creation_click', 'simple')
  try {
    clickTable()
    T.ok(getterShown(), 'liste des types affichée')
    const down = kev('keydown', 'h', {code: 'KeyH'})
    kev('keypress', 'h', {code: 'KeyH'})
    T.ok(getterShown(), 'touche pressée : liste toujours affichée')
    T.eq(step, null, 'touche pressée : aucun choix')
    T.ok(hasPendingShortcut(), 'raccourci en attente')
    // Répétitions de la touche tenue : rien
    kev('keydown', 'h', {code: 'KeyH', repeat: true})
    kev('keypress', 'h', {code: 'KeyH', repeat: true})
    T.eq(step, null, 'répétitions : aucun choix')
    kev('keyup', 'h', {code: 'KeyH'})
    T.eq(step, 'content:har', 'relâchement : harmonie choisie')
    T.no(getterShown(), 'liste fermée')

    // Maj relâchée avant la lettre : casse de l'appui (M = modulation)
    step = null
    clickTable()
    kev('keydown', 'M', {code: 'KeyM', shiftKey: true})
    kev('keypress', 'M', {code: 'KeyM', shiftKey: true})
    kev('keyup', 'Shift', {code: 'ShiftLeft'})
    T.eq(step, null, 'Maj relâchée : aucun choix')
    kev('keyup', 'm', {code: 'KeyM'})
    T.eq(step, 'content:mod', 'relâchement de M : modulation')

    // Clic pendant que la touche est tenue : raccourci annulé
    step = null
    clickTable()
    kev('keydown', 'h', {code: 'KeyH'})
    kev('keypress', 'h', {code: 'KeyH'})
    T.mouse(document.body, 'mousedown', {clientX: 10, clientY: 10})
    T.no(hasPendingShortcut(), 'clic : raccourci annulé')
    kev('keyup', 'h', {code: 'KeyH'})
    T.eq(step, null, 'relâchement après le clic : aucun choix')
    T.ok(getterShown(), 'liste toujours affichée')
    // Échap annulé par un clic, puis Échap normal
    kev('keydown', 'Escape', {code: 'Escape'})
    T.mouse(document.body, 'mousedown', {clientX: 10, clientY: 10})
    kev('keyup', 'Escape', {code: 'Escape'})
    T.ok(getterShown(), 'Échap suivi d’un clic : liste toujours affichée')
    kev('keydown', 'Escape', {code: 'Escape'})
    kev('keyup', 'Escape', {code: 'Escape'})
    T.no(getterShown(), 'Échap : liste fermée')
  } finally {
    P.getAMarkContent = origContent
    cancelPendingShortcut()
  }
})

T.test('⌘S : enregistrement au relâchement (de S ou de ⌘), une seule fois', async () => {
  const orig = AnalyseSaver.save
  let n = 0
  AnalyseSaver.save = async function(){ n++ ; return true }
  try {
    kev('keydown', 's', {code: 'KeyS', metaKey: true}, document.body)
    kev('keydown', 's', {code: 'KeyS', metaKey: true, repeat: true}, document.body)
    T.eq(n, 0, 'touches pressées : pas d’enregistrement')
    // macOS : le relâchement de S tenu avec ⌘ peut manquer
    kev('keyup', 'Meta', {code: 'MetaLeft'}, document.body)
    T.eq(n, 1, 'relâchement de ⌘ : enregistrement')
    kev('keyup', 's', {code: 'KeyS'}, document.body)
    T.eq(n, 1, 'relâchement de S ensuite : rien de plus')
    kev('keydown', 's', {code: 'KeyS', metaKey: true}, document.body)
    kev('keyup', 's', {code: 'KeyS', metaKey: true}, document.body)
    T.eq(n, 2, 'relâchement de S : enregistrement')
    kev('keydown', 's', {code: 'KeyS', metaKey: true}, document.body)
    T.mouse(document.body, 'mousedown', {clientX: 10, clientY: 10})
    kev('keyup', 's', {code: 'KeyS', metaKey: true}, document.body)
    T.eq(n, 2, 'clic entre les deux : pas d’enregistrement')
  } finally {
    AnalyseSaver.save = orig
    cancelPendingShortcut()
  }
})

T.test('Effacement : suppression au relâchement, annulée par un clic', async () => {
  const a = await T.mark({type: 'acc', content: 'E', top: 1100, left: 900})
  AObjet.deselectAll()
  AObjet.addToSelection(a)
  kev('keydown', 'Backspace', {code: 'Backspace'}, document.body)
  T.ok(AObjet.get(a.id), 'touche pressée : marque toujours là')
  T.mouse(document.body, 'mousedown', {clientX: 10, clientY: 10})
  kev('keyup', 'Backspace', {code: 'Backspace'}, document.body)
  T.ok(AObjet.get(a.id), 'clic entre les deux : marque toujours là')
  AObjet.deselectAll()
  AObjet.addToSelection(a)
  kev('keydown', 'Backspace', {code: 'Backspace'}, document.body)
  kev('keyup', 'Backspace', {code: 'Backspace'}, document.body)
  T.no(AObjet.get(a.id), 'relâchement : marque supprimée')
})

T.test('Entrée sur une marque sélectionnée : édition au relâchement', async () => {
  const a = await T.mark({type: 'acc', content: 'F', top: 1100, left: 900})
  let edited = 0
  a.edit = () => { edited++ }
  AObjet.deselectAll()
  AObjet.addToSelection(a)
  try {
    kev('keydown', 'Enter', {code: 'Enter'}, document.body)
    T.eq(edited, 0, 'touche pressée : pas d’édition')
    kev('keyup', 'Enter', {code: 'Enter'}, document.body)
    T.eq(edited, 1, 'relâchement : édition')
  } finally {
    AObjet.deselectAll()
    AObjet.remove(a)
    cancelPendingShortcut()
  }
})

T.test('boite à outils : ⌘ + Maj + O, plus Maj + O (#257)', async () => {
  const { Tools } = await T.imp('Tools')
  const orig = Tools.toggle
  let n = 0
  Tools.toggle = function(){ n++ }
  try {
    kev('keydown', 'O', {code: 'KeyO', shiftKey: true}, document.body)
    kev('keypress', 'O', {code: 'KeyO', shiftKey: true}, document.body)
    kev('keyup', 'O', {code: 'KeyO', shiftKey: true}, document.body)
    T.eq(n, 0, 'Maj + O : rien')
    kev('keydown', 'o', {code: 'KeyO', shiftKey: true, metaKey: true}, document.body)
    T.eq(n, 0, '⌘ + Maj + O pressées : rien encore')
    kev('keyup', 'o', {code: 'KeyO', shiftKey: true, metaKey: true}, document.body)
    T.eq(n, 1, '⌘ + Maj + O relâchées : boite à outils')
    kev('keydown', 'o', {code: 'KeyO', metaKey: true}, document.body)
    kev('keyup', 'o', {code: 'KeyO', metaKey: true}, document.body)
    T.eq(n, 1, '⌘ + O (sans Maj) : pas la boite à outils')
  } finally {
    Tools.toggle = orig
    cancelPendingShortcut()
  }
})

T.test('manuel : ⌘ + Maj + M (format des préférences), plus Maj + M ; demander la main : ⌘ + Maj + P (#258)', async () => {
  const { Manuel } = await T.imp('Manuel')
  const { Preferences } = await T.imp('Preferences')
  const orig = Manuel.toggle
  let n = 0
  Manuel.toggle = function(){ n++ }
  const opened = async () => (await T.invoke('test:openedUrls')).slice()
  try {
    kev('keydown', 'M', {code: 'KeyM', shiftKey: true}, document.body)
    kev('keypress', 'M', {code: 'KeyM', shiftKey: true}, document.body)
    kev('keyup', 'M', {code: 'KeyM', shiftKey: true}, document.body)
    T.eq(n, 0, 'Maj + M : rien')
    // Préférence (section « Général ») : HTML par défaut
    const sel = document.querySelector('#pref-help_format')
    T.ok(sel, 'menu des préférences')
    T.eq(Array.from(sel.options).map(o => o.textContent), ['HTML', 'PDF', 'ePub'], 'choix')
    T.eq(sel.closest('.div-data').querySelector('label').textContent, 'Aide ouverte par le raccourci ⌘Maj+M', 'libellé')
    T.eq(Preferences.get('help_format'), 'html', 'HTML par défaut')
    const before = (await opened()).length
    kev('keydown', 'm', {code: 'KeyM', shiftKey: true, metaKey: true}, document.body)
    T.eq((await opened()).length, before, 'touches pressées : rien')
    kev('keyup', 'm', {code: 'KeyM', shiftKey: true, metaKey: true}, document.body)
    await T.until(async () => (await opened()).length == before + 1, 'manuel ouvert au relâchement')
    T.ok((await opened()).pop().endsWith('Manuel.html'), 'manuel HTML')
    Preferences.saveData('help_format', 'epub')
    await T.wait(100)
    kev('keydown', 'm', {code: 'KeyM', shiftKey: true, metaKey: true}, document.body)
    kev('keyup', 'm', {code: 'KeyM', shiftKey: true, metaKey: true}, document.body)
    await T.until(async () => (await opened()).length == before + 2, 'manuel ePub ouvert')
    T.ok((await opened()).pop().endsWith('Manuel.epub'), 'manuel ePub')
    Preferences.saveData('help_format', 'html')
    // ⌘ + Maj + P : demander la main (au relâchement)
    const down = new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: 'p', code: 'KeyP', shiftKey: true, metaKey: true})
    document.body.dispatchEvent(down)
    T.ok(down.defaultPrevented && hasPendingShortcut(), '⌘ + Maj + P : raccourci en attente')
    kev('keyup', 'p', {code: 'KeyP', shiftKey: true, metaKey: true}, document.body)
    T.no(hasPendingShortcut(), 'joué au relâchement')
    T.eq(n, 0, 'manuel interne jamais basculé')
  } finally {
    Manuel.toggle = orig
    cancelPendingShortcut()
  }
})

T.test('« Scinder la fenêtre » : raccourci affiché « ⌘/ » quel que soit le clavier (#252)', async () => {
  const { splitAcceleratorFor, splitAccelerator } = await T.imp('KeyboardEvents')
  const map = obj => new Map(Object.entries(obj))
  const fr = map({Slash: '=', Period: ':', Comma: ';', Semicolon: 'm', KeyM: ','})
  const us = map({Slash: '/', Period: '.', Comma: ','})
  T.eq(splitAcceleratorFor(fr, 'darwin'), 'CmdOrCtrl+Shift+.', 'clavier français (macOS) : Maj + touche du « : »')
  T.eq(splitAcceleratorFor(us, 'darwin'), 'CmdOrCtrl+/', 'clavier américain')
  T.eq(splitAcceleratorFor(map({Digit7: '/'}), 'darwin'), 'CmdOrCtrl+7', '« / » sur une autre touche')
  T.eq(splitAcceleratorFor(fr, 'win32'), 'CmdOrCtrl+/', 'Windows : inchangé')
  T.eq(splitAcceleratorFor(null, 'darwin'), 'CmdOrCtrl+/', 'disposition inconnue')
  const expected = await splitAccelerator()
  await T.until(() => document.querySelector('#options_tool option[value="toggleSplit"]').dataset.accelerator == expected, 'menu « Options » réglé')
})

T.test('défilement : ⌘ + ↓/↑ (hauteur de la fenêtre), avec Maj : trois fois (#259)', async () => {
  const h = window.innerHeight
  const maxY = document.documentElement.scrollHeight - h
  T.ok(maxY > 5 * h, 'table assez haute')
  const key = (k, opts) => {
    const down = new KeyboardEvent('keydown', Object.assign({bubbles: true, cancelable: true, key: k, code: k, metaKey: true}, opts))
    document.body.dispatchEvent(down)
    const y = window.scrollY
    document.body.dispatchEvent(new KeyboardEvent('keyup', Object.assign({bubbles: true, cancelable: true, key: k, code: k, metaKey: true}, opts)))
    return {pressedY: y, defaultPrevented: down.defaultPrevented}
  }
  window.scrollTo({top: 0, behavior: 'instant'})
  const r = key('ArrowDown')
  T.eq(r.pressedY, 0, 'touches pressées : pas encore de défilement')
  T.ok(r.defaultPrevented, 'défilement du système empêché')
  T.eq(Math.round(window.scrollY), Math.round(h), '⌘ + ↓ : une hauteur de fenêtre')
  key('ArrowDown', {shiftKey: true})
  T.eq(Math.round(window.scrollY), Math.round(4 * h), '⌘ + Maj + ↓ : trois hauteurs de plus')
  key('ArrowUp', {shiftKey: true})
  T.eq(Math.round(window.scrollY), Math.round(h), '⌘ + Maj + ↑ : trois hauteurs de moins')
  key('ArrowUp')
  T.eq(Math.round(window.scrollY), 0, '⌘ + ↑ : retour en haut')
  // Ctrl (Windows, Linux) : cf. cmdKey
  window.scrollTo({top: 0, behavior: 'instant'})
})

T.test('⌘ tenu, flèche pressée plusieurs fois sans relâchement reçu (macOS) : chaque appui compte', async () => {
  const h = window.innerHeight
  window.scrollTo({top: 0, behavior: 'instant'})
  const down = (opts = {}) => document.body.dispatchEvent(new KeyboardEvent('keydown', Object.assign({bubbles: true, cancelable: true, key: 'ArrowDown', code: 'ArrowDown', metaKey: true}, opts)))
  down() ; down() ; down({repeat: true}) ; down()
  T.eq(Math.round(window.scrollY), Math.round(2 * h), 'deux appuis comptés, la répétition ignorée')
  document.body.dispatchEvent(new KeyboardEvent('keyup', {bubbles: true, cancelable: true, key: 'Meta', code: 'MetaLeft'}))
  T.eq(Math.round(window.scrollY), Math.round(3 * h), 'relâchement de ⌘ : troisième appui')
  window.scrollTo({top: 0, behavior: 'instant'})
})

T.test('combinaison avec ⌘ : jouée au premier relâchement d’une de ses touches (Maj comprise, #261)', async () => {
  const { Split } = await T.imp('Split')
  const orig = Split.toggle
  let n = 0
  Split.toggle = function(){ n++ }
  try {
    document.body.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, cancelable: true, key: '/', code: 'Period', metaKey: true, shiftKey: true}))
    T.eq(n, 0, 'touches pressées : rien')
    // (relâchement de « : » jamais reçu, ⌘ tenue)
    document.body.dispatchEvent(new KeyboardEvent('keyup', {bubbles: true, cancelable: true, key: 'Shift', code: 'ShiftLeft', metaKey: true}))
    T.eq(n, 1, 'relâchement de Maj : fenêtre scindée')
    document.body.dispatchEvent(new KeyboardEvent('keyup', {bubbles: true, cancelable: true, key: 'Meta', code: 'MetaLeft'}))
    T.eq(n, 1, 'relâchement de ⌘ ensuite : rien de plus')
  } finally {
    Split.toggle = orig
    cancelPendingShortcut()
  }
})
