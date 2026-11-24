// Exposants « ^…^ » partout à l'affichage, jamais dans les champs
// d'édition (#236)
const { AObjet } = await T.imp('AObjet')
const { setWindowTitle } = await T.imp('Analyse')
const { Current } = await T.imp('Current')
const { Forme } = await T.imp('Forme')
const { FormeBuilder } = await T.imp('FormeBuilder')
const { History } = await T.imp('History')
const { Stage } = await T.imp('Exporter')

const html = m => m.obj.querySelector('span.content').innerHTML

T.test('bande de titre', async () => {
  setWindowTitle({piece_title: 'Sonate n° 1', composer: 'Beethoven', analyse_title: '1^er^ mouvement'})
  T.includes(document.querySelector('#window-title').innerHTML, '1<sup>er</sup> mouvement', 'exposant')
  setWindowTitle(Current.analyse.infos)
})

T.test('marques de texte, cadres, motifs, segments, forme, titres de mise en page', async () => {
  const cases = [
      {type: 'txt', subtype: 'size3', content: 'Le 1^er^ thème'}
    , {type: 'txt', subtype: 'size1', content: 'XIX^e^ siècle'}
    , {type: 'bbx', subtype: 'bxt', content: '2^e^ partie'}
    , {type: 'mot', content: 'Motif du 2^e^ thème'}
    , {type: 'seg', subtype: 'h-up', content: '1^re^ fois'}
    , {type: 'frm', subtype: 'fpar', content: '2^e^ partie'}
    , {type: 'frm', subtype: 'prt', content: '2^e^ partie'}
    , {type: 'lay', subtype: 'tit', content: '1^er^ mouvement', level: 1}
  ]
  for ( const c of cases ) {
    const m = await T.mark(Object.assign({top: 1100, left: 400}, c))
    T.includes(html(m), '<sup>', `${c.type}/${c.subtype || ''} : exposant`)
    T.no(html(m).includes('^'), `${c.type}/${c.subtype || ''} : plus de « ^ »`)
    // Champ d'édition : texte tel qu'il a été tapé
    m.edit()
    T.eq(m.editor.getValue(), c.content, `${c.type}/${c.subtype || ''} : champ d’édition inchangé`)
    m.editor.onClickCancel()
    T.eq(m.content, c.content, `${c.type}/${c.subtype || ''} : contenu enregistré inchangé`)
    AObjet.remove(m)
  }
})

T.test('marques en police PhilNote (accords, harmonies) : « ^ » laissé au chiffrage', async () => {
  for ( const type of ['acc', 'har'] ) {
    const m = await T.mark({type, content: 'V^e^', top: 1100, left: 400})
    T.no(html(m).includes('<sup>'), `${type} : pas d’exposant`)
    AObjet.remove(m)
  }
})

T.test('forme construite, menu des débuts de portion, historique : exposants ou texte sans « ^ »', async () => {
  const mm = Forme.measureMarks.find(m => m.number == 1).mark
  const p = await T.mark({type: 'frm', subtype: 'fpar', content: '1^re^ partie', top: 150, left: mm.left})
  Forme.placeOnMeasure(p)
  T.ok(FormeBuilder.build(), 'forme construite')
  const diag = document.querySelector('#form-diagram')
  T.includes(diag && diag.innerHTML, '1<sup>re</sup> partie', 'nom de la partie dans la forme')
  T.ok([...diag.querySelectorAll('[title]')].every(e => !e.title.includes('^')), 'infobulles sans « ^ »')
  FormeBuilder.remove()
  T.eq(Forme.labelOf(p).includes('^'), false, 'texte du menu des débuts sans « ^ »')
  T.no(History.markName(p.data).includes('^'), 'nom dans l’historique sans « ^ »')
  AObjet.remove(p)
})

T.test('export SVG : exposant écrit sans « ^ »', async () => {
  const m = await T.mark({type: 'txt', subtype: 'size2', content: 'Le 1^er^ thème', top: 400, left: 400})
  const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
  const stage = new Stage()
  await stage.build() ; stage.respace(opts)
  const svg = (await stage.svgPages(stage.layout(opts))).join('\n')
  stage.remove()
  T.includes(svg, 'er', 'texte de l’exposant')
  T.no(/1\^er/.test(svg), 'pas de « ^ » dans le SVG')
  AObjet.remove(m)
})
