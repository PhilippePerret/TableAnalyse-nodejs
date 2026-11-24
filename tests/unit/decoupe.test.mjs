// Découpe d'une partition PDF en systèmes (bin/decoupe-partition) sur
// tests/fixtures/partition/partition.pdf (2 pages, 6 systèmes de 2 portées
// par page, 72 mesures)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import * as yaml from 'js-yaml'

const ROOT = path.join(import.meta.dirname, '..', '..')
const PDF  = path.join(ROOT, 'tests', 'fixtures', 'partition', 'partition.pdf')
const ELECTRON = path.join(ROOT, 'node_modules', '.bin', 'electron')
const cut = (...args) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-decoupe-'))
  const res = spawnSync(ELECTRON, [path.join(ROOT, 'main', 'cutter', 'cli.js'), PDF, '--out', out, ...args], {encoding: 'utf8', timeout: 120000})
  return {out, res, log: res.stdout + res.stderr}
}
// Largeur et hauteur d'un JPG (marqueur SOF)
const jpgSize = file => {
  const b = fs.readFileSync(file)
  for ( let i = 2 ; i < b.length ; ) {
    const marker = b[i + 1], len = b.readUInt16BE(i + 2)
    if ( marker >= 0xC0 && marker <= 0xC3 ) return {height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7)}
    i += 2 + len
  }
}

test('découpe : 12 systèmes, numéros de mesure 1 à 72', () => {
  const {out, res, log} = cut()
  try {
    assert.equal(res.status, 0, log)
    assert.match(log, /Page 1\/2 : 12 portées, 6 systèmes/)
    assert.match(log, /Page 2\/2 : 12 portées, 6 systèmes/)
    const files = fs.readdirSync(out).sort()
    const images = files.filter(f => /^system-\d{3}\.jpg$/.test(f))
    assert.equal(images.length, 12, 'images des systèmes')
    assert.ok(files.includes('mesures.yaml'), 'fichier des mesures')
    for ( const img of images ) {
      const {width, height} = jpgSize(path.join(out, img))
      assert.ok(width > 2000 && height > 200 && width > 3 * height, `${img} : ${width}×${height}`)
    }
    const mesures = yaml.load(fs.readFileSync(path.join(out, 'mesures.yaml'), 'utf8'))
    assert.equal(mesures.length, 12, 'un bloc par système')
    assert.deepEqual(mesures.map(m => m.image), images, 'images dans l’ordre')
    const numbers = mesures.flatMap(m => m.measures.map(x => x.number))
    assert.deepEqual(numbers, Array.from({length: 72}, (_, i) => i + 1), 'numéros 1 à 72')
    for ( const m of mesures ) {
      const xs = m.measures.map(x => x.x)
      assert.ok(xs.every((x, i) => i == 0 || x > xs[i - 1]), `${m.image} : mesures de gauche à droite`)
      assert.ok(xs.every(x => x > 0 && x < m.width) && m.end <= m.width, `${m.image} : abscisses dans l’image`)
    }
  } finally { fs.rmSync(out, {recursive: true, force: true}) }
})

test('découpe : nombre de portées imposé (--staves 4)', () => {
  const {out, res, log} = cut('--staves', '4')
  try {
    assert.equal(res.status, 0, log)
    const images = fs.readdirSync(out).filter(f => /^system-\d{3}\.jpg$/.test(f))
    assert.equal(images.length, 6, 'systèmes de 4 portées')
  } finally { fs.rmSync(out, {recursive: true, force: true}) }
})

test('découpe : fichier absent → erreur', () => {
  const res = spawnSync(ELECTRON, [path.join(ROOT, 'main', 'cutter', 'cli.js'), '/nexiste/pas.pdf'], {encoding: 'utf8', timeout: 60000})
  assert.notEqual(res.status, 0)
  assert.match(res.stdout + res.stderr, /introuvable/)
})
