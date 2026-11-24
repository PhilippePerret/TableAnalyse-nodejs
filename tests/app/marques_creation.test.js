// Création de marques de chaque type et sous-type par l'éditeur de
// création (choix du type, du sous-type, contenu), affichage, édition,
// prolongation, suppression (touche Effacement) et enregistrement
const { AMark } = await T.imp('AMark')
const { AMark_Editor } = await T.imp('AMark_Editor')
const { AObjet } = await T.imp('AObjet')
const { AnalyseSaver } = await T.imp('AnalyseSaver')
const C = await T.imp('Constants')

const ev = {pageX: 700, pageY: 1100, clientX: 700, clientY: 400}
// Création complète par l'éditeur ; +content+ undefined : contenu par
// défaut (ou automatique) validé tel quel
const create = (type, subtype, content) => {
  const before = new Set(AObjet.items.map(m => m.id))
  const ed = new AMark_Editor({event: ev, onReleaseMethod: AMark.createNew.bind(AMark, ev)})
  ed.proceed()
  ed.onChooseType(type)
  subtype && ed.onChooseSubtype(subtype)
  const startPanel = document.querySelector('.form-start-panel')
  startPanel && startPanel.querySelector('.btn-default').click()
  ed.isLayoutTitle && !ed._amark_level && ed.onChooseTitleLevel(2)
  const editor = ed._editorcontent
  let field = null
  if ( editor && !AObjet.items.some(m => !before.has(m.id)) ) {
    field = editor.getValue()
    if ( undefined !== content ) editor.value = content
    editor.onClickOK()
  }
  ;[ed._gettertype, ed._gettersubtype, ed._getterlevel].forEach(g => g && g.obj && (g.hide(), g.obj.remove()))
  T.eq(document.querySelectorAll('.container_getter_in_list:not(.hidden)').length, 0, `${type}/${subtype || ''} : aucune liste restée ouverte`)
  return {mark: AObjet.items.find(m => !before.has(m.id)), field}
}
const classes = m => m.obj.className

T.test('accord, harmonie, modulation, emprunt, motif, degré, pédale', async () => {
  for ( const [type, content] of [['acc','Am7'], ['har','V7'], ['mod','G'], ['emp','D'], ['mot','Motif A'], ['deg','5'], ['ped','1']] ) {
    const {mark, field} = create(type, null, content)
    T.ok(mark, `${type} créée`)
    if ( !mark ) continue
    T.eq(field, String(C.AMARQUES_TYPES[type].default), `${type} : valeur par défaut du champ`)
    T.eq([mark.type, mark.content], [type, content], `${type} : données`)
    T.ok(classes(mark).includes(type), `${type} : classe CSS`)
    T.includes(mark.obj.textContent, content, `${type} : texte affiché`)
    T.ok(mark.obj.classList.contains('philnote') == C.TYPES_PHILHARMONIEFONT.includes(type), `${type} : police PhilNote si attendue`)
    AObjet.remove(mark)
  }
})

T.test('cadences (contenu automatique)', async () => {
  for ( const [sub, d] of Object.entries(C.CADENCES) ) {
    const {mark} = create('cad', sub)
    T.ok(mark, `cadence ${sub} créée`)
    if ( !mark ) continue
    T.eq([mark.type, mark.subtype, mark.content], ['cad', sub, d.autocontent], `cadence ${sub}`)
    AObjet.remove(mark)
  }
})

T.test('notes (contenu automatique)', async () => {
  for ( const [sub, d] of Object.entries(C.TYPES_NOTES) ) {
    const {mark} = create('not', sub)
    T.ok(mark, `note ${sub} créée`)
    if ( !mark ) continue
    T.eq([mark.type, mark.subtype, mark.content], ['not', sub, d.autocontent], `note ${sub}`)
    AObjet.remove(mark)
  }
})

T.test('cadres (cellule, cadre avec texte, cadre seul)', async () => {
  for ( const [sub, content] of [['cel','C1'], ['bxt','Exposition'], ['box', undefined]] ) {
    const {mark} = create('bbx', sub, content)
    T.ok(mark, `cadre ${sub} créé`)
    if ( !mark ) continue
    T.eq([mark.type, mark.subtype], ['bbx', sub], `cadre ${sub}`)
    content && T.eq(mark.content, content, `cadre ${sub} : contenu`)
    T.ok(mark.isBox, `cadre ${sub} : boite`)
    AObjet.remove(mark)
  }
})

