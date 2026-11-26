// Panneau des préférences : section « Traits » en tableau, libellés sans
// « : », clic sur un libellé → champ correspondant
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { Preferences } = await T.imp('Preferences')

const panel = () => document.querySelector('#preferences-panel')
const KEYS = ['border_circle', 'border_box', 'thiness_cellule_line', 'thiness_border', 'thiness_motif_line', 'thiness_segment_line', 'border_emprunt', 'border_cadence', 'border_note', 'border_form', 'border_measure']
const NAMES = ['Cercle', 'Cadre simple', 'Cellule musicale', 'Cadre texte', 'Cadre motif', 'Trait segment', 'Trait emprunts', 'Trait cadence', 'Contour type de note', 'Portion (version cadre)', 'Cadre numéro mesure']

T.test('section « Traits » : tableau Bord | Épaisseur | Intensité, noms exacts', async () => {
  const table = panel().querySelector('table#prefs-lines-table')
  T.ok(table, 'tableau présent')
  T.eq([...table.querySelectorAll('th')].map(e => e.textContent).filter(Boolean), ['Bord', 'Épaisseur', 'Intensité'], 'libellés des colonnes')
  const rows = [...table.querySelectorAll('tr')].slice(1)
  T.eq(rows.map(r => r.querySelector('td.row-label').textContent), NAMES, 'noms des bords')
  rows.forEach((r, i) => {
    const ids = [...r.querySelectorAll('input')].map(e => e.id)
    T.eq(ids.length, 2, `deux champs ${NAMES[i]}`)
    T.eq(ids[0], `pref-${KEYS[i]}`, `épaisseur ${NAMES[i]}`)
    T.ok(/^pref-intensity_/.test(ids[1]), `intensité ${NAMES[i]}`)
  })
})

T.test('tableaux : libellés à gauche, champs à droite, libellés des colonnes au-dessus des champs', async () => {
  PreferencesPanel.toggle() ; await T.wait(150)
  for ( const id of ['prefs-lines-table', 'prefs-layout-table'] ) {
    const table = panel().querySelector(`#${id}`)
    const tR = table.getBoundingClientRect()
    const tr = table.querySelectorAll('tr')[1]
    const range = document.createRange() ; range.selectNodeContents(tr.querySelector('td.row-label'))
    const label = range.getBoundingClientRect()
    const inputs = [...tr.querySelectorAll('input')].map(i => i.getBoundingClientRect())
    const lastCell = tr.lastElementChild.getBoundingClientRect()
    T.ok(Math.abs(label.left - tR.left) < 2, `${id} : libellé à gauche`)
    T.ok(tR.right - lastCell.right < 2, `${id} : valeurs à droite`)
    T.ok(Math.min(...inputs.map(f => f.left)) - label.right >= 24, `${id} : espace entre libellé et champs`)
    // Chaque libellé de colonne centré au-dessus de son (ou ses) champ(s)
    const heads = [...table.querySelectorAll('th.col-head')]
    const cols = heads.length
    for ( const tr of [...table.querySelectorAll('tr')].slice(1) ) {
      const ins = [...tr.querySelectorAll('input')].map(i => i.getBoundingClientRect())
      // Regroupement des champs par colonne : 1 champ par colonne, sauf la
      // dernière de « Mise en page » (2 : avant et après)
      const groups = ins.length == cols ? ins.map(r => [r]) : [...ins.slice(0, cols - 1).map(r => [r]), ins.slice(cols - 1)]
      heads.forEach((th, i) => {
        const h = th.getBoundingClientRect(), g = groups[i]
        const center = (Math.min(...g.map(r => r.left)) + Math.max(...g.map(r => r.right))) / 2
        T.ok(Math.abs((h.left + h.right) / 2 - center) < 4, `${id} : « ${th.textContent} » au-dessus de son champ (écart ${Math.round((h.left + h.right) / 2 - center)} px)`)
      })
    }
  }
  PreferencesPanel.toggle()
})

T.test('aucun « : » à la fin des libellés', async () => {
  PreferencesPanel.toggle() ; await T.wait(100)
  const labels = [...panel().querySelectorAll('label, td.row-label, th')]
  const withColon = labels.filter(l => /:\s*$/.test(l.textContent) || /:/.test(getComputedStyle(l, '::after').content))
  T.eq(withColon.map(l => l.textContent), [], 'aucun libellé terminé par « : »')
  PreferencesPanel.toggle()
})

T.test('clic sur un libellé : champ correspondant activé', async () => {
  PreferencesPanel.toggle() ; await T.wait(100)
  const check = (label, id, what) => { label.click() ; T.eq(document.activeElement && document.activeElement.id, id, what) }
  check(document.querySelector('#pref-systeme_width').closest('.div-data').querySelector('label'), 'pref-systeme_width', 'champ texte')
  check(document.querySelector('#pref-theme').closest('.div-data').querySelector('label'), 'pref-theme', 'menu')
  const rowLines = panel().querySelector('#prefs-lines-table tr:nth-child(3) td.row-label')
  check(rowLines, 'pref-border_box', 'ligne de « Traits »')
  const rowLayout = panel().querySelector('#prefs-layout-table tr:nth-child(2) td.row-label')
  check(rowLayout, 'pref-layout_title_1_font', 'ligne de « Mise en page »')
  PreferencesPanel.toggle()
})
