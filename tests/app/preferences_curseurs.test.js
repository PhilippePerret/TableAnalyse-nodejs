// Préférences numériques : champ, unité, « < curseur > » (pas de 1), effet
// immédiat sur la table ; tailles des marques en tableau, tailles des
// parties, sections et segments (#281)
const { AObjet } = await T.imp('AObjet')
const { Preferences } = await T.imp('Preferences')
const { PreferencesAppData } = await T.imp('Preferences_AppData')
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { Stage } = await T.imp('Exporter')
const { Systeme } = await T.imp('Systeme')

const panel = () => document.querySelector('#preferences-panel')
const ctrl = key => {
  const f = panel().querySelector(`#pref-${key}`)
  const s = f.closest('tr, .div-data').querySelector('span.pref-slider')
  return {field: f, slider: s && s.querySelector('input[type="range"]'), minus: s && s.querySelectorAll('button.pref-step')[0], plus: s && s.querySelectorAll('button.pref-step')[1]}
}
const ptToPx = pt => Math.round(pt * 96 / 72 * 100) / 100
const sizeOf = m => Math.round(parseFloat(getComputedStyle(m.obj.querySelector('span.content')).fontSize) * 100) / 100

T.test('taille des marques : une ligne par marque, parties, sections, segments', async () => {
  const rows = ['Accords', 'Harmonies', 'Parties', 'Sections', 'Segments']
  const labels = [...panel().querySelectorAll('div.pref-row label')].map(l => l.textContent)
  rows.forEach(l => T.ok(labels.includes(l), `ligne « ${l} »`))
  for ( const k of ['accords', 'harmonie', 'partie', 'section', 'segment'] ) {
    const c = ctrl(`marque_${k}_size`)
    T.ok(c.slider && c.minus && c.plus, `${k} : curseur et flèches`)
  }
})

T.test('valeurs par défaut : partie 24 pt, section 18 pt, segment 13 pt', async () => {
  const prt = await T.mark({type: 'frm', subtype: 'prt', content: 'EXPO', top: 1500, left: 300})
  const sec = await T.mark({type: 'frm', subtype: 'sec', content: 'A', top: 1600, left: 300})
  const seg = await T.mark({type: 'seg', subtype: 'h-up', content: 'a', top: 1700, left: 300})
  try {
    T.eq(sizeOf(prt), ptToPx(24), 'partie')
    T.eq(sizeOf(sec), ptToPx(18), 'section')
    T.eq(sizeOf(seg), ptToPx(13), 'segment')
  } finally { [prt, sec, seg].forEach(m => AObjet.remove(m)) }
})

T.test('curseur, flèches, champ : effet immédiat, et dans l’export', async () => {
  const prt = await T.mark({type: 'frm', subtype: 'prt', content: 'EXPOCUR', top: 400, left: 300})
  const c = ctrl('marque_partie_size')
  try {
    c.slider.value = '40' ; c.slider.dispatchEvent(new Event('input'))
    T.eq(c.field.value, '40', 'curseur → champ')
    T.eq(sizeOf(prt), ptToPx(40), 'curseur : tout de suite')
    c.plus.click()
    T.eq([c.field.value, c.slider.value], ['41', '41'], '> : + 1')
    T.eq(sizeOf(prt), ptToPx(41), '> : tout de suite')
    c.minus.click() ; c.minus.click()
    T.eq(c.field.value, '39', '< : − 1')
    T.eq(sizeOf(prt), ptToPx(39), '< : tout de suite')
    c.field.value = '30' ; c.field.dispatchEvent(new Event('input'))
    T.eq(c.slider.value, '30', 'champ → curseur')
    T.eq(sizeOf(prt), ptToPx(30), 'champ : tout de suite')
    T.eq(String(Preferences.get('marque_partie_size')), '30', 'enregistrée')
    // Export SVG
    const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
    const stage = new Stage()
    await stage.build() ; stage.respace(opts)
    const svg = (await stage.svgPages(stage.layout(opts))).join('')
    stage.remove()
    const m = svg.match(/<text[^>]*font-size="([\d.]+)"[^>]*>(?:<[^>]+>)*EXPOCUR/)
    T.ok(m, 'partie dans l’export SVG')
    T.ok(m && Math.abs(Number(m[1]) - ptToPx(30)) < 0.5, `taille dans l’export (${m && m[1]})`)
  } finally {
    c.field.value = '24' ; c.field.dispatchEvent(new Event('change'))
    AObjet.remove(prt)
  }
})

T.test('toutes les valeurs numériques : curseur, aucun bouton « Appliquer »', async () => {
  const keys = Object.values(PreferencesAppData).filter(dp => !dp.hidden && dp.type == 'inputtext' && dp.typeV == 'number' && panel().querySelector(`#pref-${dp.id}`)).map(dp => dp.id)
  T.ok(keys.length > 30, `valeurs numériques (${keys.length})`)
  for ( const k of keys ) {
    const c = ctrl(k)
    T.ok(c.slider && c.minus && c.plus, `${k} : curseur et flèches`)
    T.no(panel().querySelector(`#pref-${k}`).closest('tr, .div-data').querySelector('button.btn-apply'), `${k} : pas de bouton « Appliquer »`)
  }
})

T.test('valeur hors style (haut du premier système) : appliquée par les flèches', async () => {
  const c = ctrl('top_first_system')
  const sys = Systeme.all ? Systeme.all[0] : null
  const before = Number(c.field.value)
  try {
    c.plus.click()
    T.eq(Number(c.field.value), before + 1, '> : + 1')
    T.eq(String(Preferences.get('top_first_system')), String(before + 1), 'enregistrée')
    if ( sys && sys.obj ) T.eq(Math.round(sys.top), before + 1, 'premier système déplacé tout de suite')
  } finally { c.minus.click() }
})
