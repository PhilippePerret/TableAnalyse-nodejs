/**
 * ta-partage — serveur de partage à distance de la Table d'analyse
 * (issue #220). Indépendant de tout autre service.
 *
 * Rôle : relayer, en direct, l'analyse d'un analyste vers les
 * spectateurs qu'il a invités. Les analyses partagées restent en
 * mémoire ; elles sont effacées à l'arrêt du partage, ou après une heure
 * d'absence de l'analyste. La base ne contient que les adresses
 * confirmées (pseudo, jetons des applications).
 *
 * HTTP
 *   POST /analyste {pseudo}            → {jeton} de l'analyste (sans email)
 *   POST /identifier {email}           → email du code (spectateur)
 *   POST /valider {email, code}        → {jeton} du spectateur
 *
 * WebSocket /ws (messages JSON, cf. Manuel_dev.md § Partage)
 *
 * Environnement
 *   PORT, IP            adresse d'écoute (fournies par AlwaysData)
 *   TA_PARTAGE_DB       base SQLite (défaut ~/data/ta-partage/partage.sqlite)
 *   TA_PARTAGE_URL      adresse publique (défaut https://partage.analyse-musicale.fr)
 *   TA_PARTAGE_FROM     expéditeur des emails
 *   SMTP_SERVER, SMTP_USERNAME, SMTP_PASSWORD (sans SMTP_SERVER : emails
 *                       écrits dans le journal, pour les essais)
 */
import http from 'node:http'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { WebSocketServer } from 'ws'
import nodemailer from 'nodemailer'

const PORT     = Number(process.env.PORT) || 8820
const HOST     = process.env.IP || '::'
const URL_PUB  = (process.env.TA_PARTAGE_URL || 'https://partage.analyse-musicale.fr').replace(/\/$/, '')
const FROM     = process.env.TA_PARTAGE_FROM || 'partage@analyse-musicale.fr'
const DB_PATH  = process.env.TA_PARTAGE_DB || path.join(os.homedir(), 'data', 'ta-partage', 'partage.sqlite')
const DOWNLOAD = 'https://www.analyse-musicale.fr/table-analyse/'

const ABSENCE_MAX   = 60 * 60 * 1000          // analyste absent : partage effacé
const PENDING_TTL   = 24 * 60 * 60 * 1000     // lien de confirmation valable 24 h
const RESEND_DELAY  = 2 * 60 * 1000           // pas deux emails à la même adresse en 2 min
const MAX_TRIES     = 5                       // codes faux avant annulation
const SHARE_MAX     = 200 * 1024 * 1024       // octets par partage
const TOTAL_MAX     = 1024 * 1024 * 1024      // octets pour tous les partages
const MAX_INVITES   = 200
const MAX_PAYLOAD   = 60 * 1024 * 1024        // message WebSocket (fichier en base64)
const EMAILS_PER_IP = 30                      // emails demandés par heure et par adresse IP

/* --- Base --- */

fs.mkdirSync(path.dirname(DB_PATH), {recursive: true, mode: 0o700})
const db = new DatabaseSync(DB_PATH)
db.exec(`
CREATE TABLE IF NOT EXISTS comptes (
  email   TEXT PRIMARY KEY,
  pseudo  TEXT,
  cree_le INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS jetons (
  hash    TEXT PRIMARY KEY,           -- sha256 du jeton
  email   TEXT NOT NULL,
  cree_le INTEGER NOT NULL,
  vu_le   INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS attentes (
  email   TEXT PRIMARY KEY,
  pseudo  TEXT,
  code    TEXT NOT NULL,
  lien    TEXT NOT NULL UNIQUE,
  clique  INTEGER NOT NULL DEFAULT 0,
  essais  INTEGER NOT NULL DEFAULT 0,
  envoye  INTEGER NOT NULL,
  expire  INTEGER NOT NULL
);
`)
const sql = {
    compte:        db.prepare('SELECT * FROM comptes WHERE email = ?')
  , compteAjout:   db.prepare('INSERT INTO comptes (email, pseudo, cree_le) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET pseudo = COALESCE(excluded.pseudo, comptes.pseudo)')
  , jeton:         db.prepare('SELECT * FROM jetons WHERE hash = ?')
  , jetonAjout:    db.prepare('INSERT INTO jetons (hash, email, cree_le, vu_le) VALUES (?, ?, ?, ?)')
  , jetonVu:       db.prepare('UPDATE jetons SET vu_le = ? WHERE hash = ?')
  , attente:       db.prepare('SELECT * FROM attentes WHERE email = ?')
  , attenteLien:   db.prepare('SELECT * FROM attentes WHERE lien = ?')
  , attenteAjout:  db.prepare('INSERT OR REPLACE INTO attentes (email, pseudo, code, lien, clique, essais, envoye, expire) VALUES (?, ?, ?, ?, 0, 0, ?, ?)')
  , attenteClic:   db.prepare('UPDATE attentes SET clique = 1 WHERE lien = ?')
  , attenteEssai:  db.prepare('UPDATE attentes SET essais = essais + 1 WHERE email = ?')
  , attenteSuppr:  db.prepare('DELETE FROM attentes WHERE email = ?')
  , attentesPurge: db.prepare('DELETE FROM attentes WHERE expire < ?')
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')
const now = () => Date.now()
const normEmail = (e) => String(e || '').trim().toLowerCase()
const validEmail = (e) => e.length <= 200 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e)
const cleanPseudo = (p) => String(p || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40)
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]))
const log = (...a) => console.log(new Date().toISOString(), ...a)

