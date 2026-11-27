// Thèmes de la sortie de l'analyse (#255) : nomenclature dans le style
// du thème choisi dans le panneau d'export (« Classique » par défaut),
// dans les exports SVG et PDF
const { AMark } = await T.imp('AMark')
const { AObjet } = await T.imp('AObjet')
const { Preferences } = await T.imp('Preferences')
const { Stage, Exporter } = await T.imp('Exporter')
const { EXPORT_THEMES, DEFAULT_EXPORT_THEME, exportTheme } = await T.imp('export_themes/index')

const BASE = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
const ev = {pageX: 600, pageY: 600, clientX: 600, clientY: 600}
const notes = ['np', 'pc', 'ap'].map((st, i) => {
  const before = new Set(AObjet.items.map(m => m.id))
  AMark.createNew(ev, {type: 'not', subtype: st, content: st.toUpperCase(), top: 1500 + i * 60, left: 700})
  return AObjet.items.find(m => !before.has(m.id))
})
const legendOf = async (theme) => {
  const stage = new Stage()
  await stage.build() ; stage.respace(BASE) ; stage.addLegend(theme)
  return stage
}

T.test('six thèmes, « Classique » par défaut', async () => {
  T.eq(EXPORT_THEMES.map(th => th.id), ['sans-style', 'sobre', 'filets', 'cadre', 'classique', 'tableau'], 'thèmes (fichiers)')
  T.eq(DEFAULT_EXPORT_THEME, 'classique', 'thème par défaut')
  T.eq(Preferences.get('export_theme'), 'classique', 'préférence par défaut')
  T.eq(exportTheme('inconnu').id, 'classique', 'thème inconnu : Classique')
  // Aucune couleur dans les thèmes : seulement noir, gris, blanc
  for ( const th of EXPORT_THEMES ) {
    const values = JSON.stringify(th.styles)
    const colors = values.match(/#[0-9a-f]{3,6}\b/gi) || []
    T.ok(colors.every(c => { const h = c.length == 4 ? c.slice(1).split('').map(x => x + x) : [c.slice(1, 3), c.slice(3, 5), c.slice(5, 7)] ; return new Set(h.map(x => x.toLowerCase())).size == 1 }), `${th.id} : sans couleur`)
  }
})

T.test('panneau d’export : menu « Thème », mémorisé', async () => {
  Exporter.ask()
  const sel = document.querySelector('#export_panel #export_theme')
  T.ok(sel, 'menu présent')
  T.eq(Array.from(sel.options).map(o => o.textContent), ['Sans style', 'Sobre', 'Filets', 'Cadres', 'Classique', 'Tableau'], 'noms des thèmes')
  T.eq(sel.value, 'classique', 'Classique choisi par défaut')
  document.querySelector('#export_panel button.btn-close').click()
})

T.test('nomenclature dans le style de chaque thème', async () => {
  for ( const th of EXPORT_THEMES ) {
    const stage = await legendOf(th.id)
    const lg = stage.legendEl
    T.ok(lg && lg.classList.contains(`theme-${th.id}`), `${th.id} : nomenclature`)
    T.eq(lg.querySelector('.sa-legend-title').textContent, 'Signes utilisés', `${th.id} : titre`)
    T.eq(Array.from(lg.querySelectorAll('.sa-legend-desc')).map(e => e.textContent), ['Note de passage', 'Passage chromatique', 'Appoggiature'].map((n, i) => i == 1 ? 'Note de passage chromatique' : n), `${th.id} : descriptions`)
    T.eq(lg.querySelectorAll('.sa-legend-sign div.amark.not').length, 3, `${th.id} : signes`)
    stage.remove()
  }
  // Tableau : entête « Marque » | « Description », titre en petites capitales
  const stage = await legendOf('tableau')
  const lg = stage.legendEl
  T.eq(Array.from(lg.querySelectorAll('th')).map(e => e.textContent), ['Marque', 'Description'], 'tableau : entête')
  T.eq(lg.querySelector('.sa-legend-title').style.fontVariant, 'small-caps', 'tableau : petites capitales')
  T.eq(lg.querySelector('.sa-legend-title').style.textAlign, 'left', 'tableau : titre fer à gauche')
  T.no(lg.outerHTML.includes('border-radius'), 'tableau : pas de bords arrondis')
  stage.remove()
  // Par défaut : Classique
  const st2 = await legendOf()
  T.ok(st2.legendEl.classList.contains('theme-classique'), 'sans thème précisé : Classique')
  st2.remove()
})

T.test('exports SVG et PDF : nomenclature du thème', async () => {
  const stage = await legendOf('tableau')
  const svg = (await stage.svgPages(stage.layout(BASE))).join('\n')
  T.includes(svg, '>Marque</text>', 'SVG : entête du tableau')
  T.includes(svg, '>Description</text>', 'SVG : entête du tableau (2)')
  T.includes(svg, 'font-variant="small-caps"', 'SVG : titre en petites capitales')
  stage.remove()
  const st2 = await legendOf('sobre')
  const pdf = await st2.pdfData(st2.layout(BASE))
  T.includes(pdf.code_html, 'theme-sobre', 'PDF : thème')
  st2.remove()
  notes.forEach(m => AObjet.remove(m))
})
