// Panneaux de choix de la création d'une marque (type, sous-type, niveau
// de titre, contenu) : « Renoncer », bouton rouge de l'en-tête et touche
// Échap ferment le panneau sans rien créer, sans le rouvrir (#238)
const { AMark } = await T.imp('AMark')
const { AMark_Editor } = await T.imp('AMark_Editor')
const { AObjet } = await T.imp('AObjet')
const C = await T.imp('Constants')

const ev = {pageX: 700, pageY: 1100, clientX: 700, clientY: 400}
const visibleGetters = () => [...document.querySelectorAll('.container_getter_in_list')].filter(g => !g.classList.contains('hidden') && g.getClientRects().length)
const visibleEditors = () => [...document.querySelectorAll('div.mini_editeur')].filter(e => e.getClientRects().length && getComputedStyle(e).display != 'none')
const WAYS = {
    renoncer: panel => panel.querySelector(':scope > .buttons .btn-close, .buttons .btn-close').click()
  , rouge:    panel => panel.querySelector('div.panneau-head span.panneau-close').click()
  , echap:    ()    => T.key(document.body, 'Escape')
}
const start = () => {
  const n = AObjet.items.length
  const ed = new AMark_Editor({event: ev, onReleaseMethod: AMark.createNew.bind(AMark, ev)})
  ed.proceed()
  return {ed, n}
}
// Choix d'une valeur dans la liste ouverte, par un clic (comme l'utilisateur)
const choose = (value) => {
  const li = visibleGetters().map(g => g.querySelector(`li[value="${value}"]`)).find(Boolean)
  T.ok(li, `« ${value} » dans la liste ouverte`)
  li && li.click()
}
const closedWell = (label, n) => {
  T.eq(visibleGetters().length, 0, `${label} : aucune liste ouverte`)
  T.eq(visibleEditors().length, 0, `${label} : aucun éditeur ouvert`)
  T.eq(AObjet.items.length, n, `${label} : aucune marque créée`)
}

for ( const [way, act] of Object.entries(WAYS) ) {
  T.test(`liste des types : ${way}`, async () => {
    const {n} = start()
    const panel = visibleGetters()[0]
    T.ok(panel, 'liste des types ouverte')
    act(panel)
    closedWell(`types/${way}`, n)
  })

  T.test(`listes des sous-types (tous les types) : ${way}`, async () => {
    const withSub = Object.values(C.AMARQUES_TYPES).filter(d => d.subdata || d.subtype).map(d => d.value)
    T.ok(withSub.length >= 7, `types à sous-types (${withSub.join(', ')})`)
    for ( const type of withSub ) {
      const {n} = start()
      choose(type)
      T.eq(visibleGetters().length, 1, `${type} : liste des types fermée, sous-types ouverts`)
      const panel = visibleGetters()[0]
      T.ok(panel, `${type} : liste des sous-types ouverte`)
      if ( !panel ) continue
      act(panel)
      closedWell(`${type}/${way}`, n)
    }
  })

  T.test(`éditeur du contenu : ${way}`, async () => {
    const {n} = start()
    choose('acc')
    const editor = visibleEditors()[0]
    T.ok(editor, 'éditeur ouvert')
    if ( !editor ) return
    if ( way == 'echap' ) T.key(editor.querySelector('input'), 'Escape')
    else if ( way == 'rouge' ) editor.querySelector('div.panneau-head span.panneau-close').click()
    else editor.querySelector('.btn-close, button.cancel').click()
    closedWell(`contenu/${way}`, n)
  })
}

T.test('niveau de titre : renoncer ramène aux sous-types de mise en page', async () => {
  const {ed, n} = start()
  choose('lay') ; choose('tit')
  const panel = visibleGetters()[0]
  T.ok(panel && ed._getterlevel, 'liste des niveaux ouverte')
  panel.querySelector('.btn-close').click()
  T.ok(visibleGetters().length == 1 && ed._gettersubtype && !ed._gettersubtype.obj.classList.contains('hidden'), 'retour aux sous-types')
  visibleGetters()[0].querySelector('.btn-close').click()
  closedWell('titre', n)
})

T.test('changement de type par le menu : renoncer sans erreur', async () => {
  const mod = await T.imp('MenuAMark')
  const Menu = Object.values(mod).find(v => v && v.onActivate_changeType)
  T.ok(Menu, 'menu « Marque »')
  if ( !Menu ) return
  const m = await T.mark({type: 'acc', content: 'C'})
  AObjet.deselectAll() ; AObjet.addToSelection(m)
  Menu.onActivate_changeType()
  visibleGetters()[0].querySelector('.btn-close').click()
  T.eq(m.type, 'acc', 'type inchangé')
  T.eq(visibleGetters().length, 0, 'liste fermée')
  AObjet.remove(m)
})
