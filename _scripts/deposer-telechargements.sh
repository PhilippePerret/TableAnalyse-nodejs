#!/bin/zsh
# Dépose les fichiers téléchargeables de la Release v<version> (GitHub) sur
# l'hébergement du site, sous les noms « Table Analyse.dmg »,
# « Table Analyse.exe », « Table Analyse.AppImage » (servis par
# api/telecharger.php du site), avec le numéro de leur version (fichier
# « version »).
#
# Usage : _scripts/deposer-telechargements.sh <version>
# (appelé par _scripts/publier.command après la fabrication)
#
# Écrit SEULEMENT dans DOSSIER (dossier des données du site, hors des
# sites publiés) : chaque fichier y est d'abord envoyé sous un nom
# provisoire, puis renommé (aucun fichier à moitié envoyé n'est proposé).

VERSION="$1"
HEBERGEMENT="ssh-icare.alwaysdata.net"
DOSSIER="/home/icare/data/analyse_musicale/table-analyse"
APP_FOLDER="${0:A:h:h}"
cd "$APP_FOLDER" || exit 1

[[ -n "$VERSION" ]] || { echo "Usage : $0 <version>" ; exit 1 }

TMP=$(mktemp -d) || exit 1
trap 'rm -rf "$TMP"' EXIT

echo "Récupération des fichiers de la Release v$VERSION…"
gh release download "v$VERSION" -D "$TMP" -p '*.dmg' -p '*.exe' -p '*.AppImage' \
  || { echo "Fichiers de la Release v$VERSION introuvables." ; exit 1 }

ssh "$HEBERGEMENT" "mkdir -p '$DOSSIER'" || { echo "Hébergement injoignable." ; exit 1 }

for EXT in dmg exe AppImage; do
  SOURCE=("$TMP"/*.$EXT(N))
  if [[ -z "$SOURCE" ]]; then echo "  (aucun fichier .$EXT)" ; continue ; fi
  echo "  Table Analyse.$EXT…"
  scp -q "$SOURCE[1]" "$HEBERGEMENT:$DOSSIER/.envoi.$EXT" \
    && ssh "$HEBERGEMENT" "mv -f '$DOSSIER/.envoi.$EXT' '$DOSSIER/Table Analyse.$EXT'" \
    || { echo "Envoi de Table Analyse.$EXT impossible." ; exit 1 }
done

ssh "$HEBERGEMENT" "printf '%s\n' '$VERSION' > '$DOSSIER/version'" || { echo "Écriture de la version impossible." ; exit 1 }
echo "Fichiers de la version $VERSION déposés sur le site."
