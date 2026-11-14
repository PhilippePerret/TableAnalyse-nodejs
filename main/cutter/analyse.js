/**
 * Analyse d'une page de partition (ImageData) :
 *  - détection des lignes de portée, des portées et des systèmes,
 *  - étiquetage des composantes connexes (notes, hampes, liaisons…),
 *  - attribution de chaque composante à un système,
 *  - barres de mesure (début de chaque mesure),
 *  - extraction d'un système (avec effacement, sur option, des éléments
 *    des autres systèmes).
 *
 * Module pur (aucune dépendance), utilisé par cutter.js.
 */

export const DEFAULTS = {
    threshold:    160   // niveau de gris sous lequel un pixel est « noir »
  , minLineRatio: 0.2   // longueur minimale d'une ligne de portée (× largeur page)
  , reach:        8     // distance max d'un élément à son système (× interligne)
  , margin:       1     // marge à gauche et à droite du système (× interligne)
  , vmargin:      6     // marge au-dessus et au-dessous du système (px)
  , halo:         2     // rayon d'effacement autour des éléments étrangers (px)
  , minPixels:    4     // en dessous : poussière, effacée
  , staves:       null  // nombre forcé de portées par système
  , effacer:      false // efface les éléments des autres systèmes
}

/* ---------------------------------------------------------------------
 *  Point d'entrée
 * --------------------------------------------------------------------- */

export function analysePage(img, options = {}){
  const opts = Object.assign({}, DEFAULTS, options)
  const {width: w, height: h} = img
  const dark   = binarize(img, opts.threshold)
  const lines  = findStaffLines(dark, w, h, Math.round(w * opts.minLineRatio))
  const staves = findStaves(lines, dark, w)
  if ( staves.length === 0 ) return {width: w, height: h, lines, staves, systems: [], warnings: [(opts.texts && opts.texts.no_staff) || 'no staff']}
  const systems = groupSystems(dark, w, staves, opts.staves)
  const s       = median(staves.map(st => st.s))
  const comps   = labelComponents(dark, w, h)
  const limits  = pageLimits(dark, w, h, systems, s)
  excludeOutside(comps, limits)
  const dotted  = findDottedLines(comps, s, opts)
  assignComponents(comps, systems, s, opts, dotted)
  excludeMargins(comps, dotted, h, limits)
  findMeasures(dark, w, systems, s)
  computeCrops(comps, systems, s, w, h, opts, limits)
  return {width: w, height: h, s, lines, staves, systems, comps, limits, dotted, opts, warnings: []}
}

/* ---------------------------------------------------------------------
 *  Binarisation
 * --------------------------------------------------------------------- */

function binarize(img, threshold){
  const d = img.data, n = img.width * img.height
  const dark = new Uint8Array(n)
  for ( let i = 0, j = 0 ; i < n ; ++i, j += 4 ) {
    const gray = (d[j] * 299 + d[j+1] * 587 + d[j+2] * 114) / 1000
    if ( gray < threshold ) dark[i] = 1
  }
  return dark
}

/* ---------------------------------------------------------------------
 *  Lignes de portée. Une page scannée peut être inclinée ou courbe : une
 *  ligne n'occupe alors aucune rangée de pixels en entier. La page est
 *  donc découpée en bandes verticales étroites où une ligne reste quasi
 *  horizontale : dans chaque bande, une rangée presque entièrement noire
 *  est un morceau de ligne. Les morceaux sont ensuite chaînés d'une bande
 *  à l'autre. Chaque ligne connaît son ordonnée en tout point (yAt).
 * --------------------------------------------------------------------- */

const STRIP = 64 // largeur (px) des bandes verticales

function findStaffLines(dark, w, h, minLen){
  const nStrips = Math.floor(w / STRIP)
  // 1. Morceaux de ligne dans chaque bande
  const pieces = [] // par bande : [{y, th}]
  const need = 0.85 * STRIP
  for ( let k = 0 ; k < nStrips ; ++k ) {
    const x0 = k * STRIP, list = []
    let start = -1
    for ( let y = 0 ; y <= h ; ++y ) {
      let full = false
      if ( y < h ) {
        let n = 0
        const row = y * w + x0
        for ( let x = 0 ; x < STRIP ; ++x ) n += dark[row + x]
        full = n >= need
      }
      if ( full && start < 0 ) start = y
      else if ( !full && start >= 0 ) { list.push({y: (start + y - 1) / 2, th: y - start}); start = -1 }
    }
    pieces.push(list)
  }
  // Épaisseur type d'une ligne : on écarte les ligatures (bien plus épaisses)
  const thick = median(pieces.flat().map(p => p.th))
  const maxTh = Math.max(2 * thick, thick + 2)

  // 2. Chaînage d'une bande à l'autre (3 bandes manquantes tolérées)
  const chains = []
  for ( let k = 0 ; k < nStrips ; ++k ) {
    for ( const p of pieces[k] ) {
      if ( p.th > maxTh ) continue
      let best = null, bestD = Infinity
      for ( const ch of chains ) {
        if ( ch.last === k || k - ch.last > 4 ) continue
        const d = Math.abs(ch.y - p.y)
        if ( d <= 2 + 0.5 * (k - ch.last) && d < bestD ) { best = ch; bestD = d }
      }
      if ( best ) { best.pts.set(k, p.y); best.ths.push(p.th); best.last = k; best.y = p.y }
      else chains.push({first: k, last: k, y: p.y, pts: new Map([[k, p.y]]), ths: [p.th]})
    }
  }

  // 3. Lignes : chaînes assez longues et assez continues
  return chains
    .filter(ch => (ch.last - ch.first + 1) * STRIP >= minLen && ch.pts.size >= 0.6 * (ch.last - ch.first + 1))
    .map(ch => makeLine(ch.first * STRIP, (ch.last + 1) * STRIP - 1, ch.pts, median(ch.ths), w))
    .sort((a, b) => a.y - b.y)
}

