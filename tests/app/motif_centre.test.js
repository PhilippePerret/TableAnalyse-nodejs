// Motif : nom toujours au centre du cadre, à l'écran et dans l'export
// (#290)
const { AObjet } = await T.imp('AObjet')
const { Stage } = await T.imp('Exporter')

T.test('nom du motif centré (écran, export SVG) (#290)', async () => {
  const m = await T.mark({type: 'mot', content: 'MotifCentre', top: 400, left: 300})
  try {
    for ( const w of [120, 220, 500] ) {
      m.obj.style.width = `${w}px`
      const r = m.obj.getBoundingClientRect(), c = m.contentSpan.getBoundingClientRect()
      T.ok(Math.abs((c.left + c.right) / 2 - (r.left + r.right) / 2) <= 1, `largeur ${w} : centré (écart ${Math.round((c.left + c.right) / 2 - (r.left + r.right) / 2)})`)
    }
    m.obj.style.width = '400px'
    AObjet.deselectAll()
    const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
    const stage = new Stage()
    await stage.build() ; stage.respace(opts)
    const clone = [...document.querySelectorAll('div.amark.mot')].find(e => e !== m.obj && e.textContent.includes('MotifCentre'))
    if ( clone ) {
      const r = clone.getBoundingClientRect(), c = clone.querySelector('span.content').getBoundingClientRect()
      T.ok(Math.abs((c.left + c.right) / 2 - (r.left + r.right) / 2) <= 1, 'export : centré')
    }
    const svg = (await stage.svgPages(stage.layout(opts))).join('')
    stage.remove()
    T.includes(svg, 'MotifCentre', 'nom dans l’export')
  } finally { AObjet.remove(m) }
})
