// Aspects « Gris » et « Clair de gris » (#240) : marques atténuées sur la
// table et dans les exports (PDF, SVG, HTML), sauf textes longs et
// marques sorties du mode gris (menu contextuel, menu « Marques ») ;
// réouverture (T.phase)
const { Current } = await T.imp('Current')
const { AObjet } = await T.imp('AObjet')
const { Preferences } = await T.imp('Preferences')
const { PreferencesPanel } = await T.imp('PreferencesPanel')
const { Aspect } = await T.imp('Aspect')
const { AmarkMenu } = await T.imp('MenuAMark')
const { Stage } = await T.imp('Exporter')
const { Analyse } = await T.imp('Analyse')
const { AnalyseSaver } = await T.imp('AnalyseSaver')

const op = el => Number(getComputedStyle(el).opacity)
const content = m => m.data.content
const byContent = c => AObjet.items.find(m => content(m) == c)
const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}

// Aspect choisi dans le panneau des préférences
const chooseAspect = (name) => {
  const select = document.querySelector('#pref-theme')
  select.value = name
  select.dispatchEvent(new Event('change'))
}

if ( T.phase == 1 ) {

  T.test('menu des préférences : « Gris » et « Clair de gris »', async () => {
    const values = Preferences.themesAsMenu()
    T.ok(values.some(v => v.value == 'gris' && v.name == 'Gris'), 'Gris')
    T.ok(values.some(v => v.value == 'clair_de_gris' && v.name == 'Clair de gris'), 'Clair de gris')
    const opts = Array.from(document.querySelectorAll('#pref-theme option')).map(o => o.textContent.trim())
    T.ok(opts.includes('Clair de gris'), 'option dans le panneau')
  })

  T.test('aspect « Gris » : toutes les marques à 45 %, sauf textes longs', async () => {
    const acc = await T.mark({type: 'acc', content: 'GrisAcc', top: 400, left: 300})
    const seg = await T.mark({type: 'seg', subtype: 'h-up', content: 'GrisSeg', top: 300, left: 500})
    const txt = await T.mark({type: 'txt', subtype: 'size3', content: 'GrisTxt', top: 300, left: 900})
    const lng = await T.mark({type: 'txt', subtype: 'long', content: 'GrisLong', top: 1200, left: 300})
    chooseAspect('commun')
    T.eq(op(acc.obj), 1, 'aspect commun : accord normal')
    chooseAspect('gris')
    T.ok(Aspect.isGray, 'mode gris actif')
    T.ok(Current.analyse && document.querySelector('section#content').classList.contains('aspect-gris'), 'classe sur la table')
    T.eq(op(acc.obj), 0.45, 'accord')
    T.eq(op(seg.obj), 0.45, 'segment')
    T.eq(op(txt.obj), 0.45, 'texte')
    T.eq(op(lng.obj), 1, 'texte long normal')
  })

  T.test('aspect « Clair de gris » : 28 %, textes et motifs 35 %, textes longs normaux', async () => {
    chooseAspect('clair_de_gris')
    const mot = await T.mark({type: 'mot', content: 'GrisMot', top: 1300, left: 300})
    T.ok(document.querySelector('section#content').classList.contains('aspect-clair_de_gris'), 'classe sur la table')
    T.no(document.querySelector('section#content').classList.contains('aspect-gris'), 'ancienne classe retirée')
    T.eq(op(byContent('GrisAcc').obj), 0.28, 'accord')
    T.eq(op(byContent('GrisSeg').obj), 0.35, 'segment (motif)')
    T.eq(op(byContent('GrisTxt').obj), 0.35, 'petit texte')
    T.eq(op(mot.obj), 0.35, 'motif')
    T.eq(op(byContent('GrisLong').obj), 1, 'texte long')
  })

  T.test('menu contextuel : sortir du mode gris et y remettre', async () => {
    const acc = byContent('GrisAcc')
    const item = () => acc.contextMenuItems.find(i => i.value == 'toggleGray')
    T.eq(item() && item().label, 'Sortir du mode gris', 'libellé')
    T.no(byContent('GrisLong').contextMenuItems.some(i => i.value == 'toggleGray'), 'absent pour un texte long')
    acc.onContextChoice('toggleGray')
    T.eq(op(acc.obj), 1, 'marque sortie : normale')
    T.ok(acc.isUngray, 'consigné')
    T.eq(item() && item().label, 'Remettre dans le mode gris', 'libellé inversé')
    acc.onContextChoice('toggleGray')
    T.eq(op(acc.obj), 0.28, 'remise dans le mode gris')
    chooseAspect('commun')
    T.no(acc.contextMenuItems.some(i => i.value == 'toggleGray'), 'absent hors mode gris')
    chooseAspect('clair_de_gris')
  })

  T.test('menu « Marques » : sortir la sélection du mode gris', async () => {
    const acc = byContent('GrisAcc'), seg = byContent('GrisSeg')
    const option = document.querySelector('select#amark_menu option[value="toggleGray"]')
    AObjet.deselectAll()
    T.ok(option.disabled, 'inactif sans sélection')
    AObjet.addToSelection(acc) ; AObjet.addToSelection(seg)
    await T.until(() => !option.disabled, 'actif avec une sélection')
    T.eq(option.textContent, 'Sortir les marques du mode gris', 'libellé (plusieurs)')
    AmarkMenu.onActivate_toggleGray()
    T.eq([op(acc.obj), op(seg.obj)], [1, 1], 'marques sorties')
    T.eq(option.textContent, 'Remettre les marques dans le mode gris', 'libellé inversé')
    AmarkMenu.onActivate_toggleGray()
    T.eq([op(acc.obj), op(seg.obj)], [0.28, 0.35], 'marques remises')
    chooseAspect('commun')
    T.ok(option.disabled, 'inactif hors mode gris')
    chooseAspect('clair_de_gris')
    AObjet.deselectAll()
  })

  T.test('exports PDF, SVG, HTML : aspect appliqué, marque sortie normale, marque verrouillée normale', async () => {
    const out = await T.mark({type: 'acc', content: 'GrisOut', top: 400, left: 700})
    out.setUngray(true)
    const lock = await T.mark({type: 'har', content: 'GrisLock', top: 700, left: 700})
    lock.setUngray(true) ; lock.lock()
    // SVG : opacité des marques
    let stage = new Stage()
    await stage.build() ; stage.respace(opts) ; stage.addLegend()
    const svgOp = (c) => {
      const el = Array.from(stage.content.querySelectorAll('div.amark')).find(e => e.textContent.includes(c))
      return el && op(el)
    }
    T.eq(svgOp('GrisAcc'), 0.28, 'SVG : accord')
    T.eq(svgOp('GrisTxt'), 0.35, 'SVG : texte')
    T.eq(svgOp('GrisLong'), 1, 'SVG : texte long')
    T.eq(svgOp('GrisOut'), 1, 'SVG : marque sortie')
    T.eq(svgOp('GrisLock'), 1, 'SVG : marque verrouillée sortie')
    const pages = await stage.svgPages(stage.layout(opts))
    T.ok(pages.some(p => p.includes('opacity="0.28"')), 'SVG : opacité 0.28 écrite')
    T.ok(pages.some(p => p.includes('opacity="0.35"')), 'SVG : opacité 0.35 écrite')
    stage.remove()
    // PDF : classe de l'aspect sur les pages
    stage = new Stage()
    await stage.build() ; stage.respace(opts) ; stage.addLegend()
    const pdf = await stage.pdfData(stage.layout(opts))
    stage.remove()
    T.includes(pdf.code_html, 'section id="content" class="aspect-clair_de_gris"', 'PDF : aspect')
    T.ok(/class="[^"]*ungray[^"]*"/.test(pdf.code_html), 'PDF : marque sortie')
    T.no(/class="[^"]*\blocked\b/.test(pdf.code_html), 'PDF : pas de classe de verrouillage')
    // HTML : classe de l'aspect et règles
    await Analyse.exportCurrentToHtml()
    const html = (await T.listFiles('export')).find(f => f.endsWith('.html'))
    const code = html ? await T.readFile(`export/${html}`) : ''
    T.ok(/<section id="content"[^>]*class="[^"]*aspect-clair_de_gris/.test(code), 'HTML : aspect')
    T.includes(code, '.aspect-clair_de_gris div.amark.aobj', 'HTML : règles de l’aspect')
    T.no(/class="[^"]*\blocked\b/.test(code), 'HTML : pas de classe de verrouillage')
    lock.unlock() ; AObjet.remove(lock) ; AObjet.remove(out)
  })

  T.test('enregistrement : aspect et marque sortie du mode gris', async () => {
    byContent('GrisAcc').setUngray(true)
    T.eq(await AnalyseSaver.save(), true, 'enregistrement')
    T.ok(/theme: '?clair_de_gris/.test(await T.readFile('preferences.yaml')), 'aspect enregistré')
    T.includes(await T.readFile('analyse_tags.yaml'), 'ungray', 'marque sortie enregistrée')
  })

} else {

  T.test('réouverture : aspect et marque sortie retrouvés', async () => {
    T.ok(document.querySelector('section#content').classList.contains('aspect-clair_de_gris'), 'aspect appliqué')
    T.eq(op(byContent('GrisAcc').obj), 1, 'marque sortie normale')
    T.eq(op(byContent('GrisSeg').obj), 0.35, 'segment')
    T.eq(op(byContent('GrisLong').obj), 1, 'texte long')
  })
}