// pts : ordonnée de la ligne au milieu de chaque bande où elle a été vue
function makeLine(x0, x1, pts, thickness, w){
  const keys = [...pts.keys()].sort((a, b) => a - b)
  const ys = keys.map(k => pts.get(k))
  const yAt = (x) => {
    const b = Math.floor(x / STRIP)
    if ( pts.has(b) ) return pts.get(b)
    if ( b <= keys[0] ) return ys[0]
    if ( b >= keys[keys.length - 1] ) return ys[ys.length - 1]
    let i = 1
    while ( keys[i] < b ) ++i
    const t = (b - keys[i-1]) / (keys[i] - keys[i-1])
    return ys[i-1] + t * (ys[i] - ys[i-1])
  }
  return {
      x0, x1, thickness, yAt
    , y:  yAt(w / 2)
    , y0: Math.floor(Math.min(...ys) - thickness / 2)
    , y1: Math.ceil(Math.max(...ys) + thickness / 2)
  }
}

// Écart vertical entre deux lignes, mesuré au milieu de leur partie commune
function lineGap(a, b){
  const x0 = Math.max(a.x0, b.x0), x1 = Math.min(a.x1, b.x1)
  const x  = x1 >= x0 ? (x0 + x1) / 2 : (b.x0 + b.x1) / 2
  return b.yAt(x) - a.yAt(x)
}

/* ---------------------------------------------------------------------
 *  Portées : groupes de 5 lignes régulièrement espacées
 * --------------------------------------------------------------------- */

function findStaves(lines, dark, w){
  if ( lines.length < 4 ) return []
  const gaps = lines.slice(1).map((l, i) => lineGap(lines[i], l))
  const s = median(gaps)
  const staves = []
  // Suites de lignes régulièrement espacées ; si une suite en compte plus
  // de 5 (ligne pointillée d'octave, ligature… à un interligne), on garde
  // les 5 consécutives les plus longues.
  let cur = [lines[0]]
  const flush = () => {
    if ( cur.length === 4 ) staves.push(makeStaff(completeStaff(cur, dark, w)))
    else if ( cur.length === 5 ) staves.push(makeStaff(cur))
    else if ( cur.length > 5 ) {
      let best = 0, bestLen = -1
      for ( let i = 0 ; i + 5 <= cur.length ; ++i ) {
        const len = cur.slice(i, i + 5).reduce((n, l) => n + l.x1 - l.x0, 0)
        if ( len > bestLen ) { best = i; bestLen = len }
      }
      staves.push(makeStaff(cur.slice(best, best + 5)))
      // Le reste peut former une autre portée
      const rest = cur.slice(best + 5)
      if ( rest.length >= 4 ) { cur = rest; flush() }
    }
  }
  for ( let i = 1 ; i < lines.length ; ++i ) {
    if ( Math.abs(gaps[i-1] - s) <= 0.2 * s ) cur.push(lines[i])
    else { flush(); cur = [lines[i]] }
  }
  flush()
  return staves
}

/**
 * Portée dont une ligne n'a pas été reconnue (couverte de ligatures) :
 * on la reconstitue, parallèle aux autres, du côté où l'image est noire.
 */
function completeStaff(lines, dark, w){
  const gap = lineGap(lines[0], lines[1])
  const shifted = (line, dy) => ({
      x0: line.x0, x1: line.x1, thickness: line.thickness
    , yAt: (x) => line.yAt(x) + dy
    , y: line.y + dy, y0: Math.round(line.y0 + dy), y1: Math.round(line.y1 + dy)
  })
  const above = shifted(lines[0], -gap), below = shifted(lines[3], gap)
  const blackness = (line) => {
    let n = 0, k = 0
    for ( let x = line.x0 ; x <= line.x1 ; x += 4, ++k ) {
      const y = Math.round(line.yAt(x))
      if ( dark[y * w + x] || dark[(y - 1) * w + x] || dark[(y + 1) * w + x] ) ++n
    }
    return k ? n / k : 0
  }
  const ba = blackness(above), bb = blackness(below)
  if ( Math.max(ba, bb) < 0.5 ) return lines
  return ba > bb ? [above, ...lines] : [...lines, below]
}

function makeStaff(lines){
  const first = lines[0], last = lines[lines.length - 1]
  const gaps = lines.slice(1).map((l, i) => lineGap(lines[i], l))
  return {
      lines
    , top:    first.y0
    , bottom: last.y1
    , left:   Math.min(...lines.map(l => l.x0))
    , right:  Math.max(...lines.map(l => l.x1))
    , s:      gaps.reduce((a, b) => a + b, 0) / gaps.length
  }
}

/* ---------------------------------------------------------------------
 *  Systèmes : deux portées consécutives appartiennent au même système
 *  si une colonne noire (barre de mesure, accolade droite) les relie.
 * --------------------------------------------------------------------- */

