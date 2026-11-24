// Exposants « ^…^ » (#236) : renderer/js/lib/exposants.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { supize, plainSup } from '../../renderer/js/lib/exposants.js'

test('« ^…^ » → <sup>', () => {
  assert.equal(supize('1^er^ mouvement'), '1<sup>er</sup> mouvement')
  assert.equal(supize('2^e^ partie, XIX^e^ siècle'), '2<sup>e</sup> partie, XIX<sup>e</sup> siècle')
  assert.equal(supize('II^nde^'), 'II<sup>nde</sup>')
  assert.equal(supize('a^bc^d^ef^'), 'a<sup>bc</sup>d<sup>ef</sup>')
})
test('ancienne écriture sans « ^ » final', () => {
  assert.equal(supize('1^er mouvement'), '1<sup>er</sup> mouvement')
  assert.equal(supize('2^e partie'), '2<sup>e</sup> partie')
  assert.equal(supize('2^de'), '2<sup>de</sup>')
  assert.equal(supize('a^equipe'), 'a^equipe', 'pas au milieu d’un mot')
})
test('sans exposant : inchangé', () => {
  for ( const s of ['Exposition', 'V7', 'a ^ b', '^', '', '1^^'] ) assert.equal(supize(s), s, s)
  assert.equal(supize(null), null)
})
test('texte brut : « ^ » retirés', () => {
  assert.equal(plainSup('1^er^ mouvement'), '1er mouvement')
  assert.equal(plainSup('2^e partie'), '2e partie')
  assert.equal(plainSup('Exposition'), 'Exposition')
})

test('export HTML : page de titre avec exposants, titre de page sans « ^ »', async () => {
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path')
  const { exportToHtml } = await import('../../main/exportHtml.js')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-exp-'))
  try {
    const file = exportToHtml({exportFolder: dir, infos: {piece_title: 'Sonate', composer: 'X', analyse_title: '1^er^ mouvement', analyst: 'Phil'}}, '<p>code</p>')
    const html = fs.readFileSync(file, 'utf8')
    assert.match(html, /1<sup>er<\/sup> mouvement/)
    assert.match(html, /<title>Analyse Sonate<\/title>/)
  } finally { fs.rmSync(dir, {recursive: true, force: true}) }
})
