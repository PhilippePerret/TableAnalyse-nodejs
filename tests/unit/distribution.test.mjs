// Fabrication des versions téléchargeables (package.json, champ « build ») :
// noms de fichiers acceptés par electron-builder sur chaque système, nom
// affiché « Table d’analyse » conservé
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { createRequire } from 'node:module'

const ROOT    = path.join(import.meta.dirname, '..', '..')
const PKG     = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const require = createRequire(import.meta.url)
const { validateCriticalPathString } = require('app-builder-lib/out/targets/appimage/appImageUtil.js')
const { sanitizeFileName } = createRequire(require.resolve('app-builder-lib/out/appInfo.js'))('builder-util/out/filename')

test('Linux (AppImage) : nom du programme accepté par electron-builder', () => {
  const linux = PKG.build.linux
  assert.equal(linux.executableName, 'Table_analyse')
  // Même calcul que electron-builder (appInfo.js : productFilename)
  const productFilename = sanitizeFileName(linux.executableName ?? PKG.build.executableName ?? PKG.productName)
  assert.doesNotThrow(() => validateCriticalPathString(linux.executableName, 'executableName'))
  assert.doesNotThrow(() => validateCriticalPathString(productFilename, 'productFilename'))
})

test('nom affiché : « Table d’analyse » sur les trois systèmes', () => {
  assert.equal(PKG.productName, 'Table d’analyse')
  assert.equal(PKG.build.mac.extendInfo.CFBundleDisplayName, 'Table d’analyse')
  assert.equal(PKG.build.mac.extendInfo.LSHasLocalizedDisplayName, true)
  assert.equal(PKG.build.nsis.shortcutName, 'Table d’analyse')
  assert.equal(PKG.build.nsis.uninstallDisplayName, 'Table d’analyse')
  assert.equal(PKG.build.linux.desktop.entry.Name, 'Table d’analyse')
})

test('fichiers téléchargeables : « Table-Analyse-<version>.<ext> », sans caractère spécial', () => {
  for ( const os of ['mac', 'win', 'linux'] ) {
    assert.equal(PKG.build[os].artifactName, 'Table-Analyse-${version}.${ext}', os)
  }
})

test('application installée : « Table Analyse.app » (nom de la commande de déblocage macOS)', () => {
  assert.equal(PKG.build.productName, 'Table Analyse')
  const { sanitizeFileName: sf } = { sanitizeFileName }
  assert.equal(sf(PKG.build.productName), 'Table Analyse', 'nom du paquet .app')
})

test('macOS : CFBundleName jamais modifié (sinon les « Helper.app » sont introuvables)', () => {
  assert.equal(PKG.build.mac.extendInfo.CFBundleName, undefined)
})

test('macOS : afterPack écrit « Table d’analyse » dans chaque InfoPlist.strings', () => {
  assert.equal(PKG.build.afterPack, '_scripts/build/afterPack.cjs')
  const { writeLocalizedNames } = require(path.join(ROOT, PKG.build.afterPack))
  const tmp  = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-afterpack-'))
  const app  = path.join(tmp, 'Table Analyse.app')
  const res  = path.join(app, 'Contents', 'Resources')
  for ( const l of ['en', 'fr', 'ja'] ) fs.mkdirSync(path.join(res, `${l}.lproj`), { recursive: true })
  try {
    assert.equal(writeLocalizedNames(app), 3)
    for ( const l of ['en', 'fr', 'ja'] ) {
      const txt = fs.readFileSync(path.join(res, `${l}.lproj`, 'InfoPlist.strings'), 'utf8')
      assert.match(txt, /^CFBundleName = "Table d’analyse";$/m, l)
      assert.match(txt, /^CFBundleDisplayName = "Table d’analyse";$/m, l)
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
})

test('macOS : afterPack ignore les autres systèmes', async () => {
  const afterPack = require(path.join(ROOT, PKG.build.afterPack))
  await assert.doesNotReject(afterPack({ electronPlatformName: 'win32', appOutDir: '/inexistant' }))
})

test('Windows : « Table Analyse.exe », nom affiché « Table d’analyse »', () => {
  const cfg = require(path.join(ROOT, '_scripts/build/electron-builder.win.cjs'))
  assert.equal(cfg.productName, 'Table d’analyse')
  assert.equal(cfg.win.executableName, 'Table Analyse')
  assert.equal(sanitizeFileName(cfg.win.executableName), 'Table Analyse', 'nom du .exe')
  assert.equal(cfg.win.artifactName, PKG.build.win.artifactName)
  assert.equal(cfg.nsis.shortcutName, 'Table d’analyse')
  const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/distribution.yml'), 'utf8')
  assert.match(wf, /target: --win --config _scripts\/build\/electron-builder\.win\.cjs/)
})

test('mention du droit d’auteur : « À propos », informations des fichiers, README', async () => {
  const { COPYRIGHT } = await import('../../main/copyright.js')
  assert.equal(COPYRIGHT, '© 2026 Philippe Perret – Tous droits réservés')
  assert.equal(PKG.build.copyright, COPYRIGHT, 'package.json (build.copyright)')
  assert.match(fs.readFileSync(path.join(ROOT, 'main', 'main.js'), 'utf8'), /setAboutPanelOptions\(\{[^}]*copyright: COPYRIGHT/)
  assert.ok(fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8').includes(COPYRIGHT), 'README')
})