/* --- Emails --- */

const mailer = process.env.SMTP_SERVER ? nodemailer.createTransport({
    host: process.env.SMTP_SERVER, port: 587, secure: false, requireTLS: true
  , auth: {user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD}
}) : null

async function sendMail(to, subject, text){
  if ( !mailer ) { log('[email]', to, '|', subject, '\n' + text) ; return true }
  try {
    await mailer.sendMail({from: `Table d’analyse <${FROM}>`, to, subject, text})
    return true
  } catch(err) {
    log('[email] ÉCHEC', to, err.message)
    return false
  }
}

const ipCounts = new Map() // ip → {n, depuis}
function ipAllowed(ip){
  const c = ipCounts.get(ip)
  if ( !c || now() - c.depuis > 3600 * 1000 ) { ipCounts.set(ip, {n: 1, depuis: now()}) ; return true }
  return ++c.n <= EMAILS_PER_IP
}

/**
 * Code de confirmation d'une adresse (spectateur), envoyé par email avec
 * la marche à suivre. +invitation+ : {pseudo, titre} quand c'est la
 * première invitation de cette adresse.
 * @return false si un email vient déjà d'être envoyé
 */
async function sendConfirmation(email, invitation){
  const prev = sql.attente.get(email)
  if ( prev && prev.expire > now() && now() - prev.envoye < RESEND_DELAY ) return false
  const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0')
  const lien = crypto.randomBytes(16).toString('hex')
  sql.attenteAjout.run(email, null, code, lien, now(), now() + PENDING_TTL)
  const marche = `Votre code : ${code}

Pour suivre l’analyse :
1. lancez la Table d’analyse ;
2. choisissez le menu « Outils › Partage › Rejoindre… » ;
3. saisissez votre adresse (${email}) et ce code.

Vous n’aurez à saisir ce code qu’une seule fois : ensuite, le menu « Rejoindre… » suffit.

Vous n’avez pas encore la Table d’analyse ? Elle se télécharge ici :
${DOWNLOAD}`
  if ( invitation ) {
    await sendMail(email, `${invitation.pseudo} vous invite à suivre son analyse`,
`Bonjour,

${invitation.pseudo} vous invite à suivre en direct son analyse « ${invitation.titre} » dans la Table d’analyse.

${marche}

Si vous ne connaissez pas ${invitation.pseudo}, ignorez simplement ce message.
`)
  } else {
    await sendMail(email, 'Votre code — Table d’analyse',
`Bonjour,

${marche}

Si vous n’avez rien demandé, ignorez simplement ce message.
`)
  }
  return true
}

/* --- HTTP --- */

