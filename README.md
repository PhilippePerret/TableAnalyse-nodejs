# TABLE D'ANALYSE (ScoreAnalyse) — version Electron

## Présentation

Application de bureau (Electron) permettant de procéder à l'analyse musicale d'une partition découpée en systèmes, de façon très souple, et de l'exporter.

## Installation

~~~bash
npm install
~~~

## Lancement

~~~bash
npm start                         # dernière analyse ouverte
npm start -- /chemin/vers/analyse # une analyse précise
~~~

ou double-clic sur `_run.command` (ouvre l'analyse `./analyses/analyse`).

## Procédure

* Découper la partition en systèmes (`score-cutting`),
* menu « Fichier » > « Nouvelle analyse… » (⌘N), choisir le dossier de l'analyse et le dossier des images des systèmes,
* faire un tour dans les préférences (`⇧P`) pour jeter un œil aux valeurs par défaut,
* commencer à analyser en double-cliquant aux endroits voulus,
* ouvrir le manuel (`⇧M`) pour en savoir un peu plus.

Documentation développeur : `Manuels/Manuel_dev.md`.
