#!/bin/zsh
# Fabrique les versions téléchargeables de la Table d'analyse (macOS,
# Windows, Linux) sur GitHub et les publie dans la Release v<version> du
# dépôt (workflow .github/workflows/distribution.yml). Met à jour la
# version proposée par la page de téléchargement du site (src/lib/site.ts),
# qui pointe vers ces fichiers.
#
# Le numéro de version est d'abord incrémenté (patch, mineure ou majeure,
# au choix, ou aucune incrémentation) dans VERSION, package.json et
# package-lock.json, commité et poussé.
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

# Le dépôt distant doit contenir le code local
git fetch -q origin main || fin "Impossible de joindre GitHub."
if [[ $(git rev-parse HEAD) != $(git rev-parse origin/main) ]]; then
  fin "Le code local n'est pas celui de GitHub (main). Pousser d'abord les commits."
fi

# Nouveau numéro de version
OLD=$(node -p "require('./package.json').version")
echo "Version actuelle : $OLD"
echo -n "Incrémenter : p = patch, m = mineure, M = majeure, rien = garder $OLD ? "
read KIND
case "$KIND" in
  M) KIND=major ;;
  m) KIND=minor ;;
  p) KIND=patch ;;
  "") KIND="" ;;
  *) fin "Choix inconnu : $KIND" ;;
esac
if [[ -n "$KIND" ]]; then
  npm version "$KIND" --no-git-tag-version >/dev/null || fin "Incrémentation de la version impossible."
  VERSION=$(node -p "require('./package.json').version")
  echo "$VERSION" > VERSION
  git add VERSION package.json package-lock.json \
    && git commit -q -m "Version $VERSION" VERSION package.json package-lock.json \
    && git push -q origin main || fin "Commit ou envoi de la version $VERSION impossible."
else
  VERSION="$OLD"
fi

echo "Fabrication et publication de la version $VERSION sur GitHub…"
gh workflow run "$WORKFLOW" --ref main || fin "Lancement du workflow impossible."
sleep 5
RUN_ID=$(gh run list --workflow "$WORKFLOW" --limit 1 --json databaseId -q '.[0].databaseId')
[[ -n "$RUN_ID" ]] || fin "Workflow introuvable."
gh run watch "$RUN_ID" >/dev/null
ECHECS=$(gh run view "$RUN_ID" --json jobs -q '.jobs[] | select(.conclusion != "success") | .name')

echo "\nFichiers de la Release v$VERSION :"
gh release view "v$VERSION" --json assets -q '.assets[].name' || fin "Release v$VERSION introuvable."

# Version proposée par la page de téléchargement du site
[[ -f "$SITE/src/lib/site.ts" ]] && sed -i '' "s/^export const TABLE_ANALYSE_VERSION = .*/export const TABLE_ANALYSE_VERSION = '$VERSION';/" "$SITE/src/lib/site.ts"

[[ -n "$ECHECS" ]] && fin "Fabrications ratées (voir : gh run view $RUN_ID --log-failed) :\n$ECHECS"
fin "Terminé (version $VERSION)." 0