T.test('textes (4 tailles, long, index, mise en forme)', async () => {
  for ( const [sub, content] of [['size1','Titre'], ['size2','Sous-titre'], ['size3','Texte'], ['size4','Note'], ['idx','a'], ['long','Ligne 1']] ) {
    const {mark} = create('txt', sub, content)
    T.ok(mark, `texte ${sub} créé`)
    if ( !mark ) continue
    T.eq([mark.type, mark.subtype, mark.content], ['txt', sub, content], `texte ${sub}`)
    T.ok(classes(mark).includes(sub), `texte ${sub} : classe`)
    AObjet.remove(mark)
  }
  // Mise en forme : gras, italique, souligné, exposant
  const {mark} = create('txt', 'size3', '**gras** *ital* 1^er')
  const html = mark.obj.querySelector('span.content').innerHTML
  T.includes(html, '<b>gras</b>', 'gras') ; T.includes(html, '<i>ital</i>', 'italique') ; T.includes(html, '<sup>er</sup>', 'exposant')
  AObjet.remove(mark)
})

T.test('segments (4 dispositions) et cercle', async () => {
  for ( const seg of C.TYPES_SEGMENT ) {
    const {mark} = create('seg', seg.value, 'légende')
    T.ok(mark, `segment ${seg.value} créé`)
    mark && T.eq([mark.type, mark.subtype], ['seg', seg.value], `segment ${seg.value}`)
    mark && AObjet.remove(mark)
  }
  const {mark} = create('cir')
  T.ok(mark && mark.type == 'cir', 'cercle créé sans contenu')
  mark && AObjet.remove(mark)
})

T.test('mise en page (saut de page, délimitation, titre)', async () => {
  for ( const [sub, content] of [['pag', undefined], ['del', '12 mm'], ['tit', 'Exposition']] ) {
    const {mark} = create('lay', sub, content)
    T.ok(mark, `mise en page ${sub} créée`)
    if ( !mark ) continue
    T.eq([mark.type, mark.subtype], ['lay', sub], `mise en page ${sub}`)
    sub == 'tit' && T.eq(mark.data.level, 2, 'niveau du titre')
    sub == 'del' && T.eq(mark.content, '12 mm', 'hauteur de la délimitation')
    AObjet.remove(mark)
  }
})

T.test('forme : début (borne, cadre) puis fin rattachée à son début', async () => {
  for ( const [start, end] of [['fpar','fparz'], ['prt','prtz'], ['fsec','fsecz'], ['sec','secz']] ) {
    const s = create('frm', start, `Début ${start}`).mark
    T.ok(s, `début ${start} créé`)
    if ( !s ) continue
    const e = create('frm', end).mark
    T.ok(e, `fin ${end} créée`)
    e && T.eq(e.data.start, s.id, `fin ${end} rattachée au début`)
    e && AObjet.remove(e) ; AObjet.remove(s)
  }
  const seg = create('frm', 'fseg', 'a').mark
  T.ok(seg && seg.isForme, 'segment de forme créé')
  seg && AObjet.remove(seg)
})

T.test('édition : nouveau contenu, ligne de prolongation ajoutée puis retirée', async () => {
  const m = (await T.mark({type: 'acc', content: 'C', top: 1100, left: 800}))
  m.setValue('Dm7')
  T.eq(m.content, 'Dm7', 'contenu modifié')
  T.includes(m.obj.textContent, 'Dm7', 'affichage modifié')
  m.setValue('Dm7 --')
  T.ok(m.prolong && m.hasProlongLine, 'prolongation ajoutée')
  T.eq(m.content, 'Dm7 ', 'contenu sans les tirets')
  m.setValue('Dm7')
  T.no(m.hasProlongLine, 'prolongation retirée')
  AObjet.remove(m)
})

T.test('suppression par la touche Effacement (sélection)', async () => {
  const a = await T.mark({type: 'acc', content: 'E', top: 1100, left: 900})
  const b = await T.mark({type: 'har', content: 'IV', top: 1200, left: 900})
  AObjet.deselectAll()
  AObjet.addToSelection(a) ; AObjet.addToSelection(b)
  T.key(document.body, 'Backspace')
  T.no(AObjet.get(a.id) || AObjet.get(b.id), 'marques retirées de la liste')
  T.no(document.body.contains(a.obj) || document.body.contains(b.obj), 'marques retirées de la page')
})

T.test('toutes les marques créées sont enregistrées avec leurs données', async () => {
  const made = []
  for ( const [type, sub, content] of [['acc',null,'F'], ['cad','par'], ['bbx','cel','C2'], ['txt','size2','T'], ['seg','h-up','s'], ['lay','tit','Titre'], ['not','np']] ) {
    made.push(create(type, sub, content).mark)
  }
  T.eq(await AnalyseSaver.save(), true, 'enregistrement')
  const tags = await T.readFile('analyse_tags.yaml')
  for ( const m of made ) {
    T.includes(tags, `id: ${m.id}\n`, `marque ${m.type}/${m.subtype || ''} enregistrée`)
    T.includes(tags, `type: ${m.type}`, `type ${m.type}`)
  }
})