function groupSystems(dark, w, staves, forced){
  const groups = []
  let cur = [staves[0]]
  for ( let i = 1 ; i < staves.length ; ++i ) {
    const joined = forced
      ? cur.length < forced
      : stavesConnected(dark, w, staves[i-1], staves[i])
    if ( joined ) cur.push(staves[i])
    else { groups.push(cur); cur = [staves[i]] }
  }
  groups.push(cur)
  return groups.map(sts => ({
      staves: sts
    , top:    sts[0].top
    , bottom: sts[sts.length - 1].bottom
    , left:   Math.min(...sts.map(st => st.left))
    , right:  Math.max(...sts.map(st => st.right))
    , s:      median(sts.map(st => st.s))
  }))
}

function stavesConnected(dark, w, a, b){
  const y0 = a.bottom + 1, y1 = b.top - 1, len = y1 - y0 + 1
  if ( len <= 0 ) return true
  const pad = Math.round(2 * Math.max(a.s, b.s))
  const xa = Math.max(1, Math.min(a.left, b.left) - pad)
  const xb = Math.min(w - 2, Math.max(a.right, b.right) + pad)
  const need = Math.ceil(0.98 * len)
  for ( let x = xa ; x <= xb ; ++x ) {
    let count = 0
    for ( let y = y0 ; y <= y1 ; ++y ) {
      const p = y * w + x
      if ( dark[p] || dark[p-1] || dark[p+1] ) ++count
      else if ( y - y0 - count > len - need ) break
    }
    if ( count >= need ) return true
  }
  return false
}

/* ---------------------------------------------------------------------
 *  Composantes connexes (8-connexité), par segments horizontaux
 * --------------------------------------------------------------------- */

function labelComponents(dark, w, h){
  const runY = [], runX0 = [], runX1 = [], parent = []
  const find = (r) => {
    while ( parent[r] !== r ) { parent[r] = parent[parent[r]]; r = parent[r] }
    return r
  }
  const union = (a, b) => {
    a = find(a); b = find(b)
    if ( a !== b ) parent[Math.max(a, b)] = Math.min(a, b)
  }
  let prevStart = 0, prevEnd = 0
  for ( let y = 0 ; y < h ; ++y ) {
    const row = y * w, rowStart = runY.length
    let j = prevStart
    for ( let x = 0 ; x < w ; ++x ) {
      if ( !dark[row + x] ) continue
      const x0 = x
      while ( x + 1 < w && dark[row + x + 1] ) ++x
      const r = runY.length
      runY.push(y); runX0.push(x0); runX1.push(x); parent.push(r)
      while ( j < prevEnd && runX1[j] < x0 - 1 ) ++j
      for ( let k = j ; k < prevEnd && runX0[k] <= x + 1 ; ++k ) union(r, k)
    }
    prevStart = rowStart; prevEnd = runY.length
  }

  // Numérotation des composantes (1…n) et boites englobantes
  const nRuns = runY.length
  const compOfRun = new Int32Array(nRuns)
  const idOfRoot  = new Map()
  const comps = [null]
  const labels = new Int32Array(w * h)
  for ( let r = 0 ; r < nRuns ; ++r ) {
    const root = find(r)
    let id = idOfRoot.get(root)
    if ( id === undefined ) {
      id = comps.length
      idOfRoot.set(root, id)
      comps.push({id, minX: runX0[r], maxX: runX1[r], minY: runY[r], maxY: runY[r], count: 0, runs: [], system: -1})
    }
    const c = comps[id]
    compOfRun[r] = id
    c.runs.push(r)
    if ( runX0[r] < c.minX ) c.minX = runX0[r]
    if ( runX1[r] > c.maxX ) c.maxX = runX1[r]
    if ( runY[r]  > c.maxY ) c.maxY = runY[r]
    c.count += runX1[r] - runX0[r] + 1
    labels.fill(id, runY[r] * w + runX0[r], runY[r] * w + runX1[r] + 1)
  }
  return {list: comps, labels, w, h, runY, runX0, runX1}
}

/* ---------------------------------------------------------------------
 *  En-tête et pied de page (numéro de page, références d'édition) : une
 *  bande d'encre peu haute, tout en haut (ou en bas) de la page, séparée
 *  du reste par des rangées blanches et située hors des portées.
 *  Retourne les ordonnées entre lesquelles se trouve la musique.
 * --------------------------------------------------------------------- */

