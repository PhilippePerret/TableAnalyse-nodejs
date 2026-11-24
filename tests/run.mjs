#!/usr/bin/env node
/*
 * Suite de tests de l'application
 * -------------------------------
 *   npm test                    tous les tests
 *   npm test -- notation alt    seulement les fichiers dont le nom contient
 *                               « notation » ou « alt »
 *
 * 1. Tests unitaires (tests/unit/*.test.mjs) : node --test.
 * 2. Tests de l'application (tests/app/*.test.js) : pour chaque fichier,
 *    l'application est lancée sans fenêtre (lancement de contrôle) sur une
 *    COPIE de l'analyse tests/fixtures/analyse-base (ou de celle nommée en
 *    tête du fichier par « // fixture: <nom> »). Le harnais
 *    (tests/app/_harness.js) joue les tests dans le renderer et renvoie
 *    les résultats. Toute erreur de la console du renderer fait échouer
 *    le fichier.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT     = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const TESTS    = path.join(ROOT, 'tests')
const FILTERS  = process.argv.slice(2)
const TIMEOUT  = 120 // secondes par fichier de l'application
const ELECTRON = path.join(ROOT, 'node_modules', '.bin', 'electron')

const match  = f => !FILTERS.length || FILTERS.some(x => f.includes(x))
const RED = s => `\x1b[31m${s}\x1b[0m`, GREEN = s => `\x1b[32m${s}\x1b[0m`, BOLD = s => `\x1b[1m${s}\x1b[0m`

let failedFiles = 0, totalChecks = 0, totalTests = 0, failedTests = 0

/* --- 1. Tests unitaires --- */
const units = fs.readdirSync(path.join(TESTS, 'unit')).filter(f => f.endsWith('.test.mjs') && match(f)).sort()
if ( units.length ) {
  console.log(BOLD('\n== Tests unitaires'))
  const res = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...units.map(f => path.join(TESTS, 'unit', f))], {stdio: 'inherit'})
  if ( res.status !== 0 ) { failedFiles++ ; console.log(RED('ÉCHEC des tests unitaires')) }
}

/* --- 2. Tests de l'application --- */
const apps = fs.readdirSync(path.join(TESTS, 'app')).filter(f => f.endsWith('.test.js') && match(f)).sort()
if ( apps.length ) console.log(BOLD('\n== Tests de l’application'))
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-tests-'))
const harness = fs.readFileSync(path.join(TESTS, 'app', '_harness.js'), 'utf8')

for ( const file of apps ) {
  const code    = fs.readFileSync(path.join(TESTS, 'app', file), 'utf8')
  const fixture = (code.match(/^\/\/ fixture: (\S+)/m) || [])[1] || 'analyse-base'
  const dir     = path.join(tmpRoot, file.replace(/\.test\.js$/, ''))
  const analyse = path.join(dir, fixture)
  fs.mkdirSync(dir, {recursive: true})
  fs.cpSync(path.join(TESTS, 'fixtures', fixture), analyse, {recursive: true})
  const bundle  = path.join(dir, 'bundle.js')
  const resFile = path.join(dir, 'results.json')
  fs.writeFileSync(bundle, `${harness}\n;(async () => {\n${code}\n;await T.run()\n})().catch(e => console.error('HARNAIS', e.stack))\n`)
  const t0 = Date.now()
  const out = await new Promise(resolve => {
    const child = spawn(ELECTRON, ['.', analyse], {cwd: ROOT, env: Object.assign({}, process.env, {SA_SMOKE: String(TIMEOUT), SA_SMOKE_JS: bundle, SA_TEST: resFile})})
    let log = ''
    child.stdout.on('data', d => log += d) ; child.stderr.on('data', d => log += d)
    child.on('close', () => resolve(log))
  })
  const secs = ((Date.now() - t0) / 1000).toFixed(1)
  const consoleErrors = out.split('\n').filter(l => /^\[renderer:error\]|HARNAIS|\[smoke\] ERREUR|Uncaught/.test(l))
  console.log(`\n${BOLD(file)} (${secs} s)`)
  if ( !fs.existsSync(resFile) ) {
    failedFiles++
    console.log(RED(`  ✗ aucun résultat (délai dépassé ou plantage)`))
    console.log(out.split('\n').slice(-30).map(l => '    ' + l).join('\n'))
    continue
  }
  const results = JSON.parse(fs.readFileSync(resFile, 'utf8'))
  let fileFailed = false
  for ( const r of results ) {
    totalTests++ ; totalChecks += r.checks
    if ( r.failures.length ) {
      fileFailed = true ; failedTests++
      console.log(RED(`  ✗ ${r.name}`))
      r.failures.forEach(f => console.log(RED(`      ${f.split('\n').join('\n      ')}`)))
    } else console.log(GREEN(`  ✓ ${r.name}`) + ` (${r.checks})`)
  }
  if ( consoleErrors.length ) {
    fileFailed = true
    console.log(RED('  ✗ erreurs dans la console :'))
    consoleErrors.forEach(l => console.log(RED('      ' + l)))
  }
  fileFailed && failedFiles++
}
fs.rmSync(tmpRoot, {recursive: true, force: true})

console.log(BOLD(`\n== ${totalTests} tests de l’application, ${totalChecks} vérifications, ${failedTests} test(s) en échec`))
console.log(failedFiles ? RED(BOLD(`ÉCHEC (${failedFiles} fichier(s))`)) : GREEN(BOLD('TOUT EST BON')))
process.exit(failedFiles ? 1 : 0)
