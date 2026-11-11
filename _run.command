#!/bin/zsh
# Lance ScoreAnalyse (Electron) sur l'analyse de ./analyses/analyse
# (ou sur la dernière analyse ouverte si elle n'existe pas).

APP_FOLDER="${0:A:h}"
cd "$APP_FOLDER" || exit 1

[[ -d node_modules ]] || npm install || exit 1

ANALYSE="$APP_FOLDER/analyses/analyse"
if [[ -f "$ANALYSE/infos.yaml" ]]; then
  npm start -- "$ANALYSE"
else
  npm start
fi
