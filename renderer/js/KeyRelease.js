/**
 * KeyRelease
 * ----------
 * RACCOURCIS CLAVIER : déclenchés au RELÂCHEMENT de la touche, JAMAIS à
 * l'appui. Un clic (souris pressée) pendant que la touche est tenue, ou
 * la perte du focus de la fenêtre, annule le raccourci.
 *
 * Un gestionnaire d'appui (keydown/keypress) qui reconnaît un raccourci
 * appelle :
 *
 *    return onRelease(e, () => <action>)
 *
 * L'appui est arrêté (ni saisie, ni autre gestionnaire), ses répétitions
 * aussi ; l'action est jouée au relâchement de la touche (ou de ⌘/Ctrl
 * pour une combinaison : macOS n'envoie pas toujours le relâchement
 * d'une lettre tenue avec ⌘), relâchement qui ne va ensuite nulle part.
 */

let pending = null // {code, mod, action}
// Touches pressées depuis le dernier clic, et dernier relâchement
const down = new Set()
let lastRelease = null // {event, clean}

const codeOf = e => e.code || (typeof e.key == 'string' ? e.key.toLowerCase() : '')

export function onRelease(e, action){
  e.preventDefault()
  e.stopPropagation()
  if ( !pending ) {
    pending = {code: codeOf(e), mod: e.metaKey ? 'Meta' : (e.ctrlKey ? 'Control' : null), action}
  }
  return false
}

// Raccourci en attente de relâchement (pour les tests)
export function hasPendingShortcut(){ return !!pending }

export function cancelPendingShortcut(){ pending = null ; down.clear() }

/**
 * Raccourci traité dans un gestionnaire de relâchement (keyup) : vrai si
 * la touche a été pressée puis relâchée sans clic entre les deux
 */
export function isCleanRelease(e){
  return !!lastRelease && lastRelease.event === e && lastRelease.clean
}

// (les autres gestionnaires de window en phase de capture, p.e. celui
// de la lettre tenue, voient encore l'évènement)
function swallow(e){
  e.preventDefault()
  e.stopPropagation()
}

// (phase de capture sur window : avant tout autre gestionnaire)
window.addEventListener('keydown', (e) => {
  down.add(codeOf(e))
  if ( !pending || codeOf(e) != pending.code ) return
  // Répétition de la touche tenue : rien
  if ( e.repeat ) return swallow(e)
  // Nouvel appui de la même touche, son relâchement non reçu (macOS,
  // touche tenue avec ⌘ : p.e. ⌘ tenu, ↓ ↓ ↓) : l'appui précédent
  // compte, le nouveau suit son cours
  const { action } = pending
  pending = null
  action()
}, true)
window.addEventListener('keypress', (e) => {
  pending && codeOf(e) == pending.code && swallow(e)
}, true)
window.addEventListener('keyup', (e) => {
  lastRelease = {event: e, clean: down.delete(codeOf(e))}
  if ( !pending ) return
  if ( codeOf(e) != pending.code && e.key != pending.mod ) return
  swallow(e)
  const { action } = pending
  pending = null
  action()
}, true)
window.addEventListener('mousedown', cancelPendingShortcut, true)
window.addEventListener('blur', cancelPendingShortcut)
