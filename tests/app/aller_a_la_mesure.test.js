// « Aller à la mesure… » (#166) : pour chaque numéro de mesure, la ligne
// des numéros du système précédent est hors fenêtre (au-dessus de la bande
// du haut), le système et la marque visibles
const { Systeme } = await T.imp('Systeme')
const { Forme } = await T.imp('Forme')

T.test('chaque mesure amenée en haut de la fenêtre', async () => {
  const band = document.querySelector('#titlebar')
  const maxScroll = document.documentElement.scrollHeight - innerHeight
  const seen = new Set()
  let count = 0
  for ( const {mark, number} of Forme.measureMarks ) {
    if ( seen.has(number) ) continue ; seen.add(number)
    if ( Forme.measureMarks.find(m => m.number == number).mark !== mark ) continue
    Forme.gotoMeasureNumber(number)
    const sys = Systeme.getSystemeAssociated(mark)
    const prev = Systeme.all[Systeme.all.indexOf(sys) - 1]
    const bb = band.getBoundingClientRect().bottom
    if ( !prev ) { T.eq(scrollY, 0, `mesure ${number} (premier système) : haut de page`) ; continue }
    if ( scrollY >= maxScroll - 1 ) continue // fin de page : défilement limité
    const els = [prev.obj, ...Forme.measureMarksOf(prev).map(m => m.obj), prev.measureLine].filter(Boolean)
    const prevBottom = Math.max(...els.map(e => e.getBoundingClientRect().bottom))
    T.ok(prevBottom <= bb, `mesure ${number} : système précédent masqué`)
    T.ok(sys.obj.getBoundingClientRect().top >= bb, `mesure ${number} : système visible`)
    T.ok(mark.obj.getBoundingClientRect().bottom <= innerHeight, `mesure ${number} : numéro visible`)
    count++
  }
  T.ok(count > 10, 'mesures contrôlées')
})
