// Lettre tenue enfoncée + SIMPLE clic sur la table : création d'une
// marque du type dont la lettre est le raccourci, même en mode
// double-clic ; Maj distingue « p » de « P » ; lettre sans type : liste
// des types (sans le type bloqué). Après le clic, la lettre tenue ne va
// plus nulle part jusqu'à son relâchement.
const { AMark_Editor } = await T.imp('AMark_Editor')
const { Preferences } = await T.imp('Preferences')
const { HeldLetter } = await T.imp('HeldLetter')

let step = null
const P = AMark_Editor.prototype
const orig = {type: P.getAMarkType, subtype: P.getAMarkSubType, content: P.getAMarkContent}
const stub = () => {
  P.getAMarkType    = function(){ step = 'type' }
  P.getAMarkSubType = function(){ step = 'subtype:' + this.amark_type }
  P.getAMarkContent = function(){ step = 'content:' + this.amark_type }
}
const restore = () => {
  P.getAMarkType = orig.type ; P.getAMarkSubType = orig.subtype ; P.getAMarkContent = orig.content
  AMark_Editor.lockedType = null
  HeldLetter.reset()
}
const kev = (type, key, opts = {}, target = document.body) => {
  const ev = new KeyboardEvent(type, Object.assign({bubbles: true, cancelable: true, key}, opts))
  target.dispatchEvent(ev)
  return ev
}
const fire = (kind = 'click', opts = {}) => {
  step = null
  const o = Object.assign({clientX: 500, clientY: 500, detail: kind == 'click' ? 1 : 2}, opts)
  for ( const type of ['mousedown', 'mouseup', kind] ) T.mouse(document.body, type, o)
  return step
}
// Lettre pressée, clic, lettre relâchée
const withLetter = (key, clickOpts = {}, keyOpts = {}) => {
  kev('keydown', key, keyOpts)
  const res = fire('click', clickOpts)
  kev('keyup', key, keyOpts)
  return res
}

for ( const mode of ['simple', 'double'] ) {
  T.test(`mode ${mode} : lettre + simple clic → type de la lettre`, async () => {
    stub()
    Preferences.saveData('mark_creation_click', mode)
    try {
      T.eq(withLetter('h'), 'content:har', 'h → harmonie')
      T.eq(withLetter('a'), 'content:acc', 'a → accord')
      T.eq(withLetter('p'), 'content:ped', 'p → pédale')
      T.eq(withLetter('P', {shiftKey: true}, {shiftKey: true}), 'subtype:lay', 'Maj + P → mise en page')
      T.eq(withLetter('e'), 'content:emp', 'e')
      T.eq(withLetter('E', {shiftKey: true}, {shiftKey: true}), 'content:ext', 'Maj + E')
      // Maj pressée après la lettre : casse lue au clic
      T.eq(withLetter('m', {shiftKey: true}), 'content:mod', 'm puis Maj → M')
      // Type bloqué : la lettre l'emporte
      AMark_Editor.lockedType = 'acc'
      T.eq(withLetter('h'), 'content:har', 'type bloqué, lettre h')
      // Lettre sans type : liste des types, même avec un type bloqué
      T.eq(withLetter('w'), 'type', 'lettre sans type, type bloqué')
      AMark_Editor.lockedType = null
      T.eq(withLetter('w'), 'type', 'lettre sans type')
      T.eq(withLetter('é'), 'type', 'lettre accentuée sans type')
      // Sans lettre : comportement habituel
      T.eq(fire('click'), mode == 'simple' ? 'type' : null, 'clic sans lettre')
      T.eq(fire('dblclick'), mode == 'simple' ? null : 'type', 'double-clic sans lettre')
    } finally { restore() }
  })
}

T.test('mode double : lettre tenue, le double-clic ne crée pas une seconde marque', async () => {
  stub()
  Preferences.saveData('mark_creation_click', 'double')
  try {
    kev('keydown', 'h')
    T.eq(fire('click'), 'content:har', 'premier clic')
    T.eq(fire('dblclick'), null, 'double-clic ignoré')
    kev('keyup', 'h')
  } finally { restore() }
})

T.test('touches ignorées : chiffres, ⌘/Ctrl/Option, saisie dans un champ, perte du focus', async () => {
  stub()
  Preferences.saveData('mark_creation_click', 'double')
  try {
    T.eq(withLetter('1'), null, 'chiffre')
    T.eq(withLetter('h', {}, {metaKey: true}), null, '⌘ + h')
    T.eq(withLetter('h', {}, {ctrlKey: true}), null, 'Ctrl + h')
    T.eq(withLetter('h', {}, {altKey: true}), null, 'Option + h')
    const input = document.createElement('input')
    document.body.appendChild(input)
    try {
      kev('keydown', 'h', {}, input)
      T.eq(fire('click'), null, 'lettre tapée dans un champ')
      kev('keyup', 'h', {}, input)
    } finally { input.remove() }
    kev('keydown', 'h')
    window.dispatchEvent(new Event('blur'))
    T.eq(fire('click'), null, 'focus perdu : lettre oubliée')
    kev('keyup', 'h')
    // ⌘-clic avec lettre : rien, et la lettre reste disponible
    kev('keydown', 'h')
    T.eq(fire('click', {metaKey: true}), null, '⌘-clic')
    T.eq(fire('click'), 'content:har', 'clic suivant')
    kev('keyup', 'h')
    // Relâchée : plus de création par simple clic
    T.eq(fire('click'), null, 'après relâchement')
  } finally { restore() }
})

T.test('après le clic, la lettre tenue ne va plus nulle part jusqu’à son relâchement', async () => {
  stub()
  Preferences.saveData('mark_creation_click', 'simple')
  const got = []
  const spy = e => got.push(e.type + ':' + e.key)
  window.addEventListener('keydown', spy, true)
  window.addEventListener('keypress', spy, true)
  window.addEventListener('keyup', spy, true)
  const input = document.createElement('input')
  document.body.appendChild(input)
  try {
    kev('keydown', 'h')
    T.eq(got, ['keydown:h'], 'avant le clic : la lettre passe')
    got.length = 0
    T.eq(fire('click'), 'content:har', 'clic')
    // Répétitions de la touche (dans le champ de l'éditeur, par exemple)
    const rep = kev('keydown', 'h', {repeat: true}, input)
    T.ok(rep.defaultPrevented, 'répétition sans effet')
    kev('keypress', 'h', {}, input)
    // Maj pressée entre-temps : même lettre
    kev('keydown', 'H', {repeat: true, shiftKey: true}, input)
    // Une autre lettre passe (saisie du contenu)
    kev('keydown', 'x', {}, input)
    kev('keyup', 'x', {}, input)
    kev('keyup', 'H', {shiftKey: true}, input)
    T.eq(got, ['keydown:x', 'keyup:x'], 'seule l’autre lettre passe')
    got.length = 0
    kev('keydown', 'h', {}, input)
    T.eq(got, ['keydown:h'], 'relâchée : la lettre passe de nouveau')
    kev('keyup', 'h', {}, input)
  } finally {
    window.removeEventListener('keydown', spy, true)
    window.removeEventListener('keypress', spy, true)
    window.removeEventListener('keyup', spy, true)
    input.remove()
    restore()
  }
})
