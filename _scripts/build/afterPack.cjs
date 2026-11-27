/*
 * Fabrication (electron-builder, « afterPack ») — macOS seulement
 * ---------------------------------------------------------------
 * Le paquet s'appelle « Table Analyse.app » et son CFBundleName reste
 * « Table Analyse » (Electron cherche « <CFBundleName> Helper.app » : le
 * changer empêche l'application de démarrer).
 * Le nom AFFICHÉ (barre des menus, Dock, Finder) vient des fichiers
 * InfoPlist.strings de chaque langue : on y met « Table d’analyse »
 * (package.json, champ productName).
 */
const fs   = require('node:fs')
const path = require('node:path')

const DISPLAY_NAME = require('../../package.json').productName

function writeLocalizedNames(appPath, displayName = DISPLAY_NAME) {
  const resources = path.join(appPath, 'Contents', 'Resources')
  const lprojs = fs.readdirSync(resources).filter(f => f.endsWith('.lproj'))
  if ( !lprojs.length ) throw new Error(`Aucun dossier .lproj dans ${resources}`)
  const esc = displayName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const content = `CFBundleName = "${esc}";\nCFBundleDisplayName = "${esc}";\n`
  for ( const lproj of lprojs ) {
    fs.writeFileSync(path.join(resources, lproj, 'InfoPlist.strings'), content, 'utf8')
  }
  return lprojs.length
}

async function afterPack(context) {
  if ( context.electronPlatformName !== 'darwin' && context.electronPlatformName !== 'mas' ) return
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  writeLocalizedNames(app)
}

module.exports = afterPack
module.exports.default = afterPack
module.exports.writeLocalizedNames = writeLocalizedNames
