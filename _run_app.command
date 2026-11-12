#!/bin/zsh
# Compile (si les sources sont plus récentes) puis ouvre l'app
# « Table d'analyse » compilée (dist/).

APP_FOLDER="${0:A:h}"
cd "$APP_FOLDER" || exit 1

[[ -d node_modules ]] || npm install || exit 1

# Repère de la dernière compilation réussie (la date du .app n'est pas
# fiable : le paquet est réécrit sur place).
STAMP="dist/.build-stamp"
APP_PATH=( dist/mac*/"Table d'analyse.app"(N) )
if [[ -z "$APP_PATH" ]] || [[ ! -f "$STAMP" ]] || [[ -n $(find main renderer assets locales package.json VERSION -newer "$STAMP" -print -quit) ]]; then
  mkdir -p dist && touch "$STAMP.next"
  npm run dist:mac || exit 1
  mv "$STAMP.next" "$STAMP"
  # Une instance déjà ouverte serait seulement réactivée (ancienne version)
  osascript -e "quit app \"Table d'analyse\"" 2>/dev/null
  for i in {1..20}; do
    pgrep -f "Table d'analyse.app/Contents/MacOS/" >/dev/null || break
    sleep 0.5
  done
  APP_PATH=( dist/mac*/"Table d'analyse.app"(N) )
fi

open "$APP_PATH[1]"
