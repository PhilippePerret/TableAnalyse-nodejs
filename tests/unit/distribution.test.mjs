// Fabrication des versions téléchargeables (package.json, champ « build ») :
// noms de fichiers acceptés par electron-builder sur chaque système, nom
// affiché « Table d’analyse » conservé
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
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
  assert.equal(PKG.build.mac.extendInfo.CFBundleName, 'Table d’analyse')
  assert.equal(PKG.build.nsis.shortcutName, 'Table d’analyse')
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
