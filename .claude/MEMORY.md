# ScoreAnalyse-Nodejs — Mémoire Claude

## Projet

- Portage Electron (v2.x, ramené de 3 à 2 le 2026-11-18, #196) de l'app « Table d'analyse » (original Ruby/WAA : `../ScoreAnalyse`).
- APP PORTABLE (macOS, Windows, Linux) : aucune solution propre à un seul système.
- APP ABSOLUMENT AUTONOME : aucune dépendance à `../lib` (lib commune ScoreSuite) ni à Ruby.
- Dépôt git propre au projet. Issues GitHub : `PhilippePerret/TableAnalyse-nodejs` (pas `ScoreSuite`).
- Choix de Phil (2026-11-11) : Electron ; lib commune copiée dans le projet ; front modernisé (modules ES, sans jQuery).
- Architecture : `main/` (processus principal), `renderer/` (interface), `assets/`. Détail : `Manuels/Manuel_dev.md` § Architecture.
- Lancement : `npm start [-- <dossier analyse>]` ou `_scripts/_run.command`.
- Contrôle sans fenêtre : `SA_SMOKE=8 SA_SMOKE_JS=<script> npx electron . <analyse>` (cf. Manuel_dev).
- Dossier analyse : `infos.yaml`, `preferences.yaml`, `analyse_tags.yaml`, `systems/`, `images/`, `backups/`, `export/`.
- Découpe PDF → systèmes JPG : `bin/decoupe-partition` (Electron caché, `main/cutter/` : cli.js, cutter.js (pdf.js), analyse.js (portées, composantes connexes, attribution)). `--debug` interdit (pris par Electron) → `--controle`. Menus Fichier « Découper la partition… » et « Numéroter la partition » (`main/cutter/runCutter.js`, mode `numerotation` dans cutter.js). Produit aussi `systems/mesures.yaml` (barres de mesure → numéros, coords image) ; importé une fois à l'ouverture (`Analyse.importMeasures`, marques txt/mes) puis renommé `mesures.importe.yaml`.
- Localisation : `locales/<lang>/{ui,messages,errors}.yaml` (fr, en, de, it, es, zh, ja, ko), `t()` dans `main/i18n.js` et `renderer/js/i18n.js`. Toute nouvelle clé dans TOUTES les langues. Manuel non localisé.
- Doc : `Manuels/Manuel_dev.md`, `Manuels/Tutoriel_ScoreAnalyse.md` (tutoriel non mis à jour : commandes terminal Ruby).

## Notes de session

- **NOM DE FICHIER ≠ NOM DE L'APPLICATION** (Phil furieux 2026-11-26) : « Table Analyse » = NOMS DE FICHIERS SEULEMENT (Table Analyse.dmg/.exe/.AppImage, Table Analyse.app, Table Analyse.exe). TOUT AFFICHAGE (Dock, barre des menus, Finder, raccourcis, menu des applications, désinstallation, titres) : « Table d’analyse » et RIEN D'AUTRE.

- **OBLIGATOIRE — TESTS À CHAQUE IMPLÉMENTATION** (Phil furieux 2026-11-25, #240) : tout ce qui est implémenté ou corrigé (issue ou non) reçoit ses tests dans `tests/app/` ou `tests/unit/` (cf. Manuel_dev § Suite de tests), écrits AVANT le commit, dans le même commit. Puis `npm test` EN ENTIER. Sans attendre que Phil le demande. Les contrôles SA_SMOKE ne comptent pas. Tester aussi les EXPORTS (PDF, SVG, HTML) dès que l'affichage des marques est concerné : c'est l'export qui compte.

- À LIRE en début de prochaine session : `.claude/A_LIRE_session_2026-11-11.md` (dernier compte rendu, ligne des numéros de mesure ; travail non commité).

- Réponses : « Fait. » + strict minimum. Aucune explication non demandée.
- AUCUN COMMENTAIRE, JAMAIS. Après une tâche : « Fait. » et RIEN d'autre (Phil furieux 2026-11-26). Jamais « relancer l'application » ni rien d'évident.
- Libellés exigés dans une issue : EXACTEMENT ce mot, sans rien ajouter (p.e. « américain », pas « américain (lettre) », #242).
- Manuel : JAMAIS dire à Phil de le régénérer/actualiser (il le fait en permanence via SuperBoard, 2026-11-22).
- « Tu pourrais faire X ? » = FAIRE X, pas répondre « oui » (cf. `.claude/feedback_question_faire.md`, 2026-11-22).
  JAMAIS décrire ce qui a été fait quand c'était demandé (p.e. « la liaison suit les marques, passe dans les exports, testé… », #206, 2026-11-19) : seuls les ajouts hors demande, numérotés.
- TOUJOURS numéroter TOUS les points d'un message qui en a plusieurs, sans exception (Phil furieux 2026-11-15 : point essentiel laissé hors numérotation).
- Git : interdit en écriture sans autorisation expresse de Phil, SAUF commit obligatoire après chaque correction d'issue (un commit par issue, message contenant « Fixed #N » pour fermer l'issue au push).
  Modification hors issue : commit aussi, sans « Fixed » (2026-11-17).
  Gestion des issues = job de Claude, sans demander (2026-11-14) : jamais de commit d'issue sans « Fixed #N » ; issue corrigée restée ouverte → la fermer (`gh issue close N -c "Fixed by <sha>"`). Phil est le concepteur, ne touche pas au code.
- Commande lancée par Phil lui-même (`!…`) : aucune réponse, aucun commentaire. Plus généralement (2026-11-23) : après toute chose « normale » (issue fermée par le push, vérification qui confirme l’attendu…), NE RIEN signaler — ne pas polluer l’espace de lecture.
- Après une correction : « Fait. » SEUL. Même pour une grosse issue, même pour plusieurs issues (2026-11-14 : compte rendu de #115 jugé baratin).
- Exception : signaler ce qui sort de la demande ET change ce que l'utilisateur vit (données supprimées/remplacées, confirmation ajoutée…). Jugés inutiles par Phil (2026-11-12) : placements de menus, détails d'implémentation, éléments laissés en place. Aussi (2026-11-13) : conséquences directes de ce que Phil a lui-même demandé (p.e. menu supprimé → ses éléments disparaissent).
  Aussi (2026-11-13) : la manière dont une retouche visuelle a été obtenue (p.e. flèche native remplacée par une flèche dessinée).
- `Manuels/Manuel/` : écrit par Phil, NE JAMAIS Y TOUCHER (2026-11-13). Les autres fichiers (dont `Manuel_AppData.js`, `Manuel_dev.md`) restent modifiables.
  Exception (2026-11-22) : `Manuels/Manuel/images/` = images du manuel faites par Claude, à la demande. LIRE son `README.md` (organisation en sous-dossiers, procédure de capture détourée). Aussi `Manuels/Manuel/macros.rb` (accord de Phil) : chargé par SuperBoard qui génère le manuel, il charge `_scripts/manuel/extensions/`.
- Point laissé sans réponse par Phil = sujet clos : ne jamais le relancer.
- Jamais expliquer à Phil ce qu'il sait déjà (p.e. licences de polices, 2026-11-16 : « tu me prends pour un crétin »). Question de Phil = répondre seulement à ce qu'elle demande en pratique.
- Aucune négation (« je n'ai pas fait… ») sauf si utile à la demande. JAMAIS signaler que ce n'est « pas poussé » : c'est Phil qui pousse (2026-11-13).
- JAMAIS de dépendance à une autre app de Phil (p.e. Board), même pour un script de dev (Phil furieux 2026-11-16). Outils propres au projet. Manuel : `_scripts/manuel/generer.sh` (Gemfile, Ruby 3.4.10 rbenv).
- Phil DÉTESTE quand ça bouge (effets d'enfoncement, rétrécissement, translations…) : jamais de mouvement dans les effets visuels (2026-11-17).
- Retouche visuelle (couleur, forme…) : proposer des variantes dans un fichier HTML avant d'appliquer.
- « Traite les (nouvelles) issues » = TOUTES les issues ouvertes non traitées, pas seulement celles du jour (Phil furieux 2026-11-17).
- Issues d'étiquette « todo » : notes personnelles de Phil, NE PAS en tenir compte (ni traiter, ni mentionner) (2026-11-17).
- Fichier de variantes HTML : l'ouvrir soi-même dans le navigateur (`open -a Safari <fichier>`), jamais un simple lien (s'ouvre dans VS Code) (2026-11-17).
- Issues : relever CHAQUE point de l'issue (liste), les traiter tous et les vérifier un à un avant le commit. Phil reproche des points oubliés (2026-11-14).
- Tout panneau : fabricant commun (`addPanelHead`, Panneau.js) — taille du contenu, boutons dans le pied de page. Ne JAMAIS réinventer (2026-11-14). Vérifier le rendu par capture : `SA_SMOKE_SHOT=<png>` (cf. Manuel_dev).
- Logo : source `assets/icons/icon.svg` (+ `icon.png` via inkscape), favicon `renderer/img/favicon.svg`. Vert `#3a925e`, bordeau `#cc4870`.

## Reste à faire

1. Issue #3 (sélection rectangle) — ancienne app, non traitée.
2. Export image statique / SVG : non implémentés (ne l'étaient pas non plus en Ruby).
3. « Partition rapide » (boite à outils) : dépend de la commande externe ScoreImage (`score-image`, configurable via `score_image_command` dans `prefs.json` des données utilisateur).
4. PRIORITÉ (exigence de Phil, 2026-11-24) : suite de tests SÉRIEUSE couvrant toute l'app, relancée en entier après chaque changement (app professionnelle ; aujourd'hui seuls des contrôles ponctuels SA_SMOKE). À faire juste après la notation batave/italienne (commit 19aadc1). Tests dans les deux notations.
5. Tutoriel (`Manuels/Tutoriel_ScoreAnalyse.md`) à mettre à jour.
6. 2026-11-13 : #24 à #28, #30 à #36 commitées et poussées. #23 (transparence menus natifs) : capture d'écran attendue de Phil. #29 (langues) faite le 2026-11-13 (8 langues, menu « Langue »). Manuel (Manuels/Manuel) à traduire quand il sera presque achevé (choix de Phil). Export PDF/SVG : `renderer/js/Exporter.js`, `main/exportPdfSvg.js` (SVG testé seulement avec marques texte).
7. Issues #5 à #9 traitées le 2026-11-12 (non fermées sur GitHub). Thèmes : `renderer/css/themes.css` + `Themes.js` (A par défaut, choix de Phil), menu Options ; en-tête des panneaux : `addPanelHead` (Panneau.js).
8. 2026-11-14 : issues #104 à #147 traitées, commitées et poussées. Forme : `Forme.js` (menu, placement des bornes, barre de mesure lue dans l'image), `FormeBuilder.js` (construction : forme générale + détail par partie). Contrôle visuel : `SA_SMOKE_SHOT`.
9. 2026-11-15 : issues #148 à #162 traitées. Distribution : `.github/workflows/distribution.yml` (dmg universel, exe, AppImage → Release GitHub v<version>, dépôt public), `_scripts/publier.command` (incrémente la version : VERSION, package.json, package-lock.json ; commit + push ; fabrication ; version dans `site/src/lib/site.ts`). Fichiers : `Table-Analyse-<version>.<ext>`, productName `Table d’analyse` (nom affiché dans la barre des menus macOS, #205 ; jamais de caractère spécial dans les noms des fichiers téléchargeables). Fichiers servis par le site (plus par GitHub, 2026-11-26) : `_scripts/deposer-telechargements.sh <version>` (appelé par publier.command) dépose « Table Analyse.<ext> » + `version` dans `/home/icare/data/analyse_musicale/table-analyse/` (hébergement Alwaysdata de TOUS les sites de Phil : n'écrire QUE dans ce dossier), servis par `api/telecharger.php`. Application installée : « Table Analyse.app » (build.productName ; nom affiché « Table d’analyse » : CFBundleDisplayName/CFBundleName, raccourci Windows). Déblocage : `xattr -dr com.apple.quarantine "/Applications/Table Analyse.app"`. Si l'hébergement Alwaysdata sature : déposer les fichiers sur le CloudFlare de Phil (R2, déjà utilisé pour la vidéo de démo). Page de téléchargement : site Astro `/Users/philippeperret/Sites/Atelier_Icare/Icare_2025/analyse_musicale/site` (`/table-analyse/`, `telechargement.php`), mise en ligne par `scripts/publier.command` du site. Suppression auto des anciennes Releases : refusée par le classifieur, en attente d'accord de Phil.
- Rappel Phil (2026-11-16) : compte rendu de 3 points jugé blabla. Après exécution : « Fait. » SEUL, même pour plusieurs demandes. Question nécessaire = une ligne.
- Raccourci « Scinder la fenêtre » = ⌘ + Maj + « : » (clavier français macOS), JAMAIS ⌘ + « : » ni ⌘ + Maj + « , » (Phil furieux 2026-11-18, raté deux fois). Géré dans `KeyboardEvents.js` (accélérateur natif `CmdOrCtrl+/` répond à ⌘ + « : » sur macOS AZERTY → `registerAccelerator: false`).
- Issue #220 (partage à distance) : spécification validée dans `.claude/partage_220.md` (2026-11-23). La lire avant d'y travailler.
- Contrôles ponctuels (SA_SMOKE, scripts jetables) ≠ tests : ne JAMAIS les appeler « tests » ni « validations » (Phil furieux 2026-11-24, croyait à une suite de tests).
