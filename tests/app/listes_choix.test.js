// Listes de choix (types, sous-types) : une liste retirée n'écoute plus
// le clavier (#271) ; « Sous-type… » du panneau de valeur : liste à
// côté du panneau, jamais dessus (#270)
const { AMark } = await T.imp('AMark')
const { AMark_Editor } = await T.imp('AMark_Editor')
const { AObjet } = await T.imp('AObjet')

const kev = (type, key, target = document.body) => target.dispatchEvent(new KeyboardEvent(type, {bubbles: true, cancelable: true, key, code: `Key${key.toUpperCase()}`}))
const ev = {pageX: 600, pageY: 600, clientX: 600, clientY: 600}

T.test('liste retirée (retour aux types) : plus d’écoute du clavier (#271)', async () => {
  const chosen = []
  const ed = new AMark_Editor({event: ev, onReleaseMethod: () => {}})
  const origChoose = ed.onChooseType.bind(ed)
  ed.onChooseType = (v) => { chosen.push(v) ; return origChoose(v) }
  ed.proceed()                       // liste des types
  const first = ed._gettertype
  T.ok(first && first.listening, 'liste des types à l’écoute')
  ed.onWantTypes()                   // liste reconstruite (l’ancienne retirée)
  T.no(first.listening, 'ancienne liste : plus à l’écoute')
  T.no(first.obj.isConnected, 'ancienne liste : retirée')
  const second = ed._gettertype
  second.destroy()
  T.no(second.listening, 'liste détruite : plus à l’écoute')
  // Plus tard : « a » (raccourci des accords) ne rouvre rien
  const editorsBefore = document.querySelectorAll('div.mini_editeur:not(.hidden)').length
  kev('keydown', 'a') ; kev('keypress', 'a') ; kev('keyup', 'a')
  T.eq(chosen, [], 'aucun choix fait par une liste retirée')
  T.eq(document.querySelectorAll('div.mini_editeur:not(.hidden)').length, editorsBefore, 'aucun panneau ouvert')
})
