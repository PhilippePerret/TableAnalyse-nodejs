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
  T.eq([...table.querySelectorAll('th')].map(e => e.textContent), ['Bord', 'Épaisseur', 'Intensité'], 'libellés des colonnes')
  const rows = [...table.querySelectorAll('tr')].slice(1)
  T.eq(rows.map(r => r.querySelector('td.row-label').textContent), NAMES, 'noms des bords')
  rows.forEach((r, i) => {
    T.ok(r.querySelector(`td:nth-child(2) #pref-${KEYS[i]}`), `épaisseur ${NAMES[i]}`)
    T.ok(r.querySelector('td:nth-child(3) input[id^="pref-intensity_"]'), `intensité ${NAMES[i]}`)
  })
})

T.test('tableaux : libellés à gauche, champs à droite, de l’air entre les deux', async () => {
  PreferencesPanel.toggle() ; await T.wait(150)
  for ( const id of ['prefs-lines-table', 'prefs-layout-table'] ) {
    const table = panel().querySelector(`#${id}`)
    const tr = table.querySelectorAll('tr')[1]
    const label = tr.querySelector('td.row-label'), last = tr.lastElementChild
    const tR = table.getBoundingClientRect(), fields = [...tr.querySelectorAll('input')].map(i => i.getBoundingClientRect())
    T.ok(Math.abs(label.getBoundingClientRect().left - tR.left) < 2, `${id} : libellé à gauche`)
    T.ok(tR.right - Math.max(...last.querySelectorAll('span.pref-field').length ? [...last.querySelectorAll('span.pref-field')].map(f => f.getBoundingClientRect().right) : [0]) < 4, `${id} : champs à droite`)
    T.ok(Math.min(...fields.map(f => f.left)) - label.getBoundingClientRect().right >= 24, `${id} : espace entre libellé et champs`)
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
