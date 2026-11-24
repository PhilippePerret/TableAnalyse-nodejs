// Type de marque bloqué : le clic (ou double-clic, suivant la préférence)
// crée une marque du type bloqué ; Alt-clic fait choisir le type (#233)
const { AMark_Editor } = await T.imp('AMark_Editor')
const { Preferences } = await T.imp('Preferences')

// Étape atteinte par l'éditeur de création : 'type' ou 'content:<type>'
let step = null
const P = AMark_Editor.prototype
const origType = P.getAMarkType, origContent = P.getAMarkContent
const fire = (kind, alt) => {
  step = null
  const opts = {altKey: alt, clientX: 500, clientY: 500, detail: kind == 'click' ? 1 : 2}
  for ( const type of ['mousedown', 'mouseup', kind] ) T.mouse(document.body, type, opts)
  return step
}

for ( const mode of ['simple', 'double'] ) {
  T.test(`création par ${mode} clic, type bloqué ou non, avec ou sans Alt`, async () => {
    P.getAMarkType    = function(){ step = 'type' }
    P.getAMarkContent = function(){ step = 'content:' + this.amark_type }
    Preferences.saveData('mark_creation_click', mode)
    const kind = mode == 'simple' ? 'click' : 'dblclick'
    try {
      AMark_Editor.lockedType = 'acc'
      T.eq(fire(kind, false), 'content:acc', 'bloqué, sans Alt')
      T.eq(fire(kind, true), 'type', 'bloqué, avec Alt')
      AMark_Editor.lockedType = null
      T.eq(fire(kind, false), 'type', 'non bloqué, sans Alt')
      T.eq(fire(kind, true), 'type', 'non bloqué, avec Alt')
      // Clic de l'autre mode : aucune création
      const other = kind == 'click' ? 'dblclick' : 'click'
      T.eq(fire(other, false), null, `${other} sans effet en mode ${mode}`)
    } finally {
      P.getAMarkType = origType ; P.getAMarkContent = origContent
      AMark_Editor.lockedType = null
    }
  })
}
