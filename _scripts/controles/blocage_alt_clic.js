/*
 * Contrôle de #233 : type de marque bloqué, le clic (ou double-clic
 * suivant la préférence) sur la table crée une marque du type bloqué ;
 * avec Alt, le type est à choisir.
 *
 *   SA_SMOKE=10 SA_SMOKE_JS=_scripts/controles/blocage_alt_clic.js npx electron . <copie analyse>
 *
 * Résultat dans le Terminal : « RES ok N ko 0 »
 */
(async () => {
  const { AMark_Editor } = await import('./js/AMark_Editor.js')
  const { Preferences } = await import('./js/Preferences.js')
  setTimeout(() => { try {
    let ok = 0; const ko = []
    const eq = (label, got, exp) => { if ( got === exp ) ok++ ; else ko.push(`${label}: obtenu ${JSON.stringify(got)} attendu ${JSON.stringify(exp)}`) }
    // Étape atteinte par l'éditeur de création : 'type' (choix du type) ou 'content'
    let step = null
    const P = AMark_Editor.prototype
    const origType = P.getAMarkType, origContent = P.getAMarkContent
    P.getAMarkType    = function(){ step = 'type' }
    P.getAMarkContent = function(){ step = 'content:' + this.amark_type }
    const target = document.body
    const fire = (kind, alt, detail) => {
      step = null
      const opts = {bubbles: true, button: 0, altKey: alt, clientX: 500, clientY: 500, detail}
      target.dispatchEvent(new MouseEvent('mousedown', opts))
      target.dispatchEvent(new MouseEvent('mouseup', opts))
      target.dispatchEvent(new MouseEvent(kind, opts))
      return step
    }
    for (const mode of ['simple', 'double']) {
      Preferences.saveData('mark_creation_click', mode)
      const kind = mode == 'simple' ? 'click' : 'dblclick'
      const detail = mode == 'simple' ? 1 : 2
      AMark_Editor.lockedType = 'acc'
      eq(`${mode} bloqué sans Alt`, fire(kind, false, detail), 'content:acc')
      eq(`${mode} bloqué avec Alt`, fire(kind, true, detail), 'type')
      AMark_Editor.lockedType = null
      eq(`${mode} non bloqué sans Alt`, fire(kind, false, detail), 'type')
      eq(`${mode} non bloqué avec Alt`, fire(kind, true, detail), 'type')
    }
    P.getAMarkType = origType ; P.getAMarkContent = origContent
    console.log('RES ok', ok, 'ko', ko.length, '\n' + ko.join('\n'))
  } catch(e){ console.log('ERR', e.stack) } }, 2500)
})()
