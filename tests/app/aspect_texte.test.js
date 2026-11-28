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
    T.ok(labels(mot).includes('Aspect') && !labels(mot).includes('Bord/trait…'), 'motif : Aspect')
    T.ok(labels(seg).includes('Aspect'), 'segment : Aspect')
    T.no(labels(acc).includes('Aspect'), 'accord : pas d’Aspect')
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