function pageLimits(dark, w, h, systems, s){
  const ink = new Uint8Array(h)
  for ( let y = 0 ; y < h ; ++y ) {
    let n = 0
    const row = y * w
    for ( let x = 0 ; x < w && n < 2 ; ++x ) n += dark[row + x]
    ink[y] = n >= 2 ? 1 : 0
  }
  // Bande d'encre à partir de `start` dans la direction `dir` : [début, fin, blanc qui suit]
  const band = (start, dir) => {
    let y = start
    while ( y >= 0 && y < h && !ink[y] ) y += dir
    const b0 = y
    let blank = 0
    while ( y >= 0 && y < h ) {
      if ( ink[y] ) blank = 0
      else if ( ++blank > 2 ) break
      y += dir
    }
    const b1 = y - dir * blank
    let gap = 0
    while ( y >= 0 && y < h && !ink[y] ) { ++gap; y += dir }
    return [b0, b1, gap]
  }
  // Plusieurs bandes possibles (poussières du scan, numéro, référence…)
  let top = 0, bottom = h - 1
  const first = systems[0], last = systems[systems.length - 1]
  for ( let i = 0 ; i < 4 ; ++i ) {
    const [b0, b1, gap] = band(top, 1)
    if ( !(b0 < 0.08 * h && b1 - b0 <= 2.5 * s && gap >= 0.4 * s && b1 < first.top - s) ) break
    top = b1 + Math.ceil(gap / 2)
  }
  for ( let i = 0 ; i < 4 ; ++i ) {
    const [b0, b1, gap] = band(bottom, -1)
    if ( !(b0 > 0.92 * h && b0 - b1 <= 2.5 * s && gap >= 0.4 * s && b1 > last.bottom + s) ) break
    bottom = b1 - Math.ceil(gap / 2)
  }
  return {top, bottom}
}

function excludeOutside(comps, limits){
  for ( let id = 1 ; id < comps.list.length ; ++id ) {
    const c = comps.list[id]
    if ( c.maxY < limits.top || c.minY > limits.bottom ) c.excluded = true
  }
}

/**
 * Numéro de page, cotage d'édition… collés à la musique (pas de bande
 * blanche franche) : tout élément non relié à une portée et entièrement
 * situé dans les 4 % du haut ou du bas de la page est écarté, et la
 * découpe s'arrête juste avant lui (sans jamais couper la musique).
 */
function excludeMargins(comps, dotted, h, limits){
  const inGroup = new Set(dotted.flatMap(g => g.members))
  const zoneTop = 0.04 * h, zoneBottom = 0.96 * h
  let headerEnd = -1, footerStart = h, musicTop = h, musicBottom = -1
  for ( let id = 1 ; id < comps.list.length ; ++id ) {
    const c = comps.list[id]
    if ( c.excluded || c.system < 0 ) continue
    if ( !c.anchored && !inGroup.has(c) && (c.maxY < zoneTop || c.minY > zoneBottom) ) {
      c.excluded = true
      c.system = -1
      if ( c.maxY < zoneTop ) headerEnd = Math.max(headerEnd, c.maxY)
      else footerStart = Math.min(footerStart, c.minY)
    }
  }
  for ( let id = 1 ; id < comps.list.length ; ++id ) {
    const c = comps.list[id]
    if ( c.system < 0 ) continue
    musicTop = Math.min(musicTop, c.minY); musicBottom = Math.max(musicBottom, c.maxY)
  }
  if ( headerEnd >= 0 ) limits.top = Math.max(limits.top, Math.min(headerEnd + 1, musicTop))
  if ( footerStart < h ) limits.bottom = Math.min(limits.bottom, Math.max(footerStart - 1, musicBottom))
}

/* ---------------------------------------------------------------------
 *  Lignes pointillées (8va, 8vb, Ped…) : suites de points alignés et
 *  régulièrement espacés. Le crochet final (points ou trait vertical)
 *  indique le système : vers le bas → système du dessous, vers le haut →
 *  système du dessus. Le signe de début (« 8 », « 8va »…) en fait partie.
 * --------------------------------------------------------------------- */

