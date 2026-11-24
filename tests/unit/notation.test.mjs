// Conversion des notes des accords batave ⇄ italienne (renderer/js/lib/notation.js)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toBatave, toItalian, TEXT_ITALIAN_NOTES, bataveOf } from '../../renderer/js/lib/notation.js'

const IT = {doIsC: true}, BAT = {doIsC: false}

test('entrée italienne → batave (toute casse)', () => {
  const cases = {
    'Fam75-': 'Fm75-', 'fam75-': 'Fm75-', 'FAm75-': 'Fm75-', 'Solm7M': 'Gm7M', 'solm7': 'Gm7',
    'Ré': 'D', 'RÉ': 'D', 'ré7': 'D7', 're-': 'D-', 'Re+m': 'D+m', 'Mim': 'Em', 'la': 'A', 'Si-m': 'B-m',
    'Lamaj7': 'Amaj7', 'Do': 'C', 'do7': 'C7', 'DO': 'C', 'Doo/': 'Co/', 'Do/': 'C/',
    'mi7 la7': 'E7 A7', '(Sol)': '(G)', 'La --': 'A --', 'ré7 --': 'D7 --',
  }
  for ( const [it, bat] of Object.entries(cases) ) assert.equal(toBatave(it, IT), bat, it)
})

test('basse après « / » : casse gardée', () => {
  assert.equal(toBatave('sol/mi', IT), 'G/e')
  assert.equal(toBatave('Sol/Mi', IT), 'G/E')
  assert.equal(toBatave('Sol/mi', IT), 'G/e')
  assert.equal(toBatave('Fa/la', IT), 'F/a')
  assert.equal(toBatave('do/sol', IT), 'C/g')
})

test('entrée batave : « Do » reste Ré + o, le reste est converti', () => {
  assert.equal(toBatave('Do/', BAT), 'Do/')
  assert.equal(toBatave('do7', BAT), 'do7')
  assert.equal(toBatave('Doo/', BAT), 'Doo/')
  assert.equal(toBatave('sol/mi', BAT), 'G/e')
  assert.equal(toBatave('Fam75-', BAT), 'Fm75-')
})

test('batave inchangé par la conversion', () => {
  for ( const bat of ['C', 'C7', 'Fm75-', 'Gm7M', 'G/e', 'G/E', 'B-m', 'C+7M', 'D7-', 'Am75-', 'Bb', 'A --', 'e7', 'V', 'II**'] ) {
    assert.equal(toBatave(bat, IT), bat, bat)
  }
})

test('mots qui ne sont pas des notes', () => {
  for ( const s of ['Sol mineur', 'mineur', 'Sib', 'sol#', 'Solo', 'Silence', 'Lamento', 'domaine', 'fade', 'Domino', 'Lamaj7'] ) {
    const exp = {'Sol mineur': 'G mineur', 'Solo': 'Go', 'Lamaj7': 'Amaj7'}[s] || s
    assert.equal(toBatave(s, IT), exp, s)
  }
})

test('batave → italien (champ d’édition)', () => {
  assert.equal(toItalian('C'), 'Do')
  assert.equal(toItalian('G/e'), 'Sol/mi')
  assert.equal(toItalian('G/E'), 'Sol/Mi')
  assert.equal(toItalian('Fm75-'), 'Fam75-')
  assert.equal(toItalian('C7 G7'), 'Do7 Sol7')
  assert.equal(toItalian('e7'), 'e7', 'minuscule en tête : note, laissée')
  assert.equal(toItalian('C', BAT), 'C')
  assert.equal(toItalian('C/c', BAT), 'C/c')
})

test('aller-retour exact batave → italien → batave', () => {
  const bats = ['C', 'Do7', 'G/e', 'G/E', 'e7', 'Am', 'F/a', 'B-', 'Bb', 'C7 G7', 'D7-', 'Do/', '(G)', 'A --', 'C/c', 'Gm7M', 'C+7M']
  for ( const o of [IT, BAT] ) for ( const b of bats ) assert.equal(toBatave(toItalian(b, o), o), b, `${b} ${JSON.stringify(o)}`)
})

test('notes italiennes dans un texte libre', () => {
  const f = t => t.replace(TEXT_ITALIAN_NOTES, (a, n, alt, num) => `<${bataveOf(n)}${alt}${num || ''}>`)
  assert.equal(f('Passage en Sol majeur.'), 'Passage en <G> majeur.')
  assert.equal(f('puis Ré7 et Fa-m.'), 'puis <D7> et <F-m>.')
  assert.equal(f('sol et fa ignorés, SOL aussi'), 'sol et fa ignorés, SOL aussi')
  assert.equal(f('La mélodie en La, puis Si.'), 'La mélodie en <A>, puis <B>.')
  assert.equal(f('Si tu veux. Si on passe en Si-m'), 'Si tu veux. Si on passe en <B-m>')
  assert.equal(f('Fin.__RET__La suite'), 'Fin.__RET__La suite')
  assert.equal(f('Sol majeur en tête'), '<G> majeur en tête')
  assert.equal(f('Mineur, Solo, Silence'), 'Mineur, Solo, Silence')
})
