// « Aspect » (marques à trait et texte) : bord et taille du texte ;
// accords, harmonies, modulations non concernés (#287)
const { AObjet } = await T.imp('AObjet')
const { BorderEditor } = await T.imp('BorderEditor')
const { AnalyseSaver } = await T.imp('AnalyseSaver')
const { Stage } = await T.imp('Exporter')
const { t } = await T.imp('i18n')

const labels = m => m.contextMenuItems.map(i => i.label).filter(Boolean)
const fontPx = m => Math.round(parseFloat(getComputedStyle(m.contentSpan).fontSize))
const textRow = () => [...document.querySelectorAll('#border_editor .rows > *')].find(r => r.textContent.includes('Texte'))

T.test('menu : « Aspect » pour trait + texte, « Bord/trait… » sinon (#287)', async () => {
  const mot = await T.mark({type: 'mot', content: 'Thème', top: 1200, left: 300})
  const seg = await T.mark({type: 'seg', subtype: 'h-up', content: 'a', top: 1400, left: 300})
  const acc = await T.mark({type: 'acc', content: 'C', top: 1600, left: 300})
  try {
    T.ok(labels(mot).includes('Aspect…') && !labels(mot).includes('Bord/trait…'), 'motif : « Aspect… »')
    T.ok(labels(seg).includes('Aspect…'), 'segment : Aspect')
    T.no(labels(acc).includes('Aspect…'), 'accord : pas d’Aspect')
  } finally { [mot, seg, acc].forEach(m => AObjet.remove(m)) }
})

T.test('Aspect : curseur « Texte », taille réglée, gardée par OK, enregistrée, exportée (#287)', async () => {
  const mot = await T.mark({type: 'mot', content: 'ThèmeAspect', top: 400, left: 300})
  try {
    AObjet.deselectAll()
    const before = fontPx(mot)
    BorderEditor.open([mot])
    const panel = document.querySelector('#border_editor')
    T.ok(panel, 'panneau ouvert')
    const row = textRow()
    T.ok(row, 'réglage « Texte »')
    const range = row.querySelector('input[type="range"]'), field = row.querySelector('input.range-value')
    T.eq(Number(field.value), before, 'valeur de départ : taille actuelle')
    range.value = String(before + 20) ; range.dispatchEvent(new Event('input'))
    T.eq(fontPx(mot), before + 20, 'aperçu immédiat')
    // Renoncer : taille reprise
    BorderEditor.close()
    T.eq(fontPx(mot), before, 'Renoncer : taille reprise')
    BorderEditor.open([mot])
    const f2 = textRow().querySelector('input.range-value')
    f2.value = '40' ; f2.dispatchEvent(new Event('input'))
    document.querySelector('#border_editor .btn-default').click()
    T.eq(fontPx(mot), 40, 'OK : taille gardée')
    T.eq(mot.data.text_size, 40, 'dans les données')
    await AnalyseSaver.save()
    T.includes(await T.readFile('analyse_tags.yaml'), 'text_size: 40', 'enregistrée')
    const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
    const stage = new Stage()
    await stage.build() ; stage.respace(opts)
    const svg = (await stage.svgPages(stage.layout(opts))).join('')
    stage.remove()
    const m = svg.match(/<text[^>]*font-size="([\d.]+)"[^>]*>(?:<[^>]+>)*ThèmeAspect/)
    T.ok(m && Math.abs(Number(m[1]) - 40) < 0.5, `taille dans l’export SVG (${m && m[1]})`)
  } finally { BorderEditor.close() ; AObjet.remove(mot) }
})