function findDottedLines(comps, s, opts){
  const {list} = comps
  const cx = (c) => (c.minX + c.maxX) / 2, cy = (c) => (c.minY + c.maxY) / 2
  const dots = []
  for ( let id = 1 ; id < list.length ; ++id ) {
    const c = list[id]
    if ( c.excluded || c.count < opts.minPixels ) continue
    if ( c.maxX - c.minX + 1 <= 0.6 * s && c.maxY - c.minY + 1 <= 0.6 * s ) dots.push(c)
  }
  dots.sort((a, b) => cx(a) - cx(b))
  // Regroupement : voisins à moins de 3 interlignes (un point peut manquer,
  // collé à une note), à la même hauteur
  const parent = dots.map((_, i) => i)
  const find = (i) => { while ( parent[i] !== i ) i = parent[i] = parent[parent[i]]; return i }
  for ( let i = 0 ; i < dots.length ; ++i ) {
    for ( let j = i + 1 ; j < dots.length && cx(dots[j]) - cx(dots[i]) <= 3 * s ; ++j ) {
      if ( Math.abs(cy(dots[j]) - cy(dots[i])) <= 0.2 * s ) parent[find(j)] = find(i)
    }
  }
  const clusters = new Map()
  dots.forEach((d, i) => {
    const r = find(i)
    if ( !clusters.has(r) ) clusters.set(r, [])
    clusters.get(r).push(d)
  })

  const groups = []
  for ( const members of clusters.values() ) {
    if ( members.length < 5 ) continue
    const x0 = Math.min(...members.map(c => c.minX)), x1 = Math.max(...members.map(c => c.maxX))
    if ( x1 - x0 < 3 * s ) continue
    const y = median(members.map(cy))
    const inLine = new Set(members)
    // Crochet final : chaîne verticale d'éléments fins partant du bout de
    // la ligne (chaque élément à moins d'un interligne du précédent)
    const lastDot = members.reduce((a, c) => cx(c) > cx(a) ? c : a)
    const hook = (sign) => {
      const chain = []
      let ref = {x: cx(lastDot), y}
      for ( ;; ) {
        let next = null
        for ( let id = 1 ; id < list.length ; ++id ) {
          const c = list[id]
          if ( inLine.has(c) || chain.includes(c) || c.excluded || c.count < opts.minPixels ) continue
          if ( c.maxX - c.minX + 1 > 0.6 * s || c.maxY - c.minY + 1 > 3 * s ) continue
          if ( Math.abs(cx(c) - ref.x) > 0.4 * s ) continue
          const near = sign > 0 ? c.minY - ref.y : ref.y - c.maxY
          if ( near < -0.2 * s || near > 1.2 * s ) continue
          if ( !next || Math.abs(cy(c) - ref.y) < Math.abs(cy(next) - ref.y) ) next = c
        }
        if ( !next ) break
        chain.push(next)
        ref = {x: cx(next), y: sign > 0 ? next.maxY : next.minY}
      }
      return chain
    }
    const down = hook(1), up = hook(-1)
    const len = (ch, sign) => ch.length ? Math.abs((sign > 0 ? Math.max(...ch.map(c => c.maxY)) : Math.min(...ch.map(c => c.minY))) - y) : 0
    const lDown = len(down, 1), lUp = len(up, -1)
    let dir = 0
    if ( lDown > lUp && lDown >= 0.5 * s ) { dir = 1; down.forEach(c => { members.push(c); inLine.add(c) }) }
    else if ( lUp > lDown && lUp >= 0.5 * s ) { dir = -1; up.forEach(c => { members.push(c); inLine.add(c) }) }
    // Signe de début (« 8 », « 8va ») juste à gauche, à la hauteur de la ligne
    for ( let id = 1 ; id < list.length ; ++id ) {
      const c = list[id]
      if ( inLine.has(c) || c.excluded || c.count < opts.minPixels ) continue
      if ( c.maxX > x0 || c.maxX < x0 - 2 * s || c.maxY - c.minY + 1 > 2 * s ) continue
      if ( c.minY > y + 0.5 * s || c.maxY < y - 0.5 * s ) continue
      members.push(c); inLine.add(c)
    }
    groups.push({members, y, x0, x1, dir})
  }
  return groups
}

/* ---------------------------------------------------------------------
 *  Attribution des composantes aux systèmes
 *
 *  - une composante qui chevauche la bande d'un système (de sa première à
 *    sa dernière ligne de portée) lui appartient (une note aiguë dont la
 *    hampe touche la portée est ainsi rattachée à sa portée) ;
 *  - une composante entre deux systèmes est rattachée à celui dont la
 *    grille des lignes supplémentaires coïncide avec ses propres traits
 *    horizontaux, sinon à celui dont un élément est le plus proche ;
 *  - une ligne pointillée est attribuée d'un bloc (cf. findDottedLines) ;
 *  - au-delà de `reach` interlignes : aucun système (titre…).
 * --------------------------------------------------------------------- */

function assignComponents(comps, systems, s, opts, dotted){
  const reach = opts.reach * s
  const floating = []
  const inGroup = new Set(dotted.flatMap(g => g.members))
  for ( let id = 1 ; id < comps.list.length ; ++id ) {
    const c = comps.list[id]
    if ( c.count < opts.minPixels || c.excluded || inGroup.has(c) ) continue
    let best = -1, bestOverlap = 0
    systems.forEach((sys, i) => {
      const overlap = Math.min(c.maxY, sys.bottom) - Math.max(c.minY, sys.top)
      if ( overlap >= 0 && overlap + 1 > bestOverlap ) { best = i; bestOverlap = overlap + 1 }
    })
    if ( best >= 0 ) { c.system = best; c.anchored = true }
    else floating.push(c)
  }

  // Lignes pointillées : le crochet désigne le système, sinon comme un
  // élément flottant unique (composante virtuelle réunissant les points)
  for ( const g of dotted ) {
    const above = systems.reduce((acc, sys, i) => sys.bottom < g.y ? i : acc, -1)
    const below = systems.findIndex(sys => sys.top > g.y)
    let target = -1
    if ( g.dir > 0 && below >= 0 ) target = below
    else if ( g.dir < 0 && above >= 0 ) target = above
    if ( target >= 0 ) { g.members.forEach(c => c.system = target); continue }
    const v = {
        runs:  g.members.flatMap(c => c.runs)
      , minX:  Math.min(...g.members.map(c => c.minX)), maxX: Math.max(...g.members.map(c => c.maxX))
      , minY:  Math.min(...g.members.map(c => c.minY)), maxY: Math.max(...g.members.map(c => c.maxY))
      , count: g.members.reduce((n, c) => n + c.count, 0)
      , system: -1, members: g.members
    }
    floating.push(v)
  }

  for ( const c of floating ) {
    // Entre deux systèmes (ou au-dessus du premier / en dessous du dernier)
    let above = -1, below = -1
    systems.forEach((sys, i) => {
      if ( sys.bottom < c.minY ) above = i
      else if ( below < 0 && sys.top > c.maxY ) below = i
    })
    const dA = above >= 0 ? c.minY - systems[above].bottom : Infinity
    const dB = below >= 0 ? systems[below].top - c.maxY : Infinity
    const okA = dA <= reach, okB = dB <= reach
    if ( okA && okB ) {
      const rows = ledgerRows(comps, c, s)
      const la = alignedCount(rows, systems[above], 'below', (c.minX + c.maxX) / 2)
      const lb = alignedCount(rows, systems[below], 'above', (c.minX + c.maxX) / 2)
      if ( la !== lb ) { c.system = la > lb ? above : below; continue }
      const nA = nearestDistance(comps, c, above, 3 * s)
      const nB = nearestDistance(comps, c, below, 3 * s)
      if ( nA !== nB ) c.system = nA < nB ? above : below
      else c.system = dA <= dB ? above : below
    }
    else if ( okA ) c.system = above
    else if ( okB ) c.system = below
  }
  for ( const v of floating ) if ( v.members ) v.members.forEach(c => c.system = v.system)
}

