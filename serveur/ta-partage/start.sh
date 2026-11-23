#!/bin/sh
# Démarrage du service ta-partage sur AlwaysData (commande du site Node.js :
# ~/ta-partage/start.sh). PORT et IP sont fournis par AlwaysData.
set -a
. "$HOME/.secrets/smtp.env"
set +a
export TA_PARTAGE_URL=https://partage.analyse-musicale.fr
export TA_PARTAGE_FROM=partage@analyse-musicale.fr
export TA_PARTAGE_DB="$HOME/data/ta-partage/partage.sqlite"
cd "$HOME/ta-partage" || exit 1
exec node --no-warnings server.js