function readJson(req){
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk ; body.length > 10000 && req.destroy() })
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')) } catch(err) { reject(err) } })
    req.on('error', reject)
  })
}
function json(res, status, data){
  res.writeHead(status, {'content-type': 'application/json; charset=utf-8'})
  res.end(JSON.stringify(data))
}
function page(res, status, title, body){
  res.writeHead(status, {'content-type': 'text/html; charset=utf-8'})
  res.end(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:34em;margin:4em auto;padding:0 16px;color:#222;background:#fff;line-height:1.5}
h1{font-size:1.3em;color:#3a925e}.code{font-size:2.4em;letter-spacing:.2em;font-weight:bold;margin:.6em 0;color:#cc4870}
@media (prefers-color-scheme:dark){body{color:#ddd;background:#1c1c1c}}</style></head><body>${body}</body></html>`)
}
function clientIp(req){
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  try {
    // Analyste : jeton sans email (il n'a qu'à inviter)
    if ( req.method == 'POST' && url.pathname == '/analyste' ) {
      const e = await readJson(req)
      const pseudo = cleanPseudo(e.pseudo)
      if ( !pseudo ) return json(res, 422, {ok: false, error: 'pseudo'})
      if ( !ipAllowed(clientIp(req)) ) return json(res, 429, {ok: false, error: 'trop'})
      const id = 'analyste:' + crypto.randomBytes(9).toString('hex')
      sql.compteAjout.run(id, pseudo, now())
      const jeton = crypto.randomBytes(24).toString('hex')
      sql.jetonAjout.run(sha(jeton), id, now(), now())
      return json(res, 200, {ok: true, jeton})
    }
    // Spectateur : nouveau code demandé
    if ( req.method == 'POST' && url.pathname == '/identifier' ) {
      const e = await readJson(req)
      const email = normEmail(e.email)
      if ( !validEmail(email) ) return json(res, 422, {ok: false, error: 'email'})
      if ( !ipAllowed(clientIp(req)) ) return json(res, 429, {ok: false, error: 'trop'})
      const sent = await sendConfirmation(email)
      return json(res, 200, {ok: true, sent})
    }
    if ( req.method == 'POST' && url.pathname == '/valider' ) {
      const e = await readJson(req)
      const email = normEmail(e.email)
      const code  = String(e.code || '').replace(/\D/g, '')
      const att = sql.attente.get(email)
      if ( !att || att.expire < now() ) return json(res, 404, {ok: false, error: 'aucune'})
      if ( att.code !== code ) {
        sql.attenteEssai.run(email)
        if ( att.essais + 1 >= MAX_TRIES ) sql.attenteSuppr.run(email)
        return json(res, 403, {ok: false, error: 'code'})
      }
      sql.attenteSuppr.run(email)
      const pseudo = cleanPseudo(e.pseudo) || att.pseudo || null
      sql.compteAjout.run(email, pseudo, now())
      const jeton = crypto.randomBytes(24).toString('hex')
      sql.jetonAjout.run(sha(jeton), email, now(), now())
      const compte = sql.compte.get(email)
      log('[compte] confirmé', email)
      return json(res, 200, {ok: true, jeton, email, pseudo: compte.pseudo || ''})
    }
    if ( req.method == 'GET' && url.pathname == '/confirmer' ) {
      const att = sql.attenteLien.get(String(url.searchParams.get('l') || ''))
      if ( !att || att.expire < now() ) {
        return page(res, 404, 'Lien expiré', `<h1>Lien expiré</h1><p>Ce lien n’est plus valable. Demandez un nouvel email depuis la Table d’analyse (menu Outils › Partage › Rejoindre…).</p>`)
      }
      sql.attenteClic.run(att.lien)
      return page(res, 200, 'Votre code', `<h1>Adresse confirmée</h1>
<p>Saisissez ce code dans la Table d’analyse (menu <b>Outils › Partage › Rejoindre…</b>), avec votre adresse <b>${esc(att.email)}</b> :</p>
<div class="code">${esc(att.code)}</div>
<p>Vous n’aurez à le faire qu’une seule fois.</p>
<p>Pas encore de Table d’analyse ? <a href="${DOWNLOAD}">Téléchargez-la ici</a>.</p>`)
    }
    if ( req.method == 'GET' && url.pathname == '/' ) {
      return page(res, 200, 'Partage — Table d’analyse', `<h1>Partage de la Table d’analyse</h1><p>Ce service relaie les analyses partagées depuis la <a href="${DOWNLOAD}">Table d’analyse</a>.</p>`)
    }
    json(res, 404, {ok: false})
  } catch(err) {
    log('[http] ERREUR', err.message)
    json(res, 400, {ok: false, error: 'requete'})
  }
})

/* --- Partages (en mémoire) --- */

/**
 * share = {id, owner (email), pseudo, titre, invites: Set, files: Map
 *          path → base64, size, view, ownerWs, followers: Set<ws>,
 *          absentTimer, controller (ws du spectateur qui a la main, ou
 *          null : l'analyste), requests: Map email → ws (demandes de
 *          la main)}
 *
 * La main (issue #221) : un spectateur la demande (ask), l'analyste
 * l'accorde (grant) ou la refuse (deny), puis la reprend (takeback).
 * Celui qui a la main envoie les fichiers et la partie visible ; les
 * autres (analyste compris) les reçoivent.
 */
const shares = new Map()
const sockets = new Set()   // ws identifiés : ws.email
let totalSize = 0

const send = (ws, msg) => ws && ws.readyState === 1 && ws.send(JSON.stringify(msg))

function validPath(p){
  return typeof p == 'string' && p.length < 300 && /^[\w.\- ()À-ÿ]+(\/[\w.\- ()À-ÿ]+)*$/u.test(p) && !p.split('/').some(s => s == '..' || s == '.')
}

function sendCount(share){
  const connected = [...share.followers].filter(ws => ws.readyState === 1).length
  send(share.ownerWs, {type: 'count', id: share.id, connected, invited: share.invites.size})
}

function invitationOf(share){
  return {type: 'invitation', id: share.id, pseudo: share.pseudo, titre: share.titre}
}

// Invitations des adresses +emails+ : notification si leur application
// est ouverte, email de confirmation si l'adresse est inconnue
function invite(share, emails){
  for ( const raw of emails ) {
    const email = normEmail(raw)
    if ( !validEmail(email) || email == share.owner || share.invites.has(email) ) continue
    if ( share.invites.size >= MAX_INVITES ) break
    share.invites.add(email)
    // Première invitation : email du code (sinon « Rejoindre… » suffit)
    sql.compte.get(email) || sendConfirmation(email, {pseudo: share.pseudo, titre: share.titre})
  }
  sendCount(share)
}

function endShare(share, raison){
  share.requests.clear()
  for ( const ws of share.followers ) { send(ws, {type: 'end', id: share.id, raison}) ; ws.following = null }
  for ( const ws of sockets ) ws.email && share.invites.has(ws.email) && !share.followers.has(ws) && send(ws, {type: 'withdrawn', id: share.id})
  clearTimeout(share.absentTimer)
  totalSize -= share.size
  shares.delete(share.id)
  log('[partage] fin', share.id, raison)
}

function storeFile(share, rel, data){
  const old = share.files.get(rel)
  const delta = data.length - (old ? old.length : 0)
  if ( share.size + delta > SHARE_MAX || totalSize + delta > TOTAL_MAX ) return false
  share.files.set(rel, data)
  share.size += delta ; totalSize += delta
  return true
}

function removeFile(share, rel){
  const old = share.files.get(rel)
  if ( !old ) return
  share.files.delete(rel)
  share.size -= old.length ; totalSize -= old.length
}

function sendSnapshot(share, ws){
  send(ws, {type: 'begin', id: share.id, pseudo: share.pseudo, titre: share.titre, count: share.files.size})
  for ( const [rel, data] of share.files ) send(ws, {type: 'file', id: share.id, path: rel, data})
  send(ws, {type: 'ready', id: share.id})
  share.view && send(ws, {type: 'view', id: share.id, view: share.view})
  share.ownerWs || send(ws, {type: 'owner', id: share.id, present: false})
}

const ownShare = (ws, id) => {
  const share = shares.get(id)
  return share && share.owner == ws.email && share.ownerWs === ws ? share : null
}
// Partage dont +ws+ a la main (analyste, ou spectateur à qui elle est donnée)
const controlShare = (ws, id) => {
  const share = shares.get(id)
  if ( !share ) return null
  if ( share.controller ) return share.controller === ws ? share : null
  return share.ownerWs === ws ? share : null
}
// Destinataires des envois de celui qui a la main
function receivers(share, sender){
  return [share.ownerWs, ...share.followers].filter(w => w && w !== sender)
}
function pseudoOf(ws){
  const c = ws && ws.email && sql.compte.get(ws.email)
  return (c && c.pseudo) || (ws && ws.email) || ''
}
// Main rendue à l'analyste
function giveBack(share){
  if ( !share.controller ) return
  const prev = share.controller
  share.controller = null
  send(prev, {type: 'control', id: share.id, on: false})
  send(share.ownerWs, {type: 'control', id: share.id, on: true})
  for ( const f of share.followers ) f !== prev && send(f, {type: 'controller', id: share.id, pseudo: null})
}
// Demandes de la main abandonnées (main accordée, partage fini…)
function clearRequests(share, except){
  for ( const [email, w] of share.requests ) {
    if ( w !== except ) send(w, {type: 'askClosed', id: share.id})
    send(share.ownerWs, {type: 'requestClosed', id: share.id, email})
  }
  share.requests.clear()
}

const handlers = {

  hello(ws, {jeton}){
    const row = jeton && sql.jeton.get(sha(jeton))
    if ( !row ) { send(ws, {type: 'error', code: 'jeton'}) ; return ws.close() }
    sql.jetonVu.run(now(), row.hash)
    ws.email = row.email
    const compte = sql.compte.get(row.email)
    sockets.add(ws)
    send(ws, {type: 'welcome', email: row.email, pseudo: (compte && compte.pseudo) || ''})
  },

  // Pseudo de l'analyste (choisi à la première invitation)
  pseudo(ws, {pseudo}){
    const p = cleanPseudo(pseudo)
    p && sql.compteAjout.run(ws.email, p, now())
  },

  start(ws, {titre, invites}){
    for ( const share of shares.values() ) share.owner == ws.email && endShare(share, 'stop')
    const compte = sql.compte.get(ws.email)
    const share = {
        id: crypto.randomBytes(9).toString('base64url'), owner: ws.email
      , pseudo: (compte && compte.pseudo) || ws.email
      , titre: String(titre || '').slice(0, 200), invites: new Set(), files: new Map(), size: 0
      , view: null, ownerWs: ws, followers: new Set(), absentTimer: null
      , controller: null, requests: new Map()
    }
    shares.set(share.id, share)
    ws.sharing = share.id
    send(ws, {type: 'started', id: share.id})
    log('[partage] début', share.id, ws.email)
    invite(share, Array.isArray(invites) ? invites : [])
  },

  invite(ws, {id, invites}){
    const share = ownShare(ws, id)
    share && invite(share, Array.isArray(invites) ? invites : [])
  },

  // Analyste reconnecté (moins d'une heure d'absence)
  resume(ws, {id}){
    const share = shares.get(id)
    if ( !share || share.owner != ws.email ) return send(ws, {type: 'gone', id})
    clearTimeout(share.absentTimer)
    share.ownerWs = ws
    ws.sharing = id
    send(ws, {type: 'resumed', id})
    for ( const f of share.followers ) send(f, {type: 'owner', id, present: true})
    if ( share.controller ) {
      // Modifications faites pendant l'absence de l'analyste
      send(ws, {type: 'control', id, on: false, pseudo: pseudoOf(share.controller)})
      for ( const [rel, data] of share.files ) send(ws, {type: 'file', id, path: rel, data})
      send(ws, {type: 'saved', id})
    }
    for ( const [email, w] of share.requests ) send(ws, {type: 'request', id, email, pseudo: pseudoOf(w)})
    sendCount(share)
  },

  file(ws, {id, path: rel, data}){
    const share = controlShare(ws, id)
    if ( !share || !validPath(rel) || typeof data != 'string' ) return
    if ( !storeFile(share, rel, data) ) return send(ws, {type: 'error', code: 'taille'})
    for ( const f of receivers(share, ws) ) send(f, {type: 'file', id, path: rel, data})
  },

  remove(ws, {id, path: rel}){
    const share = controlShare(ws, id)
    if ( !share || !validPath(rel) ) return
    removeFile(share, rel)
    for ( const f of receivers(share, ws) ) send(f, {type: 'remove', id, path: rel})
  },

  saved(ws, {id}){
    const share = controlShare(ws, id)
    share && receivers(share, ws).forEach(f => send(f, {type: 'saved', id}))
  },

  view(ws, {id, view}){
    const share = controlShare(ws, id)
    if ( !share || !view || typeof view != 'object' ) return
    share.view = {x: Number(view.x) || 0, y: Number(view.y) || 0, w: Number(view.w) || 0, h: Number(view.h) || 0}
    for ( const f of receivers(share, ws) ) send(f, {type: 'view', id, view: share.view})
  },

  // Spectateur : demande de la main
  ask(ws, {id}){
    const share = shares.get(id)
    if ( !share || !share.followers.has(ws) || share.controller === ws ) return
    share.requests.set(ws.email, ws)
    send(share.ownerWs, {type: 'request', id, email: ws.email, pseudo: pseudoOf(ws)})
  },

  // Analyste : main accordée (les autres demandes sont abandonnées)
  grant(ws, {id, email}){
    const share = ownShare(ws, id)
    const target = share && share.requests.get(email)
    if ( !target || !share.followers.has(target) ) return
    clearRequests(share, target)
    if ( share.controller ) send(share.controller, {type: 'control', id, on: false})
    share.controller = target
    const pseudo = pseudoOf(target)
    send(target, {type: 'control', id, on: true})
    send(ws, {type: 'control', id, on: false, pseudo})
    for ( const f of share.followers ) f !== target && send(f, {type: 'controller', id, pseudo})
  },

  deny(ws, {id, email}){
    const share = ownShare(ws, id)
    const target = share && share.requests.get(email)
    if ( !target ) return
    share.requests.delete(email)
    send(target, {type: 'denied', id})
  },

  // Analyste : main reprise
  takeback(ws, {id}){
    const share = ownShare(ws, id)
    share && giveBack(share)
  },

  stop(ws, {id}){
    const share = ownShare(ws, id)
    if ( share ) { endShare(share, 'stop') ; ws.sharing = null }
  },

  accept(ws, {id}){
    const share = shares.get(id)
    if ( !share || !share.invites.has(ws.email) ) return send(ws, {type: 'gone', id})
    if ( ws.following && ws.following != id ) leave(ws)
    const already = share.followers.has(ws)
    share.followers.add(ws)
    ws.following = id
    sendSnapshot(share, ws)
    // Confirmation de la participation, pour l'analyste
    already || send(share.ownerWs, {type: 'joined', id, email: ws.email, pseudo: pseudoOf(ws)})
    sendCount(share)
  },

  leave(ws){ leave(ws) },

  // Partages en cours où l'utilisateur est invité (menu « Rejoindre »)
  list(ws){
    const list = [...shares.values()].filter(s => s.invites.has(ws.email)).map(s => ({id: s.id, pseudo: s.pseudo, titre: s.titre}))
    send(ws, {type: 'list', shares: list})
  }
}

function leave(ws){
  const share = ws.following && shares.get(ws.following)
  ws.following = null
  if ( !share ) return
  share.followers.delete(ws)
  if ( share.requests.get(ws.email) === ws ) {
    share.requests.delete(ws.email)
    send(share.ownerWs, {type: 'requestClosed', id: share.id, email: ws.email})
  }
  // Celui qui avait la main s'en va : elle revient à l'analyste
  share.controller === ws && giveBack(share)
  sendCount(share)
}

function onClose(ws){
  sockets.delete(ws)
  leave(ws)
  const share = ws.sharing && shares.get(ws.sharing)
  if ( share && share.ownerWs === ws ) {
    share.ownerWs = null
    for ( const f of share.followers ) send(f, {type: 'owner', id: share.id, present: false})
    share.absentTimer = setTimeout(() => endShare(share, 'absent'), ABSENCE_MAX)
  }
}

const wss = new WebSocketServer({server, path: '/ws', maxPayload: MAX_PAYLOAD})
wss.on('connection', (ws) => {
  ws.alive = true
  ws.on('pong', () => { ws.alive = true })
  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch(err) { return }
    if ( !msg || typeof msg.type != 'string' || !handlers.hasOwnProperty(msg.type) ) return
    if ( msg.type != 'hello' && !ws.email ) return
    try { handlers[msg.type](ws, msg) } catch(err) { log('[ws] ERREUR', msg.type, err.message) }
  })
  ws.on('close', () => onClose(ws))
  ws.on('error', () => {})
})

// Connexions mortes coupées ; attentes expirées effacées
setInterval(() => {
  for ( const ws of wss.clients ) {
    if ( !ws.alive ) { ws.terminate() ; continue }
    ws.alive = false
    ws.ping()
  }
}, 30 * 1000)
setInterval(() => sql.attentesPurge.run(now()), 3600 * 1000)

server.listen(PORT, HOST, () => log(`ta-partage à l'écoute sur ${HOST}:${PORT}`))
