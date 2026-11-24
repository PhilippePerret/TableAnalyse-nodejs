// Serveur de partage à distance (serveur/ta-partage, #220) : comptes
// (HTTP) et partage en direct (WebSocket), sur une base temporaire
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const DIR  = path.join(import.meta.dirname, '..', '..', 'serveur', 'ta-partage')
const WebSocket = createRequire(path.join(DIR, 'server.js'))('ws')
const PORT = 18000 + Math.floor(Math.random() * 2000)
const BASE = `http://127.0.0.1:${PORT}`
let server, tmp, logs = ''

const post = async (p, body) => {
  const r = await fetch(BASE + p, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
  return {status: r.status, data: await r.json()}
}
const wait = ms => new Promise(r => setTimeout(r, ms))
// Client WebSocket : messages reçus en file, next(type) attend le suivant
// de ce type
const client = () => new Promise((resolve, reject) => {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`)
  const box = [], waiters = []
  ws.on('message', raw => {
    const msg = JSON.parse(String(raw))
    const i = waiters.findIndex(w => w.type == msg.type)
    if ( i >= 0 ) waiters.splice(i, 1)[0].resolve(msg) ; else box.push(msg)
  })
  ws.send_ = msg => ws.send(JSON.stringify(msg))
  ws.next = (type, ms = 3000) => {
    const i = box.findIndex(m => m.type == type)
    if ( i >= 0 ) return Promise.resolve(box.splice(i, 1)[0])
    return new Promise((res, rej) => {
      const w = {type, resolve: res}
      waiters.push(w)
      setTimeout(() => { const k = waiters.indexOf(w) ; k >= 0 && (waiters.splice(k, 1), rej(new Error(`message « ${type} » non reçu`))) }, ms)
    })
  }
  ws.none = (type) => !box.some(m => m.type == type)
  ws.on('open', () => resolve(ws)) ; ws.on('error', reject)
})
const codeOf = async email => {
  for ( let i = 0 ; i < 40 ; ++i ) {
    const all = [...logs.matchAll(new RegExp(`${email.replace('.', '\\.')}[^\\n]*\\n[\\s\\S]*?(?:code|Votre code :) (\\d{6})`, 'g'))]
    if ( all.length ) return all[all.length - 1][1]
    await wait(50)
  }
  throw new Error('code non trouvé dans le journal')
}

before(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-partage-'))
  server = spawn(process.execPath, ['--no-warnings', 'server.js'], {cwd: DIR, env: Object.assign({}, process.env, {PORT: String(PORT), IP: '127.0.0.1', TA_PARTAGE_DB: path.join(tmp, 'p.sqlite'), SMTP_SERVER: ''})})
  server.stdout.on('data', d => logs += d) ; server.stderr.on('data', d => logs += d)
  for ( let i = 0 ; i < 50 ; ++i ) { try { await fetch(BASE + '/') ; return } catch(e) { await wait(100) } }
  throw new Error('serveur non démarré : ' + logs)
})
after(() => { server && server.kill() ; fs.rmSync(tmp, {recursive: true, force: true}) })

let jetonA, jetonS
const SPEC = 'spectateur@exemple.fr'

test('page d’accueil et adresse inconnue', async () => {
  assert.equal((await fetch(BASE + '/')).status, 200)
  assert.equal((await fetch(BASE + '/inconnue')).status, 404)
})

test('analyste : jeton sans email (pseudo obligatoire)', async () => {
  assert.equal((await post('/analyste', {pseudo: ''})).status, 422)
  const r = await post('/analyste', {pseudo: 'Phil'})
  assert.equal(r.status, 200)
  assert.match(r.data.jeton, /^[0-9a-f]{48}$/)
  jetonA = r.data.jeton
})

test('spectateur : code par email, refus d’un mauvais code, jeton', async () => {
  assert.equal((await post('/identifier', {email: 'pas-une-adresse'})).status, 422)
  const r = await post('/identifier', {email: SPEC})
  assert.equal(r.status, 200)
  assert.equal(r.data.sent, true)
  const code = await codeOf(SPEC)
  const bad = code == '000000' ? '111111' : '000000'
  assert.equal((await post('/valider', {email: SPEC, code: bad})).status, 403)
  const ok = await post('/valider', {email: SPEC, code, pseudo: 'Élève'})
  assert.equal(ok.status, 200)
  assert.equal(ok.data.email, SPEC)
  jetonS = ok.data.jeton
  assert.equal((await post('/valider', {email: SPEC, code})).status, 404, 'code déjà utilisé')
})

test('WebSocket : jeton invalide refusé', async () => {
  const ws = await client()
  ws.send_({type: 'hello', jeton: 'faux'})
  assert.equal((await ws.next('error')).code, 'jeton')
  ws.close()
})

test('partage en direct : invitation, liste, arrivée, fichiers, vue, main, message, fin', async () => {
  const A = await client(), S = await client(), X = await client()
  A.send_({type: 'hello', jeton: jetonA}) ; await A.next('welcome')
  const w = (S.send_({type: 'hello', jeton: jetonS}), await S.next('welcome'))
  assert.equal(w.email, SPEC)
  // Début du partage avec un fichier
  A.send_({type: 'start', titre: 'Sonate', invites: [SPEC, 'pas-une-adresse']})
  const {id} = await A.next('started')
  assert.equal((await A.next('count')).type, 'count')
  const b64 = s => Buffer.from(s).toString('base64')
  A.send_({type: 'file', id, path: 'analyse_tags.yaml', data: b64('- id: 1')})
  A.send_({type: 'file', id, path: '../evasion', data: b64('x')})
  await wait(100)
  // Liste des partages proposés au spectateur
  S.send_({type: 'list'})
  const list = await S.next('list')
  assert.deepEqual(list.shares.map(s => [s.id, s.pseudo, s.titre]), [[id, 'Phil', 'Sonate']])
  // Arrivée : contenu complet
  S.send_({type: 'accept', id})
  const begin = await S.next('begin')
  assert.equal(begin.count, 1, 'un seul fichier (chemin hors du dossier refusé)')
  const f = await S.next('file')
  assert.deepEqual([f.path, Buffer.from(f.data, 'base64').toString()], ['analyse_tags.yaml', '- id: 1'])
  await S.next('ready')
  const joined = await A.next('joined')
  assert.equal(joined.email, SPEC)
  // Modifications relayées
  A.send_({type: 'file', id, path: 'analyse_tags.yaml', data: b64('- id: 2')})
  assert.equal(Buffer.from((await S.next('file')).data, 'base64').toString(), '- id: 2')
  A.send_({type: 'saved', id}) ; await S.next('saved')
  A.send_({type: 'view', id, view: {x: 1, y: 200, w: 800, h: 600}})
  assert.deepEqual((await S.next('view')).view, {x: 1, y: 200, w: 800, h: 600})
  // Message de l'analyste
  A.send_({type: 'say', id, text: 'Regardez la mesure 12'})
  assert.equal((await S.next('said')).text, 'Regardez la mesure 12')
  // La main : demande, refus, demande, don, reprise
  S.send_({type: 'ask', id}) ; assert.equal((await A.next('request')).email, SPEC)
  A.send_({type: 'deny', id, email: SPEC}) ; await S.next('denied')
  S.send_({type: 'ask', id}) ; await A.next('request')
  A.send_({type: 'grant', id, email: SPEC})
  assert.equal((await S.next('control')).on, true, 'main donnée au spectateur')
  assert.equal((await A.next('control')).on, false)
  S.send_({type: 'file', id, path: 'preferences.yaml', data: b64('theme: normal')})
  assert.equal((await A.next('file')).path, 'preferences.yaml', 'fichier du spectateur reçu par l’analyste')
  A.send_({type: 'takeback', id})
  assert.equal((await S.next('control')).on, false, 'main reprise')
  // Personne d'autre ne peut rejoindre (non invité)
  const r = await post('/analyste', {pseudo: 'Intrus'})
  X.send_({type: 'hello', jeton: r.data.jeton}) ; await X.next('welcome')
  X.send_({type: 'accept', id})
  assert.equal((await X.next('gone')).id, id, 'non invité : refusé')
  // Fin du partage
  A.send_({type: 'stop', id})
  assert.equal((await S.next('end')).raison, 'stop')
  S.send_({type: 'list'})
  assert.deepEqual((await S.next('list')).shares, [], 'plus aucun partage proposé')
  ;[A, S, X].forEach(ws => ws.close())
})