/**
 * Distance (px) entre la composante et l'élément ancré (attaché à une
 * portée) le plus proche du système, au plus `radius` (Infinity sinon).
 * Pour une composante allongée (liaison, soufflet…) seules ses extrémités
 * comptent : ce sont elles qui désignent les notes concernées.
 */
function nearestDistance(comps, c, sysIndex, radius){
  const {labels, list, w, h, runY, runX0, runX1} = comps
  const R = Math.ceil(radius)
  const width = c.maxX - c.minX + 1
  const elongated = width > 3 * (c.maxY - c.minY + 1) && width > radius
  const endLeft = c.minX + width * 0.15, endRight = c.maxX - width * 0.15
  let best = R * R + 1
  for ( const r of c.runs ) {
    const y = runY[r]
    // Points testés : les bouts de chaque segment (suffisant pour une distance)
    for ( const x of (runX0[r] === runX1[r] ? [runX0[r]] : [runX0[r], runX1[r]]) ) {
      if ( elongated && x > endLeft && x < endRight ) continue
      for ( let yy = Math.max(0, y - R) ; yy <= Math.min(h - 1, y + R) ; ++yy ) {
        const dy2 = (yy - y) * (yy - y)
        if ( dy2 >= best ) continue
        const row = yy * w
        for ( let xx = Math.max(0, x - R) ; xx <= Math.min(w - 1, x + R) ; ++xx ) {
          const id = labels[row + xx]
          if ( !id ) continue
          const o = list[id]
          if ( !o.anchored || o.system !== sysIndex ) continue
          const d2 = dy2 + (xx - x) * (xx - x)
          if ( d2 < best ) best = d2
        }
      }
    }
  }
  return best > R * R ? Infinity : Math.sqrt(best)
}

/**
 * Ordonnées des lignes supplémentaires d'une composante : traits fins
 * qui couvrent toute sa largeur (celle d'une ligne supplémentaire), les
 * rangées voisines étant nettement moins larges (tête de note seule).
 */
function ledgerRows(comps, c, s){
  const width = c.maxX - c.minX + 1
  if ( width < 1.5 * s || width > 3.5 * s ) return []
  // Couverture horizontale de chaque rangée
  const cover = new Int32Array(c.maxY - c.minY + 5)
  for ( const r of c.runs ) cover[comps.runY[r] - c.minY + 2] += comps.runX1[r] - comps.runX0[r] + 1
  const at = (y) => (y < c.minY - 2 || y > c.maxY + 2) ? 0 : cover[y - c.minY + 2]
  const maxThick = Math.max(3, Math.round(0.2 * s))
  const centers = []
  for ( let y = c.minY ; y <= c.maxY ; ++y ) {
    if ( at(y) < 0.9 * width ) continue
    let y1 = y
    while ( y1 + 1 <= c.maxY && at(y1 + 1) >= 0.9 * width ) ++y1
    if ( y1 - y + 1 <= maxThick && at(y - 2) < 0.75 * width && at(y1 + 2) < 0.75 * width ) centers.push((y + y1) / 2)
    y = y1
  }
  return centers
}

// Nombre de traits alignés sur la grille des lignes supplémentaires du système
function alignedCount(rows, sys, side, x){
  const staff = side === 'below' ? sys.staves[sys.staves.length - 1] : sys.staves[0]
  const ref   = (side === 'below' ? staff.lines[staff.lines.length - 1] : staff.lines[0]).yAt(x)
  let n = 0
  for ( const y of rows ) {
    const k = (y - ref) / staff.s
    if ( Math.abs(k - Math.round(k)) < 0.2 ) ++n
  }
  return n
}

/* ---------------------------------------------------------------------
 *  Barres de mesure : colonnes noires qui traversent chaque portée du
 *  système de sa première à sa dernière ligne, et restent fines sur
 *  toute leur hauteur (une hampe, elle, porte une tête de note). Les
 *  barres proches (double barre, reprise) n'en font qu'une.
 *
 *  Mesures : chacune est fermée par une barre ; la première commence au
 *  début du système, les suivantes après chaque barre. Ce qui suit la
 *  dernière barre n'est pas une mesure (armure ou clé de précaution).
 *  La dernière barre (lastBar) marque la fin de la dernière mesure.
 *  Les numéros sont posés par l'application, sous le système.
 * --------------------------------------------------------------------- */

