/**
 * interact.js
 * -----------
 * Remplace les « draggable » et « resizable » de jQuery UI, avec la
 * même interface (sous-ensemble utilisé par l'application).
 *
 *    draggable(el, {start, drag, stop, helper})
 *    draggable(el, 'disable' | 'enable')
 *
 *    resizable(el, {handles:'e,s', aspectRatio, alsoResize, minWidth,
 *                   start, resize, stop})
 *    resizable(el, 'disable' | 'enable')
 *    resizable(el, 'option', <nom>, <valeur>)
 *
 * Comme avec jQuery UI, les callbacks sont appelés avec l'élément en
 * `this` et reçoivent (event, ui) où ui.position = {top, left}
 * (position CSS), ui.offset = position dans la page, ui.helper = [élément
 * déplacé], ui.size = {width, height} (resizable).
 *
 * Un nouvel appel sur un élément déjà initialisé met à jour ses options.
 */

const CANCEL_SELECTOR = 'input,textarea,button,select,option,.ui-resizable-handle'
const DRAG_DISTANCE   = 1

function cssNumber(el, prop, fallback){
  const v = parseFloat(getComputedStyle(el).getPropertyValue(prop))
  return isNaN(v) ? fallback : v
}

function pageOffset(el){
  const r = el.getBoundingClientRect()
  return {top: r.top + window.scrollY, left: r.left + window.scrollX}
}

function trackMouse(onMove, onUp){
  const move = e => onMove(e)
  const up   = e => {
    document.removeEventListener('mousemove', move)
    document.removeEventListener('mouseup', up)
    onUp(e)
  }
  document.addEventListener('mousemove', move)
  document.addEventListener('mouseup', up)
}

/* --- DRAGGABLE --- */

export function draggable(el, opts){
  const state = el._draggable
  if ( 'string' == typeof opts ) {
    if ( state ) state.disabled = (opts == 'disable')
    return
  }
  if ( state ) {
    Object.assign(state.opts, opts || {})
    return
  }
  const st = el._draggable = {opts: Object.assign({}, opts || {}), disabled: false}
  el.classList.add('ui-draggable')
  el.addEventListener('mousedown', e => onDragMouseDown(el, st, e))
}

function onDragMouseDown(el, st, e){
  if ( st.disabled || e.button !== 0 ) return
  const cancel = e.target.closest(CANCEL_SELECTOR)
  if ( cancel && el.contains(cancel) ) return
  e.preventDefault()
  const startX = e.pageX, startY = e.pageY
  let started = false
  let helper, ui, startLeft, startTop

  const buildUi = () => {
    ui = {
        helper:   [helper]
      , position: {left: startLeft, top: startTop}
      , originalPosition: {left: startLeft, top: startTop}
      , offset:   pageOffset(helper)
    }
  }

  const start = (ev) => {
    helper = st.opts.helper ? st.opts.helper.call(el, ev) : el
    startLeft = cssNumber(el, 'left', el.offsetLeft)
    startTop  = cssNumber(el, 'top',  el.offsetTop)
    if ( helper !== el ) {
      if ( !helper.parentNode ) el.parentNode.appendChild(helper)
      helper.style.left = `${startLeft}px`
      helper.style.top  = `${startTop}px`
    }
    helper.classList.add('ui-draggable-dragging')
    buildUi()
    if ( st.opts.start && st.opts.start.call(el, ev, ui) === false ) {
      helper.classList.remove('ui-draggable-dragging')
      if ( helper !== el ) helper.remove()
      return false
    }
    return true
  }

  trackMouse(
    (ev) => {
      if ( started === null ) return // départ annulé par le callback start
      if ( !started ) {
        if ( Math.max(Math.abs(ev.pageX - startX), Math.abs(ev.pageY - startY)) < DRAG_DISTANCE ) return
        if ( !start(ev) ) { started = null ; return }
        started = true
      }
      ui.position = {left: startLeft + ev.pageX - startX, top: startTop + ev.pageY - startY}
      if ( st.opts.drag && st.opts.drag.call(el, ev, ui) === false ) return
      helper.style.left = `${ui.position.left}px`
      helper.style.top  = `${ui.position.top}px`
      ui.offset = pageOffset(helper)
    },
    (ev) => {
      if ( !started ) return
      helper.classList.remove('ui-draggable-dragging')
      st.opts.stop && st.opts.stop.call(el, ev, ui)
      if ( helper !== el ) helper.remove()
    }
  )
}

