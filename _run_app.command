#!/bin/zsh
# Compile (si les sources sont plus récentes) puis ouvre l'app
# « Table d'analyse » compilée (dist/).

APP_FOLDER="${0:A:h}"
cd "$APP_FOLDER" || exit 1

[[ -d node_modules ]] || npm install || exit 1

APP_PATH=( dist/mac*/"Table d'analyse.app"(N) )
if [[ -z "$APP_PATH" ]] || [[ -n $(find main renderer assets package.json VERSION -newer "$APP_PATH[1]" -print -quit) ]]; then
  npm run dist:mac || exit 1
  APP_PATH=( dist/mac*/"Table d'analyse.app"(N) )
fi

open "$APP_PATH[1]"
