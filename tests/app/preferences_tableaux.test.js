// Panneau des préférences en deux colonnes (#306) : libellés (une seule
// ligne), réglages fer à gauche, largeur figée ; « Traits » et « Mise en
// page » en lignes à sous-libellé ; cases à cocher en colonne 2 ;
// sélecteur de couleur ; libellés sans « : » ; clic sur un libellé →
// champ correspondant
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { Preferences } = await T.imp('Preferences')

const panel = () => document.querySelector('#preferences-panel')
const KEYS = ['border_circle', 'border_box', 'thiness_cellule_line', 'thiness_border', 'thiness_motif_line', 'thiness_segment_line', 'border_emprunt', 'border_cadence', 'border_note', 'border_form', 'border_measure']
const NAMES = ['Cercle', 'Cadre simple', 'Cellule musicale', 'Cadre texte', 'Cadre motif', 'Trait segment', 'Trait emprunts', 'Trait cadence', 'Contour type de note', 'Portion (cadre)', 'Bord num. mesure']
const open = async () => { PreferencesPanel.toggle() ; await T.wait(150) }
const labOf = id => panel().querySelector(`label[for="${id}"]`)

T.test('section « Traits » : épaisseur puis intensité, une ligne chacune, noms exacts', async () => {
  KEYS.forEach((key, i) => {
    const l1 = labOf(`pref-${key}`)
    T.ok(l1, `ligne épaisseur ${NAMES[i]}`)
    T.eq([l1.querySelector('span.main').textContent, l1.querySelector('span.sub').textContent], [NAMES[i], 'épaisseur'], `libellé ${NAMES[i]}`)
    const next = l1.closest('.div-data').nextElementSibling
    const l2 = next && next.querySelector('label')
    T.ok(l2 && /^pref-intensity_/.test(l2.getAttribute('for')), `ligne intensité ${NAMES[i]}`)
    T.eq([l2.querySelector('span.main'), l2.querySelector('span.sub').textContent], [null, 'intensité'], `sous-libellé intensité ${NAMES[i]}`)
  })
})

T.test('deux colonnes : libellés sur une ligne, réglages fer à gauche, largeur figée (#306)', async () => {
  await open()
  try {
    const P = panel()
    const labels = [...P.querySelectorAll('div.type-valeur > label')].filter(l => l.getClientRects().length)
    const lefts = new Set(labels.map(l => Math.round(l.getBoundingClientRect().left)))
    T.eq(lefts.size, 1, 'libellés alignés à gauche')
    const lineH = parseFloat(getComputedStyle(labels[0]).lineHeight) || 22
    T.eq(labels.filter(l => l.getBoundingClientRect().height > lineH * 1.5).map(l => l.textContent), [], 'aucun libellé sur deux lignes')
    const fields = [...P.querySelectorAll('div.type-valeur > span.pref-field, div.type-valeur > select')].filter(f => f.getClientRects().length)
    const fl = new Set(fields.map(f => Math.round(f.getBoundingClientRect().left)))
    T.eq(fl.size, 1, `réglages fer à gauche (${[...fl].join(', ')})`)
    const gutter = Math.min(...fields.map(f => f.getBoundingClientRect().left)) - Math.max(...labels.map(l => { const r = document.createRange() ; r.selectNodeContents(l) ; return r.getBoundingClientRect().right }))
    T.ok(gutter >= 60, `gouttière large (${Math.round(gutter)} px)`)
    const w = P.getBoundingClientRect().width
    T.ok(w < 950, `largeur raisonnable (${Math.round(w)} px)`)
    // Largeur figée : la même quel que soit le défilement
    P.scrollTop = P.scrollHeight ; await T.wait(50)
    T.eq(Math.round(P.getBoundingClientRect().width), Math.round(w), 'largeur figée')
  } finally { PreferencesPanel.toggle() }
})

T.test('case à cocher en colonne 2, sélecteur de couleur, bouton de la valeur courante sous le réglage (#306)', async () => {
  await open()
  try {
    const cb = panel().querySelector('#pref-autosave')
    const sel = panel().querySelector('#pref-theme')
    T.ok(Math.abs(cb.getBoundingClientRect().left - sel.getBoundingClientRect().left) <= 2, 'case dans la colonne des réglages')
    T.ok(labOf('pref-autosave').getBoundingClientRect().right < cb.getBoundingClientRect().left, 'libellé avant la case')
    T.eq(getComputedStyle(cb).appearance, 'none', 'vraie case (dessinée)')
    const field = panel().querySelector('#pref-color_accords')
    const picker = field.parentNode.querySelector('input[type="color"]')
    T.ok(picker, 'sélecteur de couleur')
    picker.value = '#123456' ; picker.dispatchEvent(new Event('input'))
    T.eq(field.value, '123456', 'couleur choisie → champ')
    T.eq(String(Preferences.get('color_accords')), '123456', 'enregistrée')
    const w = panel().querySelector('#pref-window_width')
    const btn = w.closest('.pref-field').querySelector('button.btn-current')
    T.ok(btn.getBoundingClientRect().top > w.getBoundingClientRect().bottom, 'bouton « Largeur actuelle » sous le réglage')
  } finally { PreferencesPanel.toggle() }
})

T.test('aucun « : » à la fin des libellés, aucun texte explicatif', async () => {
  await open()
  const labels = [...panel().querySelectorAll('label')]
  const withColon = labels.filter(l => /:\s*$/.test(l.textContent) || /:/.test(getComputedStyle(l, '::after').content))
  T.eq(withColon.map(l => l.textContent), [], 'aucun libellé terminé par « : »')
  T.eq(panel().querySelectorAll('div.description').length, 0, 'aucun texte explicatif')
  PreferencesPanel.toggle()
})

T.test('clic sur un libellé : champ correspondant activé', async () => {
  await open()
  const check = (id, what) => { labOf(id).click() ; T.eq(document.activeElement && document.activeElement.id, id, what) }
  check('pref-systeme_width', 'champ texte')
  check('pref-theme', 'menu')
  check('pref-border_box', 'ligne de « Traits »')
  check('pref-layout_title_1_font', 'ligne de « Mise en page »')
  PreferencesPanel.toggle()
})