/* --- RESIZABLE --- */

export function resizable(el, opts, ...args){
  let st = el._resizable
  if ( 'string' == typeof opts ) {
    if ( !st ) return
    switch(opts){
      case 'option':  st.opts[args[0]] = args[1] ; break
      case 'disable': st.disabled = true  ; el.classList.add('ui-resizable-disabled')    ; break
      case 'enable':  st.disabled = false ; el.classList.remove('ui-resizable-disabled') ; break
    }
    return
  }
  opts = Object.assign({}, opts || {})
  let handles = opts.handles
  delete opts.handles
  if ( !st ) {
    st = el._resizable = {opts: {}, disabled: false, handleEls: []}
    el.classList.add('ui-resizable')
    handles = handles || 'e,s,se'
  }
  Object.assign(st.opts, opts)
  if ( handles ) setupHandles(el, st, handles)
}

function setupHandles(el, st, handles){
  st.handleEls.forEach(h => h.remove())
  st.handleEls = handles.split(',').map(s => s.trim()).filter(Boolean).map(dir => {
    const h = document.createElement('div')
    h.className = `ui-resizable-handle ui-resizable-${dir}`
    h.addEventListener('mousedown', e => onResizeMouseDown(el, st, dir, e))
    el.appendChild(h)
    return h
  })
}

function asList(v){
  if ( !v ) return []
  return Array.isArray(v) ? v : [v]
}

function onResizeMouseDown(el, st, dir, e){
  if ( st.disabled || e.button !== 0 ) return
  e.preventDefault()
  const o = st.opts
  const startX = e.pageX, startY = e.pageY
  const startW = cssNumber(el, 'width', el.offsetWidth)
  const startH = cssNumber(el, 'height', el.offsetHeight)
  const startL = cssNumber(el, 'left', el.offsetLeft)
  const startT = cssNumber(el, 'top', el.offsetTop)
  const ratio  = startH ? startW / startH : 1
  const also   = asList(o.alsoResize).map(a => {
    return {el: a, w: cssNumber(a, 'width', a.offsetWidth), h: cssNumber(a, 'height', a.offsetHeight)}
  })
  const doW = dir.includes('e') || dir.includes('w')
  const doH = dir.includes('s') || dir.includes('n') || o.aspectRatio
  const ui = {
      element: [el], helper: [el]
    , originalSize: {width: startW, height: startH}
    , originalPosition: {left: startL, top: startT}
    , size: {width: startW, height: startH}
    , position: {left: startL, top: startT}
  }
  o.start && o.start.call(el, e, ui)
  const minW = () => o.minWidth  || 10
  const minH = () => o.minHeight || 10

  trackMouse(
    (ev) => {
      const dx = ev.pageX - startX, dy = ev.pageY - startY
      let w = startW, h = startH, l = startL
      if ( dir.includes('e') ) w = startW + dx
      if ( dir.includes('w') ) w = startW - dx
      if ( dir.includes('s') ) h = startH + dy
      w = Math.max(w, minW())
      h = Math.max(h, minH())
      if ( o.aspectRatio ) {
        if ( doW ) h = w / ratio
        else w = h * ratio
      }
      if ( dir.includes('w') ) l = startL + startW - w
      ui.size = {width: w, height: h}
      ui.position = {left: l, top: startT}
      if ( doW ) el.style.width  = `${w}px`
      if ( doH ) el.style.height = `${h}px`
      if ( dir.includes('w') ) el.style.left = `${l}px`
      also.forEach(a => {
        if ( doW ) a.el.style.width  = `${a.w + w - startW}px`
        if ( doH ) a.el.style.height = `${a.h + h - startH}px`
      })
      o.resize && o.resize.call(el, ev, ui)
    },
    (ev) => {
      o.stop && o.stop.call(el, ev, ui)
    }
  )
}
