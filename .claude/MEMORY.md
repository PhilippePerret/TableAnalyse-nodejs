# ScoreAnalyse-Nodejs — Mémoire Claude

## Projet

- Portage Electron (v3.0.0) de l'app « Table d'analyse » (original Ruby/WAA : `../ScoreAnalyse`).
- APP PORTABLE (macOS, Windows, Linux) : aucune solution propre à un seul système.
- APP ABSOLUMENT AUTONOME : aucune dépendance à `../lib` (lib commune ScoreSuite) ni à Ruby.
- Pas de dépôt git (le `.git` copié a été détruit le 2026-11-11 à la demande de Phil). Issues GitHub : `PhilippePerret/TableAnalyse-nodejs` (pas `ScoreSuite`).
- Choix de Phil (2026-11-11) : Electron ; lib commune copiée dans le projet ; front modernisé (modules ES, sans jQuery).
- Architecture : `main/` (processus principal), `renderer/` (interface), `assets/`. Détail : `Manuels/Manuel_dev.md` § Architecture.
- Lancement : `npm start [-- <dossier analyse>]` ou `_run.command`.
- Contrôle sans fenêtre : `SA_SMOKE=8 SA_SMOKE_JS=<script> npx electron . <analyse>` (cf. Manuel_dev).
- Dossier analyse : `infos.yaml`, `preferences.yaml`, `analyse_tags.yaml`, `systems/`, `images/`, `backups/`, `export/`.
- Découpe PDF → systèmes JPG : `bin/decoupe-partition` (Electron caché, `main/cutter/` : cli.js, cutter.js (pdf.js), analyse.js (portées, composantes connexes, attribution)). `--debug` interdit (pris par Electron) → `--controle`. Menus Fichier « Découper la partition… » et « Numéroter la partition » (`main/cutter/runCutter.js`, mode `numerotation` dans cutter.js). Produit aussi `systems/mesures.yaml` (barres de mesure → numéros, coords image) ; importé une fois à l'ouverture (`Analyse.importMeasures`, marques txt/mes) puis renommé `mesures.importe.yaml`.
- Localisation : `locales/<lang>/{ui,messages,errors}.yaml`, `t()` dans `main/i18n.js` et `renderer/js/i18n.js` (data-i18n dans index.html). Manuel non localisé.
- Doc : `Manuels/Manuel_dev.md`, `Manuels/Tutoriel_ScoreAnalyse.md` (tutoriel non mis à jour : commandes terminal Ruby).

## Notes de session

- À LIRE en début de prochaine session : `.claude/A_LIRE_session_2026-11-11.md` (dernier compte rendu, ligne des numéros de mesure ; travail non commité).

- Réponses : « Fait. » + strict minimum. Aucune explication non demandée.
- Git : interdit en écriture sans autorisation expresse de Phil, SAUF commit obligatoire après chaque correction d'issue (un commit par issue, message contenant « Fixed #N » pour fermer l'issue au push).
- Commande lancée par Phil lui-même (`!…`) : aucune réponse, aucun commentaire.
- Après une correction : « Fait. » SEUL.
- Exception : signaler ce qui sort de la demande ET change ce que l'utilisateur vit (données supprimées/remplacées, confirmation ajoutée…). Jugés inutiles par Phil (2026-11-12) : placements de menus, détails d'implémentation, éléments laissés en place.
- Aucune négation (« je n'ai pas fait… ») sauf si utile à la demande.
- Retouche visuelle (couleur, forme…) : proposer des variantes dans un fichier HTML avant d'appliquer.
- Logo : source `assets/icons/icon.svg` (+ `icon.png` via inkscape), favicon `renderer/img/favicon.svg`. Vert `#3a925e`, bordeau `#cc4870`.

## Reste à faire

1. Issue #3 (sélection rectangle) — ancienne app, non traitée.
2. Export image statique / SVG : non implémentés (ne l'étaient pas non plus en Ruby).
3. « Partition rapide » (boite à outils) : dépend de la commande externe ScoreImage (`score-image`, configurable via `score_image_command` dans `prefs.json` des données utilisateur).
4. Mettre en place des tests.
5. Tutoriel (`Manuels/Tutoriel_ScoreAnalyse.md`) à mettre à jour.
6. Issues #5 à #9 traitées le 2026-11-12 (non fermées sur GitHub). Thèmes : `renderer/css/themes.css` + `Themes.js` (A par défaut, choix de Phil), menu Options ; en-tête des panneaux : `addPanelHead` (Panneau.js).
