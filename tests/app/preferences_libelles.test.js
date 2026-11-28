// Panneau des préférences : libellés et ordre (#245)
const { PreferencesPanel } = await T.imp('PreferencesPanel')

const labelOf = key => {
  const el = document.querySelector(`#pref-${key}`)
  const row = el && el.closest('.div-data')
  return row ? row.querySelector('label').textContent.replace(/\s*:\s*$/, '').trim() : null
}
const groups = () => [...document.querySelectorAll('#preferences-panel div.pref-group')]

T.test('libellés des numéros de mesure', async () => {
  T.eq(labelOf('measure_line_offset'), 'Distance système ←→ num. mesures', 'distance au système')
  T.eq(labelOf('distance_after_measure_line'), 'Distance num. mesures ←→ sys. suivant', 'distance au système suivant')
  T.eq(labelOf('marque_measure'), 'Taille des numéros de mesure', 'taille')
  T.eq(labelOf('color_mesure'), 'Couleur des numéros de mesure', 'couleur')
})

T.test('« Ajuster en hauteur » en premier dans la section de l’alignement', async () => {
  const g = groups().find(e => /alignement/i.test(e.textContent))
  T.ok(g, 'section trouvée')
  const first = g && g.nextElementSibling
  T.ok(first && first.querySelector('#pref-adjust_same_mark'), 'première préférence de la section')
  T.ok(first && first.nextElementSibling && first.nextElementSibling.querySelector('#pref-snap_for_adjust_pos'), 'magnétisation juste dessous')
})

T.test('section « Taille des marques »', async () => {
  T.ok(groups().some(e => e.textContent == 'Taille des marques'), 'titre de la section')
  T.no(groups().some(e => e.textContent == 'Marques'), 'plus de section « Marques »')
})
