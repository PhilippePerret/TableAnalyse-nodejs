# ScoreAnalyse-Nodejs — Mémoire Claude

## Projet

- Portage Electron (v3.0.0) de l'app « Table d'analyse » (original Ruby/WAA : `../ScoreAnalyse`).
- APP ABSOLUMENT AUTONOME : aucune dépendance à `../lib` (lib commune ScoreSuite) ni à Ruby.
- Pas de dépôt git (le `.git` copié a été détruit le 2026-11-11 à la demande de Phil). Pas de github pour le moment.
- Choix de Phil (2026-11-11) : Electron ; lib commune copiée dans le projet ; front modernisé (modules ES, sans jQuery).
- Architecture : `main/` (processus principal), `renderer/` (interface), `assets/`. Détail : `Manuels/Manuel_dev.md` § Architecture.
- Lancement : `npm start [-- <dossier analyse>]` ou `_run.command`.
- Contrôle sans fenêtre : `SA_SMOKE=8 SA_SMOKE_JS=<script> npx electron . <analyse>` (cf. Manuel_dev).
- Dossier analyse : `infos.yaml`, `preferences.yaml`, `analyse_tags.yaml`, `systems/`, `images/`, `backups/`, `export/`.
- Doc : `Manuels/Manuel_dev.md`, `Manuels/Tutoriel_ScoreAnalyse.md` (tutoriel non mis à jour : commandes terminal Ruby).

## Notes de session

- Réponses : « Fait. » + strict minimum. Aucune explication non demandée.
- Git : interdit en écriture sans autorisation expresse de Phil.
- Commande lancée par Phil lui-même (`!…`) : aucune réponse, aucun commentaire.
- Après une correction : « Fait. » SEUL.

## Reste à faire

1. Issue #3 (sélection rectangle) — ancienne app, non traitée.
2. Export image statique / SVG : non implémentés (ne l'étaient pas non plus en Ruby).
3. « Partition rapide » (boite à outils) : dépend de la commande externe ScoreImage (`score-image`, configurable via `score_image_command` dans `prefs.json` des données utilisateur).
4. Mettre en place des tests.
5. Tutoriel (`Manuels/Tutoriel_ScoreAnalyse.md`) à mettre à jour.
