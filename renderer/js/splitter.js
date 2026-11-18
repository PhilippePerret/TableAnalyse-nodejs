/**
 * Barre de séparation de la fenêtre scindée (splitter.html) : son
 * déplacement est transmis au processus principal, qui replace les vues
 */
const bar = document.getElementById('bar')
let dragging = false, offset = 0

bar.addEventListener('mousedown', (e) => {
  if ( e.button !== 0 ) return
  e.preventDefault()
  dragging = true
  offset = e.clientY
  // Cachée jusqu'au premier mouvement (la vue est agrandie)
  bar.style.visibility = 'hidden'
  // La vue couvre alors toute la fenêtre (cf. main.js, layoutSplit)
  window.api.invoke('split:dragStart')
})

window.addEventListener('mousemove', (e) => {
  if ( !dragging ) return
  // La barre suit la souris (décalage du clic conservé)
  const y = Math.max(0, e.clientY - offset)
  bar.style.top = `${y}px`
  bar.style.visibility = 'visible'
  window.api.invoke('split:drag', {y})
})

window.addEventListener('mouseup', () => {
  if ( !dragging ) return
  dragging = false
  bar.style.top = '0px'
  bar.style.visibility = 'visible'
  window.api.invoke('split:dragEnd')
})
