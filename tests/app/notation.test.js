// Notation des accords batave / italienne (préférences notation_input et
// notation_display, cf. renderer/js/Notation.js)
const { AMark } = await T.imp('AMark')
const { AMark_Editor } = await T.imp('AMark_Editor')
const { AObjet } = await T.imp('AObjet')
const { Preferences } = await T.imp('Preferences')
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { Stage } = await T.imp('Exporter')

const ev = {pageX: 600, pageY: 600, clientX: 600, clientY: 600}
const setPref = (key, v) => { const el = document.querySelector(`#pref-${key}`); el.value = v; el.dispatchEvent(new Event('change')) }
const newIds = () => { const before = new Set(AObjet.items.map(m => m.id)) ; return () => AObjet.items.find(m => !before.has(m.id)) }
// Création d'une marque +type+ par l'éditeur : valeur initiale du champ,
// puis saisie de +typed+
const create = (type, typed) => {
  const found = newIds()
  const ed = new AMark_Editor({event: ev, type, onReleaseMethod: AMark.createNew.bind(AMark, ev)})
  ed.proceed()
  const field = ed.editorOfAMarkContent.textField.value
  ed.editorOfAMarkContent.textField.value = typed
  ed.editorOfAMarkContent.onClickOK()
  return {field, mark: found()}
}
// Réédition (double-clic) : valeur du champ, puis validation (+typed+ ou inchangée)
const reedit = (mark, typed) => {
  mark.edit()
  const field = mark.editor.textField.value
  if ( undefined !== typed ) mark.editor.textField.value = typed
  mark.editor.onClickOK()
  return field
}
const fontOf = m => getComputedStyle(m.obj.querySelector('span.content')).fontFamily

for ( const input of ['bat', 'it'] ) for ( const display of ['bat', 'it'] ) {
  const tag = `entrée ${input}, affichage ${display}`

  T.test(`${tag} : préférences, police, champ par défaut`, async () => {
    setPref('notation_input', input) ; setPref('notation_display', display)
    T.eq(Preferences.get('notation_input'), input, 'préférence entrée')
    T.eq(Preferences.get('notation_display'), display, 'préférence affichage')
    const r = create('acc', 'Fam75-')
    T.eq(r.field, input == 'it' ? 'Do' : 'C', 'valeur par défaut (C) dans le champ')
    T.eq(r.mark.content, 'Fm75-', 'Fam75- enregistré')
    T.eq(fontOf(r.mark), display == 'it' ? 'PhilNoteIt' : 'PhilNote', 'police de la marque')
    T.eq(reedit(r.mark), input == 'it' ? 'Fam75-' : 'Fm75-', 'champ de la réédition')
    T.eq(r.mark.content, 'Fm75-', 'réédition sans changement')
    T.includes(PreferencesPanel.buildSelectorsInHead(), `--philnote-font: ${display == 'it' ? 'PhilNoteIt' : 'PhilNote'};`, 'styles (application et exports)')
    AObjet.remove(r.mark)
  })

  T.test(`${tag} : saisies converties, aller-retour par la réédition`, async () => {
    setPref('notation_input', input) ; setPref('notation_display', display)
    const cases = [['acc','solm7M','Gm7M'], ['acc','sol/mi','G/e'], ['acc','Sol/Mi','G/E'], ['acc','Gm7M','Gm7M'], ['acc','G/e','G/e'],
                   ['acc','Do/', input == 'it' ? 'C/' : 'Do/'], ['acc','C7','C7'], ['acc','D7-','D7-'], ['acc','ré7 --','D7 '],
                   ['mod','la','A'], ['emp','Mim','Em'], ['acc','Sol mineur','G mineur'], ['har','Si','Si'], ['har','V7','V7']]
    for ( const [type, typed, exp] of cases ) {
      const m = create(type, typed).mark
      T.eq(m.content, exp, `${type} « ${typed} »`)
      reedit(m)
      T.eq(m.content, exp, `${type} « ${typed} » après réédition`)
      AObjet.remove(m)
    }
  })

  T.test(`${tag} : valeur déjà utilisée choisie (suggestion) conservée`, async () => {
    setPref('notation_input', input) ; setPref('notation_display', display)
    const s = create('acc', 'x').mark
    s.content = 'Do7' // ré diminué en batave
    const found = newIds()
    const ed = new AMark_Editor({event: ev, type: 'acc', onReleaseMethod: AMark.createNew.bind(AMark, ev)})
    ed.proceed()
    const e = ed.editorOfAMarkContent
    const idx = e.suggestValues.indexOf('Do7')
    T.ok(idx >= 0, 'suggestion présente')
    e.chooseSuggestion(idx)
    const sm = found()
    T.eq(sm && sm.content, 'Do7', 'valeur enregistrée')
    sm && AObjet.remove(sm) ; AObjet.remove(s)
  })
}

T.test('texte : notes italiennes (forme exacte, pas La/Si en début de phrase)', async () => {
  setPref('notation_display', 'it')
  const found = newIds()
  AMark.createNew(ev, {type: 'txt', subtype: 'size3', content: 'x', top: 600, left: 600})
  const m = found()
  m.content = 'La phrase. Si on passe en Sol majeur, puis fa et sol.'
  const html = m.obj.querySelector('span.content').innerHTML
  T.includes(html, '<mus>G</mus>', 'Sol détecté')
  T.no(/<mus>[^G]/.test(html), 'sol, fa, La et Si en début de phrase ignorés')
  AObjet.remove(m)
})

T.test('exports en notation italienne (SVG, PDF)', async () => {
  setPref('notation_display', 'it')
  const acc = create('acc', 'Sol7').mark
  const stage = new Stage()
  await stage.build()
  const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
  stage.respace(opts) ; stage.addLegend()
  const svg = (await stage.svgPages(stage.layout(opts))).join('\n')
  T.includes(svg, 'font-family: PhilNoteIt', 'police italienne incluse dans le SVG')
  const pdf = await stage.pdfData(stage.layout(opts))
  T.includes(pdf.code_html, '--philnote-font: PhilNoteIt', 'variable de police dans le PDF')
  stage.remove()
  AObjet.remove(acc)
  setPref('notation_display', 'bat')
})

T.test('affichage en américain (#234, #242) : police américaine, contenu batave inchangé, exports', async () => {
  setPref('notation_input', 'bat') ; setPref('notation_display', 'us')
  T.eq(Preferences.get('notation_display'), 'us', 'préférence')
  const options = [...document.querySelector('#pref-notation_display').options].map(o => o.value)
  T.eq(options, ['bat', 'it', 'us'], 'trois écritures proposées')
  const labelUs = document.querySelector('#pref-notation_display option[value="us"]').textContent
  T.eq(labelUs, 'américain', 'libellé « américain » et rien d’autre')
  const r = create('acc', 'G7M')
  T.eq(r.mark.content, 'G7M', 'contenu enregistré en batave')
  T.eq(fontOf(r.mark), 'PhilNoteUs', 'police américaine')
  T.includes(PreferencesPanel.buildSelectorsInHead(), '--philnote-font: PhilNoteUs;', 'styles (application et exports)')
  await document.fonts.load('26pt PhilNoteUs', 'G7')
  T.ok(document.fonts.check('26pt PhilNoteUs', 'G7'), 'police chargée')
  const stage = new Stage()
  await stage.build()
  const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
  stage.respace(opts)
  const svg = (await stage.svgPages(stage.layout(opts))).join('\n')
  stage.remove()
  T.includes(svg, 'font-family: PhilNoteUs', 'police américaine incluse dans le SVG')
  AObjet.remove(r.mark)
  setPref('notation_display', 'bat')
})