// Motif : alignement du nom dans « Aspect »
T.test('Aspect d’un motif : « Alignement » (à gauche, au centre, à droite)', async () => {
  const mot = await T.mark({type: 'mot', content: 'AlignAspect', top: 400, left: 300})
  const seg = await T.mark({type: 'seg', subtype: 'h-up', content: 'a', top: 1400, left: 300})
  const alignRow = () => [...document.querySelectorAll('#border_editor .rows > *')].find(r => r.textContent.startsWith('Alignement'))
  const offRight = () => Math.round(mot.obj.getBoundingClientRect().right - mot.contentSpan.getBoundingClientRect().right)
  try {
    AObjet.deselectAll()
    mot.obj.style.width = '500px'
    BorderEditor.open([seg])
    T.no(alignRow(), 'segment : pas d’alignement')
    BorderEditor.close()
    BorderEditor.open([mot])
    const radios = () => [...alignRow().querySelectorAll('label.align-choice')]
    T.ok(alignRow(), 'motif : réglage « Alignement »')
    T.eq(radios().map(l => l.textContent.trim()), ['gauche', 'centre', 'droite'], 'boutons radio : gauche, centre, droite (#299)')
    T.ok(radios().every(l => l.querySelector('input[type="radio"]') && l.querySelector('svg.align-picto')), 'chacun avec son picto (#299)')
    const pick = v => { const i = alignRow().querySelector(`input[value="${v}"]`) ; i.click() }
    T.eq(alignRow().querySelector('input:checked').value, 'center', 'au centre par défaut')
    pick('right')
    T.ok(Math.abs(offRight()) <= 1, 'aperçu : à droite')
    BorderEditor.close()
    T.ok(Math.abs(offRight()) > 10, 'Renoncer : de nouveau au centre')
    BorderEditor.open([mot])
    pick('right')
    document.querySelector('#border_editor .btn-default').click()
    T.ok(Math.abs(offRight()) <= 1, 'OK : à droite')
    T.eq(mot.data.align, 'right', 'enregistré dans les données')
  } finally { BorderEditor.close() ; AObjet.remove(mot) ; AObjet.remove(seg) }
})

// Motif : position du nom (au-dessus, au-dessous) dans « Aspect » (#304)
T.test('Aspect d’un motif : « Position » au-dessus / au-dessous (#304)', async () => {
  const mot = await T.mark({type: 'mot', content: 'PosNom', top: 400, left: 300})
  const posRow = () => [...document.querySelectorAll('#border_editor .rows > *')].find(r => r.textContent.startsWith('Position'))
  const below = () => mot.contentSpan.getBoundingClientRect().top >= mot.obj.getBoundingClientRect().bottom - 2
  const above = () => mot.contentSpan.getBoundingClientRect().bottom <= mot.obj.getBoundingClientRect().top + 2
  try {
    AObjet.deselectAll()
    T.ok(above(), 'au-dessus par défaut')
    BorderEditor.open([mot])
    const rows = [...document.querySelectorAll('#border_editor .rows > *')].map(r => r.querySelector('label').textContent)
    T.eq(rows.indexOf('Position'), rows.indexOf('Alignement') + 1, 'sous « Alignement »')
    const labels = [...posRow().querySelectorAll('label.align-choice')]
    T.eq(labels.map(l => l.textContent.trim()), ['au-dessus', 'au-dessous'], 'au-dessus, au-dessous')
    T.ok(labels.every(l => l.querySelector('input[type="radio"]') && l.querySelector('svg.align-picto')), 'radios à picto')
    posRow().querySelector('input[value="below"]').click()
    T.ok(below(), 'aperçu : au-dessous')
    BorderEditor.close()
    T.ok(above(), 'Renoncer : au-dessus')
    BorderEditor.open([mot])
    posRow().querySelector('input[value="below"]').click()
    document.querySelector('#border_editor .btn-default').click()
    T.ok(below(), 'OK : au-dessous')
    T.eq(mot.data.name_pos, 'below', 'enregistré')
    // Reconstruction (réouverture) et export
    mot.rebuild()
    T.ok(below(), 'reconstruite : au-dessous')
    const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
    const stage = new Stage()
    await stage.build() ; stage.respace(opts)
    const clone = [...document.querySelectorAll('div.amark.mot')].find(e => e !== mot.obj && e.textContent.includes('PosNom'))
    T.ok(clone && clone.querySelector('span.content').getBoundingClientRect().top >= clone.getBoundingClientRect().bottom - 2, 'export : au-dessous')
    stage.remove()
  } finally { BorderEditor.close() ; AObjet.remove(mot) }
})