function findMeasures(dark, w, systems, s){
  for ( const sys of systems ) {
    const [left, right] = staffEdges(dark, w, sys.staves[0], s)
    sys.staffLeft = left; sys.staffRight = right
    const cols = []
    for ( let x = Math.round(left + 1.5 * s) ; x <= right ; ++x ) {
      const q = barQuality(dark, w, sys, x, s)
      if ( q !== null ) cols.push({x, q})
    }
    // Colonnes contiguës → traits ; traits proches → une seule barre
    let bars = []
    for ( const {x, q} of cols ) {
      const last = bars[bars.length - 1]
      if ( last && x - last.x1 <= 1.2 * s ) { last.x1 = x; last.q = Math.max(last.q, q) }
      else bars.push({x0: x, x1: x, q})
    }
    // Pas de mesure de moins de 4 interlignes : entre deux barres trop
    // proches, la plus fine l'emporte (l'autre est une hampe)
    for ( let changed = true ; changed ; ) {
      changed = false
      for ( let i = 0 ; i + 1 < bars.length ; ++i ) {
        if ( bars[i + 1].x0 - bars[i].x1 < 4 * s ) {
          bars.splice(bars[i].q >= bars[i + 1].q ? i + 1 : i, 1)
          changed = true; break
        }
      }
    }
    sys.barlines = bars
    sys.lastBar = bars.length ? bars[bars.length - 1].x0 : null
    const starts = [left]
    bars.slice(0, -1).forEach(b => starts.push(b.x1 + 1))
    sys.measures = starts.map(x => ({x: Math.round(x + 0.3 * s)}))
  }
}

/**
 * Bords gauche et droit exacts d'une portée (les lignes ne sont connues
 * qu'à la largeur d'une bande près) : là où sa ligne du haut commence et
 * finit vraiment.
 */
function staffEdges(dark, w, staff, s){
  const line = staff.lines[0]
  const isOn = (x) => {
    const y = Math.round(line.yAt(x))
    for ( let dy = -1 ; dy <= 1 ; ++dy ) if ( dark[(y + dy) * w + x] ) return true
    return false
  }
  const run = Math.round(s)
  const solid = (x, dir) => { for ( let k = 0 ; k < run ; ++k ) if ( !isOn(x + dir * k) ) return false ; return true }
  let left = Math.max(0, line.x0 - STRIP)
  while ( left < line.x1 && !solid(left, 1) ) ++left
  let right = Math.min(w - 1, line.x1 + STRIP)
  while ( right > left && !solid(right, -1) ) --right
  return [left, right]
}

/**
 * La colonne est-elle une barre de mesure ? (null si non, sinon une
 * qualité : la plus faible proportion de rangées « fines » des portées)
 * Elle doit être noire sur
 * toute la hauteur de chaque portée (une hampe ne l'est presque jamais
 * entièrement), puis, soit relier les portées entre elles, soit rester
 * fine (une note ou une altération collée à la barre est tolérée sur
 * une partie de la hauteur). Sur une page inclinée, la barre est
 * perpendiculaire aux lignes de portée : on suit leur pente.
 */
function barQuality(dark, w, sys, x, s){
  const maxWidth = 0.7 * s
  const slope = (sys.staves[0].lines[0].yAt(x + 4 * STRIP) - sys.staves[0].lines[0].yAt(x - 4 * STRIP)) / (8 * STRIP)
  const yRef = sys.staves[0].lines[0].yAt(x)
  const xAt = (y) => Math.round(x - slope * (y - yRef))
  const blackAt = (y) => { const p = y * w + xAt(y) ; return dark[p] || dark[p-1] || dark[p+1] }
  // Une barre s'arrête net à la première et à la dernière ligne ; une
  // hampe déborde en général (ligature, tête de note)
  const first = sys.staves[0].lines[0], last = sys.staves[sys.staves.length - 1].lines.slice(-1)[0]
  const beyond = (yFrom, dir) => {
    let n = 0, k = 0
    for ( let d = Math.round(0.25 * s) ; d <= Math.round(0.8 * s) ; ++d, ++k ) if ( blackAt(Math.round(yFrom + dir * d)) ) ++n
    return n / k
  }
  if ( beyond(first.yAt(x), -1) > 0.4 || beyond(last.yAt(x), 1) > 0.4 ) return null
  const thins = []
  for ( const st of sys.staves ) {
    const lines = st.lines
    const y0 = Math.round(lines[0].yAt(x)), y1 = Math.round(lines[lines.length - 1].yAt(x))
    const len = y1 - y0 + 1
    let missing = 0
    for ( let y = y0 ; y <= y1 ; ++y ) {
      if ( !blackAt(y) && ++missing > 0.03 * len ) return null
    }
    // Finesse : largeur du trait noir sur les rangées hors lignes de portée
    let rows = 0, thin = 0
    for ( let y = y0 ; y <= y1 ; ++y ) {
      if ( lines.some(l => Math.abs(y - l.yAt(x)) <= l.thickness) ) continue
      ++rows
      const row = y * w
      const xc = xAt(y)
      let a = xc, b = xc
      while ( a > 0 && dark[row + a - 1] && xc - a < maxWidth ) --a
      while ( b < w - 1 && dark[row + b + 1] && b - xc < maxWidth ) ++b
      if ( b - a + 1 <= maxWidth ) ++thin
    }
    thins.push(rows ? thin / rows : 1)
  }
  // Barre reliant les portées (piano, chœur…)
  if ( sys.staves.length > 1 ) {
    let joined = true
    for ( let i = 0 ; joined && i + 1 < sys.staves.length ; ++i ) {
      const a = sys.staves[i], b = sys.staves[i + 1]
      const y0 = Math.round(a.lines[a.lines.length - 1].yAt(x)), y1 = Math.round(b.lines[0].yAt(x))
      let missing = 0
      for ( let y = y0 ; y <= y1 ; ++y ) if ( !blackAt(y) ) ++missing
      joined = missing <= 0.03 * (y1 - y0 + 1)
    }
    if ( joined ) return Math.min(...thins)
  }
  return Math.max(...thins) >= 0.85 && Math.min(...thins) >= 0.5 ? Math.min(...thins) : null
}

