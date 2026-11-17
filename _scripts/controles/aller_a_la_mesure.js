/*
 * Contrôle de « Aller à la mesure… » (#166) : pour chaque numéro de
 * mesure, la ligne des numéros du système précédent doit être hors
 * fenêtre (au-dessus de la bande du haut), le système visible.
 *
 *   SA_SMOKE=10 SA_SMOKE_JS=_scripts/controles/aller_a_la_mesure.js npx electron . <analyse>
 *
 * Résultat dans le Terminal : « RES ok N … ko 0 »
 */
(async () => {
  const { Systeme } = await import('./js/Systeme.js')
  const { Forme } = await import('./js/Forme.js')
  setTimeout(() => { try {
    const band = document.querySelector('#titlebar')
    const maxScroll = document.documentElement.scrollHeight - innerHeight
    let ok = 0, ko = [], limited = 0
    const seen = new Set()
    for (const {mark, number} of Forme.measureMarks) {
      if ( seen.has(number) ) continue ; seen.add(number)
      if ( Forme.measureMarks.find(m => m.number == number).mark !== mark ) continue
      Forme.gotoMeasureNumber(number)
      const sys = Systeme.getSystemeAssociated(mark)
      const prev = Systeme.all[Systeme.all.indexOf(sys) - 1]
      const bb = band.getBoundingClientRect().bottom
      if ( !prev ) { (scrollY == 0 ? ok++ : ko.push(number+':first')) ; continue }
      if ( scrollY >= maxScroll - 1 ) { limited++ ; continue }
      const els = [prev.obj, ...Forme.measureMarksOf(prev).map(m => m.obj), prev.measureLine].filter(Boolean)
      const prevBottom = Math.max(...els.map(e => e.getBoundingClientRect().bottom))
      const sysTop = sys.obj.getBoundingClientRect().top
      const markR = mark.obj.getBoundingClientRect()
      if ( prevBottom <= bb && sysTop >= bb && markR.bottom <= innerHeight ) ok++
      else ko.push(`${number}: prev ${prevBottom.toFixed(1)} band ${bb} sys ${sysTop.toFixed(1)} mark ${markR.bottom.toFixed(0)}/${innerHeight}`)
    }
    console.log('RES ok', ok, 'limited(end of page)', limited, 'ko', ko.length, ko.slice(0,10).join(' | '))
  } catch(e){ console.log('ERR', e.stack) } }, 2500)
})()
