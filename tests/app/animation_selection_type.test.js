// Animation de l'analyse (pas à pas, retour, fin) et sélection des
// marques par type (panneau « Sélection > Sélectionner les marques… »)
const { AObjet } = await T.imp('AObjet')
const { Animation } = await T.imp('Animation')
const { MarksSelector } = await T.imp('MarksSelector')

// Marques animées : toutes sauf les numéros de mesure posés sur la ligne
const animated = () => AObjet.items.filter(ao => ao.isMark && ao.obj && !(ao.data && ao.data.line))
const hidden = () => animated().filter(m => m.obj.style.visibility == 'hidden').length

T.test('animation : marques masquées, pas à pas, retour, fin', async () => {
  const n = animated().length
  T.eq(n, 6, 'marques animées (sans les numéros de mesure)')
  Animation.start()
  T.ok(document.documentElement.classList.contains('animation-running') || Animation.sequence, 'animation lancée')
  T.eq(hidden(), n, 'toutes les marques masquées au départ')
  T.eq(Animation.sequence.length, n, 'une étape par marque')
  Animation.toggleStepMode()
  Animation.next() ; Animation.next()
  T.eq(hidden(), n - 2, 'deux pas : deux marques affichées')
  T.ok(Animation.sequence.slice(0, 2).every(st => st.mark.obj.style.visibility != 'hidden'), 'dans l’ordre de la partition')
  Animation.previous()
  T.eq(hidden(), n - 1, 'pas précédent : une marque remasquée')
  Animation.stop()
  T.eq(hidden(), n, 'arrêt : retour au début')
  Animation.finish()
  T.eq(hidden(), 0, 'fin : toutes les marques réaffichées')
  T.no(document.documentElement.classList.contains('animation-running'), 'animation terminée')
})

T.test('sélection par type : accords, harmonies, filtre par expression', async () => {
  MarksSelector.show()
  const panel = document.querySelector('#marks_selector')
  T.ok(panel, 'panneau ouvert')
  const cb = type => panel.querySelector(`#selmark-${type}`)
  T.ok(cb('acc') && cb('har') && cb('mes') && cb('sys'), 'types présents (accords, harmonies, mesures, systèmes)')
  T.no(cb('cad'), 'type absent de l’analyse non proposé')
  cb('acc').checked = true ; cb('acc').dispatchEvent(new Event('change'))
  T.eq(MarksSelector.found.map(m => m.content).sort(), ['Cm', 'G'], 'accords trouvés')
  // Filtre sur les harmonies : « ^V »
  const filter = cb('har').closest('.marks-row').querySelector('input[type="text"]')
  filter.value = '^V' ; filter.dispatchEvent(new Event('input'))
  T.ok(cb('har').checked, 'filtre réglé : type coché')
  T.eq(MarksSelector.found.map(m => m.content).sort(), ['Cm', 'G', 'V'], 'accords + harmonie V')
  filter.value = '[' ; filter.dispatchEvent(new Event('input'))
  T.ok(filter.classList.contains('invalid'), 'expression invalide signalée')
  filter.value = '^V' ; filter.dispatchEvent(new Event('input'))
  panel.querySelector('.btn-default').click()
  T.eq(AObjet.selection.map(m => m.content).sort(), ['Cm', 'G', 'V'], 'marques sélectionnées')
  T.no(document.querySelector('#marks_selector'), 'panneau fermé')
  AObjet.deselectAll()
})
