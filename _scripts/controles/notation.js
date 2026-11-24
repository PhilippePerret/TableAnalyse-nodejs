/*
 * Contrôle de la notation des accords batave / italienne (préférences
 * notation_display et notation_input, cf. Notation.js), sur une COPIE
 * d’analyse (des marques y sont créées) :
 *
 *   SA_SMOKE=16 SA_SMOKE_JS=_scripts/controles/notation.js npx electron . <copie analyse>
 *
 * Résultat dans le Terminal : « RES ok N ko 0 »
 */
(async () => {
  const { AMark } = await import('./js/AMark.js')
  const { AMark_Editor } = await import('./js/AMark_Editor.js')
  const { AObjet } = await import('./js/AObjet.js')
  const { Preferences } = await import('./js/Preferences.js')
  const { PreferencesPanel } = await import('./js/PreferencesPanel.js')
  const { Stage } = await import('./js/Exporter.js')
  setTimeout(async () => { try {
    let ok = 0; const ko = []
    const eq = (label, got, exp) => { if ( got === exp ) ok++ ; else ko.push(`${label}: obtenu ${JSON.stringify(got)} attendu ${JSON.stringify(exp)}`) }
    const setPref = (key, v) => { const el = document.querySelector(`#pref-${key}`); el.value = v; el.dispatchEvent(new Event('change')) }
    const ev = {pageX: 600, pageY: 600, clientX: 600, clientY: 600}
    const visibleEditor = () => [...document.querySelectorAll('div.mini_editeur')].find(e => e.offsetParent !== null || getComputedStyle(e).display != 'none')
    // Création d'une marque +type+ : valeur initiale du champ, puis saisie +typed+
    const create = (type, typed) => {
      const before = new Set(AObjet.items.map(m => m.id))
      const ed = new AMark_Editor({event: ev, type, onReleaseMethod: AMark.createNew.bind(AMark, ev)})
      ed.proceed()
      const field = ed.editorOfAMarkContent.textField.value
      ed.editorOfAMarkContent.textField.value = typed
      ed.editorOfAMarkContent.onClickOK()
      const mark = AObjet.items.find(m => !before.has(m.id))
      return {field, mark}
    }
    const reedit = (mark, typed) => {
      mark.edit()
      const field = mark.editor.textField.value
      if ( undefined !== typed ) mark.editor.textField.value = typed
      mark.editor.onClickOK()
      return field
    }
    const fontOf = m => getComputedStyle(m.obj.querySelector('span.content')).fontFamily

    for (const display of ['bat', 'it']) for (const input of ['bat', 'it']) {
      setPref('notation_display', display) ; setPref('notation_input', input)
      const tag = `[aff ${display} / ent ${input}]`
      eq(`${tag} pref affichage`, Preferences.get('notation_display'), display)
      eq(`${tag} pref entrée`, Preferences.get('notation_input'), input)
      // Valeur par défaut (C) dans le champ
      let r = create('acc', 'Fam75-')
      eq(`${tag} champ défaut accord`, r.field, input == 'it' ? 'Do' : 'C')
      eq(`${tag} Fam75- enregistré`, r.mark.content, 'Fm75-')
      eq(`${tag} police`, fontOf(r.mark), display == 'it' ? 'PhilNoteIt' : 'PhilNote')
      // Réédition : champ, puis validation sans changement
      eq(`${tag} réédition champ Fm75-`, reedit(r.mark), input == 'it' ? 'Fam75-' : 'Fm75-')
      eq(`${tag} réédition inchangée`, r.mark.content, 'Fm75-')
      // Divers
      const cases = [['acc','solm7M','Gm7M'], ['acc','sol/mi','G/e'], ['acc','Sol/Mi','G/E'], ['acc','Gm7M','Gm7M'], ['acc','G/e','G/e'],
                     ['acc','Do/', input == 'it' ? 'C/' : 'Do/'], ['acc','C7','C7'], ['acc','D7-','D7-'], ['acc','ré7 --','D7 '], ['mod','la','A'], ['emp','Mim','Em'],
                     ['acc','Sol mineur','G mineur'], ['har','Si','Si'], ['txt','sol','sol']]
      for (const [type, typed, exp] of cases) {
        const m = (type == 'txt') ? null : create(type, typed).mark
        if ( !m ) continue
        eq(`${tag} ${type} « ${typed} »`, m.content, exp)
        // Aller-retour par la réédition
        reedit(m)
        eq(`${tag} ${type} « ${typed} » après réédition`, m.content, exp)
        m.destroy()
      }
      // Suggestion choisie : valeur enregistrée exacte (Do7 = ré diminué en batave)
      const s = create('acc', 'Do7').mark
      s.data.content = s._content = 'Do7' // valeur batave existante
      const ed2 = new AMark_Editor({event: ev, type: 'acc', onReleaseMethod: AMark.createNew.bind(AMark, ev)})
      const before = new Set(AObjet.items.map(m => m.id))
      ed2.proceed()
      const e2 = ed2.editorOfAMarkContent
      const idx = e2.suggestValues.indexOf('Do7')
      eq(`${tag} suggestion présente`, idx >= 0, true)
      e2.chooseSuggestion(idx)
      const sm = AObjet.items.find(m => !before.has(m.id))
      eq(`${tag} suggestion Do7 conservée`, sm && sm.content, 'Do7')
      sm && sm.destroy() ; s.destroy() ; r.mark.destroy()
      // Styles (application et exports)
      eq(`${tag} styles`, PreferencesPanel.buildSelectorsInHead().includes(`--philnote-font: ${display == 'it' ? 'PhilNoteIt' : 'PhilNote'};`), true)
    }
    // Texte : notes italiennes exactes
    setPref('notation_display', 'it')
    const tb = new Set(AObjet.items.map(m => m.id))
    AMark.createNew(ev, {type: 'txt', subtype: 'size3', content: 'x', top: 600, left: 600})
    const ta = {mark: AObjet.items.find(m => !tb.has(m.id))}
    if ( ta.mark ) {
      ta.mark.content = 'La phrase. Si on passe en Sol majeur, puis fa et sol.'
      const html = ta.mark.obj.querySelector('span.content').innerHTML
      eq('texte Sol détecté', html.includes('<mus>G</mus>'), true)
      eq('texte sol/fa et La/Si en début de phrase ignorés', /<mus>[^G]/.test(html), false)
      ta.mark.destroy()
    } else ko.push('texte : marque non créée (sous-type ?)')
    // Exports en italien : SVG avec la police italienne
    const acc = create('acc', 'Sol7').mark
    const stage = new Stage()
    await stage.build()
    const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
    stage.respace(opts) ; stage.addLegend()
    const layout = stage.layout(opts)
    const svg = (await stage.svgPages(layout)).join('\n')
    eq('svg police italienne incluse', svg.includes('font-family: PhilNoteIt'), true)
    const pdf = await stage.pdfData(stage.layout(opts))
    eq('pdf variable italienne', pdf.code_html.includes('--philnote-font: PhilNoteIt'), true)
    stage.remove()
    acc.destroy()
    console.log('RES ok', ok, 'ko', ko.length, '\n' + ko.join('\n'))
  } catch(e){ console.log('ERR', e.stack) } }, 2500)
})()
