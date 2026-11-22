#!/bin/zsh
# Génère Manuel.html et Manuel.epub à partir du fichier .adoc donné
# (par défaut Manuels/Manuel/Manuel.adoc). Les gems (Gemfile) sont
# installées dans _scripts/manuel/vendor/ au premier appel.

HERE="${0:A:h}"
ADOC="${1:-${HERE:h:h}/Manuels/Manuel/Manuel.adoc}"
ADOC="${ADOC:A}"
export BUNDLE_GEMFILE="$HERE/Gemfile"
export BUNDLE_PATH="$HERE/vendor"
export RBENV_VERSION="$(<"$HERE/.ruby-version")"
# Extension : height=N seul sur une image → largeur calculée
EXT=(-r "$HERE/extensions/hauteur_images.rb")

bundle check >/dev/null 2>&1 || bundle install --quiet || exit 1
cd "${ADOC:h}" || exit 1
bundle exec asciidoctor "${EXT[@]}" --failure-level=WARN "${ADOC:t}" || exit 1
bundle exec asciidoctor-epub3 "${EXT[@]}" --failure-level=WARN "${ADOC:t}" || exit 1
