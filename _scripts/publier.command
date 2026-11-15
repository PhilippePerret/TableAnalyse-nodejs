#!/bin/zsh
# Fabrique les versions téléchargeables de la Table d'analyse (macOS,
# Windows, Linux) sur GitHub (workflow .github/workflows/distribution.yml)
# puis les place sur le site (dossier public/telechargements), dont la
# version est mise à jour (src/lib/site.ts).
#
# Requis : gh connecté (gh auth login), code poussé sur GitHub (la
# fabrication se fait à partir de la branche main du dépôt distant).

APP_FOLDER="${0:A:h:h}"
SITE="/Users/philippeperret/Sites/Atelier_Icare/Icare_2025/analyse_musicale/site"
WORKFLOW="distribution.yml"
cd "$APP_FOLDER" || exit 1

fin(){ echo "\n$1" ; echo "\n(Appuyer sur Entrée pour fermer)" ; read ; exit ${2:-1} }

command -v gh >/dev/null || fin "Commande gh introuvable (brew install gh)."
gh auth status >/dev/null 2>&1 || fin "gh n'est pas connecté (gh auth login)."
[[ -d "$SITE/public" ]] || fin "Dossier du site introuvable : $SITE"

# Le dépôt distant doit contenir le code local
git fetch -q origin main || fin "Impossible de joindre GitHub."
if [[ $(git rev-parse HEAD) != $(git rev-parse origin/main) ]]; then
  fin "Le code local n'est pas celui de GitHub (main). Pousser d'abord les commits."
fi

VERSION=$(node -p "require('./package.json').version")
echo "Fabrication de la version $VERSION sur GitHub…"
gh workflow run "$WORKFLOW" --ref main || fin "Lancement du workflow impossible."
sleep 5
RUN_ID=$(gh run list --workflow "$WORKFLOW" --limit 1 --json databaseId -q '.[0].databaseId')
[[ -n "$RUN_ID" ]] || fin "Workflow introuvable."
gh run watch "$RUN_ID" >/dev/null
# Versions fabriquées (une fabrication ratée n'empêche pas les autres)
ECHECS=$(gh run view "$RUN_ID" --json jobs -q '.jobs[] | select(.conclusion != "success") | .name')

TMP=$(mktemp -d)
gh run download "$RUN_ID" -D "$TMP" || fin "Aucune version fabriquée (voir : gh run view $RUN_ID --log-failed)."
DEST="$SITE/public/telechargements"
mkdir -p "$DEST"
# Remplace l'ancienne version de chaque système fabriqué
for EXT in dmg exe AppImage; do
  NEW=( "$TMP"/**/*.$EXT(N) )
  [[ -n "$NEW" ]] || continue
  rm -f "$DEST"/Table-d-analyse-*.$EXT(N)
  cp "$NEW[@]" "$DEST/"
done
rm -rf "$TMP"

# Version proposée par la page de téléchargement
sed -i '' "s/^export const TABLE_ANALYSE_VERSION = .*/export const TABLE_ANALYSE_VERSION = '$VERSION';/" "$SITE/src/lib/site.ts"

echo "\nFichiers placés dans $DEST :"
ls -1 "$DEST"
[[ -n "$ECHECS" ]] && fin "Fabrications ratées (voir : gh run view $RUN_ID --log-failed) :\n$ECHECS"
fin "Terminé (version $VERSION)." 0
