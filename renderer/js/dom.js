export function listen(objet, eventType, method){
  objet.addEventListener(eventType, method)
}
export function unlisten(objet, eventType, method){
  objet.removeEventListener(eventType, method)
}

// Touche de commande du système : ⌘ sur macOS, Ctrl ailleurs
const IS_MAC = (window.api && window.api.platform) == 'darwin'
export function cmdKey(e){ return IS_MAC ? e.metaKey : e.ctrlKey }

export function stopEvent(e){
  e.preventDefault()
  e.stopPropagation()
  return false
}

export function DGet(selector, container){
  container = container || document
  return container.querySelector(selector)
}
export function DGetAll(selector, container){
  container = container || document
  return container.querySelectorAll(selector)
}

export function DCreate(tagName, attrs){
  attrs = attrs || {}
  const o = document.createElement(tagName)
  for ( const attr in attrs ) {
    const value = attrs[attr]
    switch (attr) {
      case 'text':
        o.innerHTML = value
        break
      case 'inner':
        (Array.isArray(value) ? value : [value]).forEach(obj => o.appendChild(obj))
        break
      case 'css':
      case 'class':
        o.className = value
        break
      default:
        o.setAttribute(attr, value)
    }
  }
  return o
}
