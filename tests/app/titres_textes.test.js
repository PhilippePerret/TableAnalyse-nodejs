// Préférences des titres en tableau (section « Mise en page ») et titres
// dans les textes (« = », « == », « === »)
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { Preferences } = await T.imp('Preferences')
const { AObjet } = await T.imp('AObjet')
const { Stage } = await T.imp('Exporter')

T.test('préférences des titres : tableau, libellés une seule fois', async () => {
  const table = document.querySelector('#preferences-panel table#prefs-layout-table')
  T.ok(table, 'tableau présent')
  const heads = [...table.querySelectorAll('th')].map(th => th.textContent)
  T.eq(heads, ['Titre', 'Police', 'Taille', 'Espace avant et après (export)'], 'libellés des colonnes')
  const rows = [...table.querySelectorAll('tr')].slice(1)
  T.eq(rows.map(r => r.querySelector('td').textContent), ['Niveau 1', 'Niveau 2', 'Niveau 3'], 'niveaux')
  for ( const [i, r] of rows.entries() ) {
    const n = i + 1
    T.ok(r.querySelector(`td:nth-child(2) #pref-layout_title_${n}_font`), `police ${n}`)
    T.ok(r.querySelector(`td:nth-child(3) #pref-layout_title_${n}_size`), `taille ${n}`)
    T.ok(r.querySelector(`td:nth-child(4) #pref-layout_title_${n}_before`) && r.querySelector(`td:nth-child(4) #pref-layout_title_${n}_after`), `espaces ${n}`)
  }
  T.no(document.querySelector('#preferences-panel').textContent.includes('Police des titres de niveau'), 'plus de libellés répétés')
  // Réglage toujours effectif (taille appliquée à chaque frappe, enregistrée)
  const size = document.querySelector('#pref-layout_title_2_size')
  size.value = '50' ; size.dispatchEvent(new Event('input'))
  T.eq(String(Preferences.get('layout_title_2_size')), '50', 'taille enregistrée')
  T.includes(PreferencesPanel.buildSelectorsInHead(), 'span.txt-title.t2 {font-size:50px;}', 'style appliqué')
})

T.test('titres dans un texte : « = », « == », « === »', async () => {
  const m = await T.mark({type: 'txt', content: '= Grand titre__RET__Texte *courant*__RET__== Moyen__RET__=== Petit__RET__a == b', top: 1200, left: 300})
  const span = m.obj.querySelector('span.content')
  const titles = [...span.querySelectorAll('span.txt-title')]
  T.eq(titles.map(e => [e.className, e.textContent]), [['txt-title t1', 'Grand titre'], ['txt-title t2', 'Moyen'], ['txt-title t3', 'Petit']], 'trois titres')
  T.includes(span.innerHTML, '<i>courant</i>', 'mise en forme conservée')
  T.includes(span.textContent, 'a == b', '« == » au milieu d’une ligne : texte')
  T.eq(getComputedStyle(titles[0]).fontSize, `${Preferences.get('layout_title_1_size')}px`, 'taille du titre de niveau 1')
  T.ok(getComputedStyle(titles[0]).fontFamily.includes(Preferences.get('layout_title_1_font')), 'police du titre de niveau 1')
  T.eq(span.querySelectorAll('span.txt-title + br').length, 0, 'aucune ligne vide après un titre')
  // Export
  const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
  const stage = new Stage()
  await stage.build() ; stage.respace(opts)
  const svg = (await stage.svgPages(stage.layout(opts))).join('\n')
  const pdf = await stage.pdfData(stage.layout(opts))
  stage.remove()
  T.includes(svg, 'Grand titre', 'titre dans le SVG')
  T.includes(pdf.code_html, 'txt-title t1', 'titre dans le PDF')
  AObjet.remove(m)
})
