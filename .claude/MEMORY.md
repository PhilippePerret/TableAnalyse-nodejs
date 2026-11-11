# ScoreAnalyse-Nodejs — Mémoire Claude

## Projet

- Portage Electron (v3.0.0) de l'app « Table d'analyse » (original Ruby/WAA : `../ScoreAnalyse`).
- APP ABSOLUMENT AUTONOME : aucune dépendance à `../lib` (lib commune ScoreSuite) ni à Ruby.
- Pas de dépôt git (le `.git` copié a été détruit le 2026-11-11 à la demande de Phil). Issues GitHub : `PhilippePerret/TableAnalyse-nodejs` (pas `ScoreSuite`).
- Choix de Phil (2026-11-11) : Electron ; lib commune copiée dans le projet ; front modernisé (modules ES, sans jQuery).
- Architecture : `main/` (processus principal), `renderer/` (interface), `assets/`. Détail : `Manuels/Manuel_dev.md` § Architecture.
- Lancement : `npm start [-- <dossier analyse>]` ou `_run.command`.
- Contrôle sans fenêtre : `SA_SMOKE=8 SA_SMOKE_JS=<script> npx electron . <analyse>` (cf. Manuel_dev).
- Dossier analyse : `infos.yaml`, `preferences.yaml`, `analyse_tags.yaml`, `systems/`, `images/`, `backups/`, `export/`.
- Découpe PDF → systèmes JPG : `bin/decoupe-partition` (Electron caché, `main/cutter/` : cli.js, cutter.js (pdf.js), analyse.js (portées, composantes connexes, attribution)). `--debug` interdit (pris par Electron) → `--controle`. À brancher plus tard sur menu Fichier « Découper la partition… ». Produit aussi `systems/mesures.yaml` (barres de mesure → numéros, coords image) ; importé une fois à l'ouverture (`Analyse.importMeasures`, marques txt/mes) puis renommé `mesures.importe.yaml`.
- Doc : `Manuels/Manuel_dev.md`, `Manuels/Tutoriel_ScoreAnalyse.md` (tutoriel non mis à jour : commandes terminal Ruby).

## Notes de session

- À LIRE en début de prochaine session : `.claude/A_LIRE_session_2026-11-11.md` (dernier compte rendu, ligne des numéros de mesure ; travail non commité).

- Réponses : « Fait. » + strict minimum. Aucune explication non demandée.
- Git : interdit en écriture sans autorisation expresse de Phil.
- Commande lancée par Phil lui-même (`!…`) : aucune réponse, aucun commentaire.
- Après une correction : « Fait. » SEUL.
- Aucune négation (« je n'ai pas fait… ») sauf si utile à la demande.
- Retouche visuelle (couleur, forme…) : proposer des variantes dans un fichier HTML avant d'appliquer.
- Logo : source `assets/icons/icon.svg` (+ `icon.png` via inkscape), favicon `renderer/img/favicon.svg`. Vert `#3a925e`, bordeau `#cc4870`.

## Reste à faire

1. Issue #3 (sélection rectangle) — ancienne app, non traitée.
2. Export image statique / SVG : non implémentés (ne l'étaient pas non plus en Ruby).
3. « Partition rapide » (boite à outils) : dépend de la commande externe ScoreImage (`score-image`, configurable via `score_image_command` dans `prefs.json` des données utilisateur).
4. Mettre en place des tests.
5. Tutoriel (`Manuels/Tutoriel_ScoreAnalyse.md`) à mettre à jour.
