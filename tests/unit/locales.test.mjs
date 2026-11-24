// Localisation : chaque langue a toutes les clés du français (référence),
// aucune clé en trop, et les mêmes variables %{…} dans chaque texte
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import * as yaml from 'js-yaml'

const DIR   = path.join(import.meta.dirname, '..', '..', 'locales')
const LANGS = fs.readdirSync(DIR).filter(d => fs.statSync(path.join(DIR, d)).isDirectory())
const FILES = ['ui', 'messages', 'errors']

const flat = (o, pre = '', out = {}) => {
  for ( const [k, v] of Object.entries(o || {}) ) {
    const key = pre ? `${pre}.${k}` : k
    if ( v && typeof v == 'object' && !Array.isArray(v) ) flat(v, key, out)
    else out[key] = v
  }
  return out
}
const load = (lang, file) => flat(yaml.load(fs.readFileSync(path.join(DIR, lang, `${file}.yaml`), 'utf8')))
const vars = s => [...String(s).matchAll(/%\{(\w+)\}/g)].map(m => m[1]).sort().join(',')

test('les 8 langues sont présentes', () => {
  assert.deepEqual(LANGS.sort(), ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'zh'])
})

for ( const file of FILES ) {
  const ref = load('fr', file)
  for ( const lang of LANGS.filter(l => l != 'fr') ) {
    test(`${lang}/${file}.yaml : mêmes clés et mêmes variables que fr`, () => {
      const loc = load(lang, file)
      const missing = Object.keys(ref).filter(k => !(k in loc))
      const extra   = Object.keys(loc).filter(k => !(k in ref))
      assert.deepEqual(missing, [], `clés manquantes`)
      assert.deepEqual(extra, [], `clés en trop`)
      const badVars = Object.keys(ref).filter(k => k in loc && vars(ref[k]) != vars(loc[k]))
      assert.deepEqual(badVars, [], `variables %{…} différentes`)
    })
  }
}

// Toute clé écrite en dur dans le code, t('ui.xxx'), existe en français
// (clé ou branche). Les clés construites (`ui.${x}`) ne sont pas vérifiées.
test('clés utilisées dans le code présentes dans fr', () => {
  const ROOT = path.join(DIR, '..')
  const ref = {}
  for ( const file of FILES ) Object.assign(ref, ...Object.keys(load('fr', file)).map(k => ({[`${file == 'ui' ? 'ui' : file}.${k}`]: 1})))
  const keys = Object.keys(ref)
  const exists = k => ref[k] || keys.some(r => r.startsWith(k + '.'))
  const jsFiles = []
  const walk = d => fs.readdirSync(d).forEach(f => {
    const p = path.join(d, f)
    if ( fs.statSync(p).isDirectory() ) walk(p)
    else if ( /\.(m?js|cjs)$/.test(f) && f != 'Manuel_AppData.js' ) jsFiles.push(p)
  })
  walk(path.join(ROOT, 'renderer', 'js')) ; walk(path.join(ROOT, 'main'))
  const missing = []
  for ( const p of jsFiles ) {
    const code = fs.readFileSync(p, 'utf8')
    for ( const m of code.matchAll(/\bt\(\s*['"]((?:ui|messages|errors)\.[\w.]+)['"]/g) ) {
      if ( !exists(m[1]) ) missing.push(`${path.relative(ROOT, p)} : ${m[1]}`)
    }
  }
  assert.deepEqual([...new Set(missing)], [])
})
