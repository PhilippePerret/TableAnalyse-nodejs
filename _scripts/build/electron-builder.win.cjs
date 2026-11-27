/*
 * Fabrication Windows : configuration de package.json (champ « build »)
 * avec deux différences :
 *   - nom affiché (Gestionnaire des tâches, barre des tâches, installeur,
 *     programmes installés…) : « Table d’analyse » (package.json, productName) ;
 *   - noms de fichiers : « Table Analyse.exe », dossier « Table Analyse ».
 * Utilisée par .github/workflows/distribution.yml :
 *   npx electron-builder --win --config _scripts/build/electron-builder.win.cjs
 */
const pkg = require('../../package.json')

module.exports = {
  ...pkg.build,
  productName: pkg.productName,
  win: { ...pkg.build.win, executableName: pkg.build.productName },
}