/* ---------------------------------------------------------------------
 *  Cadres de découpe : boite englobante des composantes du système
 * --------------------------------------------------------------------- */

function computeCrops(comps, systems, s, w, h, opts, limits){
  systems.forEach(sys => sys.crop = {x0: sys.left, y0: sys.top, x1: sys.right, y1: sys.bottom})
  for ( let id = 1 ; id < comps.list.length ; ++id ) {
    const c = comps.list[id]
    if ( c.system < 0 ) continue
    const cr = systems[c.system].crop
    if ( c.minX < cr.x0 ) cr.x0 = c.minX
    if ( c.maxX > cr.x1 ) cr.x1 = c.maxX
    if ( c.minY < cr.y0 ) cr.y0 = c.minY
    if ( c.maxY > cr.y1 ) cr.y1 = c.maxY
  }
  const pad = Math.round(opts.margin * s), vpad = Math.round(opts.vmargin)
  systems.forEach(sys => {
    const cr = sys.crop
    cr.x0 = Math.max(0, cr.x0 - pad); cr.y0 = Math.max(limits.top, cr.y0 - vpad)
    cr.x1 = Math.min(w - 1, cr.x1 + pad); cr.y1 = Math.min(limits.bottom, cr.y1 + vpad)
  })
}

/* ---------------------------------------------------------------------
 *  Extraction d'un système : découpe, effacement de l'en-tête et du pied
 *  de page et, avec l'option `effacer`, des éléments des autres systèmes
 *  (avec leur halo d'anticrénelage), sans toucher aux éléments du système.
 * --------------------------------------------------------------------- */

export function extractSystem(img, res, index){
  const {x0, y0, x1, y1} = res.systems[index].crop
  const w = res.width, cw = x1 - x0 + 1, ch = y1 - y0 + 1
  const {labels, list} = res.comps
  const out  = new ImageData(cw, ch)
  const own  = new Uint8Array(cw * ch)
  let   mask = new Uint8Array(cw * ch)
  for ( let y = 0 ; y < ch ; ++y ) {
    const src = (y + y0) * w + x0
    out.data.set(img.data.subarray(src * 4, (src + cw) * 4), y * cw * 4)
    for ( let x = 0 ; x < cw ; ++x ) {
      const id = labels[src + x]
      if ( !id ) continue
      if ( list[id].system === index ) own[y * cw + x] = 1
      else if ( list[id].excluded || res.opts.effacer ) mask[y * cw + x] = 1
    }
  }
  mask = dilate(mask, cw, ch, res.opts.halo)
  const d = out.data
  for ( let p = 0 ; p < cw * ch ; ++p ) {
    if ( mask[p] && !own[p] ) { d[p*4] = d[p*4+1] = d[p*4+2] = 255; d[p*4+3] = 255 }
  }
  return out
}

function dilate(mask, w, h, r){
  if ( r <= 0 ) return mask
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h)
  for ( let y = 0 ; y < h ; ++y ) {
    for ( let x = 0 ; x < w ; ++x ) {
      if ( !mask[y * w + x] ) continue
      for ( let k = Math.max(0, x - r) ; k <= Math.min(w - 1, x + r) ; ++k ) tmp[y * w + k] = 1
    }
  }
  for ( let y = 0 ; y < h ; ++y ) {
    for ( let x = 0 ; x < w ; ++x ) {
      if ( !tmp[y * w + x] ) continue
      for ( let k = Math.max(0, y - r) ; k <= Math.min(h - 1, y + r) ; ++k ) out[k * w + x] = 1
    }
  }
  return out
}

/* ---------------------------------------------------------------------
 *  Image de contrôle : chaque système dans sa couleur, éléments non
 *  attribués en rouge, en-tête et pied de page en gris, lignes de portée en bleu, cadres de découpe.
 * --------------------------------------------------------------------- */

const DEBUG_COLORS = [[0,150,60], [200,110,0], [130,40,180], [0,120,200], [190,30,120], [90,90,0]]

export function debugImage(img, res){
  const out = new ImageData(new Uint8ClampedArray(img.data), img.width, img.height)
  if ( !res.comps ) return out
  const {labels, list} = res.comps, d = out.data
  for ( let p = 0 ; p < labels.length ; ++p ) {
    const id = labels[p]
    if ( !id ) continue
    const sys = list[id].system
    const [r, g, b] = list[id].excluded ? [170, 170, 170]
      : sys < 0 ? [230, 0, 0] : DEBUG_COLORS[sys % DEBUG_COLORS.length]
    d[p*4] = r; d[p*4+1] = g; d[p*4+2] = b
  }
  return out
}

/* --------------------------------------------------------------------- */

function median(values){
  if ( values.length === 0 ) return 0
  const v = [...values].sort((a, b) => a - b)
  return v[Math.floor(v.length / 2)]
}
