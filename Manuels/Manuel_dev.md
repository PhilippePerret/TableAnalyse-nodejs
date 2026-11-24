# Table d'analyse

# Manuel de développement



[TOC]

## Architecture (version Electron)

~~~
main/                 Processus principal (Node.js)
  main.js             Fenêtre, menu, protocole sa://, canaux IPC
  preload.cjs         Pont window.api (invoke / on)
  Analyse.js          Lecture/écriture de l'analyse, backups, systèmes
  createAnalyse.js    Création d'une nouvelle analyse
  exportHtml.js       Export HTML autonome
  scoreImage.js       Image SVG depuis du code muscore (ScoreImage)
  AppPrefs.js         Préférences de l'application (userData/prefs.json)
  yaml.js             YAML (schéma 1.1, compatible avec les anciens fichiers Ruby)
renderer/             Interface (modules ES, sans jQuery)
  index.html, css/, img/
  js/main.js          Point d'entrée
  js/api.js           invoke(<canal>, data) → données ou exception
  js/lib/interact.js  draggable / resizable (remplace jQuery UI)
  js/events.js        Bus d'évènements (sélection, hauteur de table)
  js/Current.js       Analyse courante (sans dépendre de la classe Analyse)
assets/               Fontes, thèmes, modèle de préférences
~~~

### Protocole `sa://`

* `sa://app/<chemin>` : fichiers du dossier `renderer`,
* `sa://app/assets/<chemin>` : dossier `assets`,
* `sa://app/analyse/<chemin>` : dossier de l'analyse courante (images des systèmes, images).

### Canaux IPC

`analyse:getCurrent`, `analyse:saveInfos`, `analyse:savePreferences`, `analyse:saveTags`, `analyse:refresh`, `analyse:open`, `analyse:reload`, `analyse:create`, `analyse:exportHtml`, `dialog:chooseFolder`, `app:themes`, `tools:buildImage`, `window:setSize`, `app:closeReady`.

Le processus principal envoie `menu` (commande du menu) et `app:will-close` (enregistrement avant fermeture).

### Règle des modules (dépendances circulaires)

Les classes de base (`AObjet`, `MenusTool`) ne doivent importer, même indirectement, aucun module qui en hérite. Elles informent l'interface par le bus d'évènements (`emit('selection:changed')`, `emit('table:changed')`). `AMImage` est définie dans `AMark.js` pour la même raison. Aucun module ne doit exécuter, au chargement, du code utilisant un autre module (hors `extends`).

### Lancement de contrôle

~~~bash
SA_SMOKE=8 SA_SMOKE_JS=/chemin/script.js npx electron . /chemin/analyse
~~~

Fenêtre invisible, messages de la console du renderer recopiés dans le Terminal, script optionnel joué dans le renderer après chargement, arrêt au bout de `SA_SMOKE` secondes. `SA_SMOKE_SHOT=/chemin/capture.png` : capture de la fenêtre juste avant l'arrêt. `SA_SMOKE_SHOW=1` : fenêtre visible (nécessaire pour capturer la vue de visualisation d'une fenêtre scindée, dans `<capture>-bas.png`). `SA_SMOKE_MIRROR_JS=/chemin/script.js` : script joué dans la vue de visualisation de la fenêtre scindée.


### Suite de tests

~~~bash
npm test                  # tous les tests
npm test -- notation      # fichiers dont le nom contient « notation »
~~~

À relancer EN ENTIER après chaque changement.

- `tests/unit/*.test.mjs` : modules purs (`node --test`) — notation, cohérence des 8 langues, clés de traduction utilisées dans le code.
- `tests/app/*.test.js` : application réelle, lancée sans fenêtre (lancement de contrôle) sur une copie de `tests/fixtures/analyse-base` (8 systèmes, 55 marques ; autre analyse : `// fixture: <nom>` en tête du fichier). Harnais : `tests/app/_harness.js` (`T.test`, `T.eq`, `T.ok`, `T.includes`, `T.until`, `T.mark`, `T.imp`, `T.readFile`…). Toute erreur de la console du renderer fait échouer le fichier.
- Lanceur : `tests/run.mjs`. Côté processus principal, `SA_TEST` (fichier des résultats) active les canaux `test:done`, `test:readFile`, `test:listFiles`.

### Localisation

Textes dans `locales/<langue>/` (`ui.yaml`, `messages.yaml`, `errors.yaml`) : `fr` (référence), `en`, `de`, `it`, `es`, `zh`, `ja`, `ko`. `t()` dans `main/i18n.js` et `renderer/js/i18n.js`.

Langue : préférence `lang` de l'application (menu « Analyse > Langue », relance de l'application), sinon langue du système si elle est traduite, sinon français. Un texte absent d'une langue est pris en français.

Toute nouvelle clé s'ajoute dans **toutes** les langues (même structure, mêmes variables `%{…}`).


## Les objets

### Association de l'objet avec son système

Pour permettre leur déplacement avec le système (lorsque le système est déplacé, ce qui constitue une opération courante pour bien gérer l’espace) les objets sont associés à leur système.

Pour certains objets, l’opération est simple : lorsque l’objet se trouve naturellement *sous* le système (chiffrage romain) alors il est associé au système juste au-dessus, si l’objet se trouve naturellement *au-dessus* du système (les accords, les parties, etc.) alors le système de l’objet est celui juste en dessous.

Mais pour les autres types d’objets, il est nécessaire de trouver le système le plus prêt d’eux. Pour ce faire, on compare :

~~~
distance haut objet / bas du système au-dessus
									<=>
distance bas objet / haut du système au-dessous
~~~

Noter que les calculs fonctionnent aussi si l’objet se trouve à l’intérieur du système.

## Analyse

Une analyse est consigné dans un dossier quelconque n'importe où sur tout support.

Ce dossier contient :

* un fichier YAML d'identité, contenant les données générales de l'application
* un fichier YAML des préférences, définissant notamment la position des systèmes,
* un fichier YAML des marques d'analyse
* un dossier contenant les images des systèmes (qui doivent tous être séparés)
* un dossier 'assets' qui servira plus tard si l'on veut développer l'application plus loin.

### Fichier d'identité

Le fichier d'identité porte le nom `analyse_id.yaml`. Il définit :

* `id`. Identifiant de l'application (attention : l'unicité n'est pas vérifiée),
* `analyse_title`. Titre générale de l'analyse (pas de l'œuvre),
* `piece_title`. Titre de l'œuvre analysée,
* `piece_composer`. Compositeur, sous forme "NOM, Prénom"
* `analyst`. Patronyme de l'analyste "NOM, Prénom"

### Fichier préférences

Le fichier des préférences porte le nom `preferences.yaml`. Il définit :

* `systems_positions`. Position de chaque système (1 image = 1 système)
* `auto_save`. Pour l'auto-sauvegarde.

### Fichier des marques d'analyse

Ce fichier contient toutes les marques d'analyse à poser sur la table d'analyse.



## Notation des accords (batave / italienne)

- Accords (marques accord, modulation, emprunt) TOUJOURS enregistrés en batave. Conversion : `renderer/js/lib/notation.js` (pur), branchements : `renderer/js/Notation.js`.
- Préférences de l'analyse : `notation_display` (police des marques : `PhilNote` ou `PhilNoteIt`, variable CSS `--philnote-font` ajoutée aux styles des préférences, donc aussi aux exports) et `notation_input` (notation remise dans le champ d'édition).
- Validation : noms italiens (toute casse) → lettres. « Do » = C seulement en entrée italienne (sinon Ré + « o »). Après « / », la casse est gardée (« sol/mi » → « G/e »).
- Marques texte : « Do », « Ré », « Sol »… (forme exacte) mis dans la police des notes (`AMark#tunize`), sauf « La » et « Si » en début de phrase.
- Écriture américaine (#234) : `notation_display: 'us'`, police `PhilNoteUs` (`assets/fonts/PhilNote7-us.otf` : PhilNote7 + glyphes de PhilNote6-US — cadences IAC, PC, DC, HC, altération avant le chiffre, M7). Fabrication : `_scripts/polices/philnote_us.py`. Contenu toujours en batave.
- Police `assets/fonts/PhilNote7-it.otf` : PhilNote7 dont les capitales A à G sont les noms italiens. Fabrication : `_scripts/polices/philnote_it.py` (fontforge).

## Vérifications (#237)

- `renderer/js/Verifications.js` : accords (et seulement eux) qui se chevauchent écrits en rouge (classe `chord-overlap`, retirée des exports), « ! » rouge à droite de la bande du haut, liste des erreurs (clic : accords montrés et sélectionnés ; « × » : erreur retirée, plus signalée, préférence cachée `checks_dismissed`).
- Contrôle relancé (différé) après toute modification de l'analyse, tout changement des styles des préférences (tailles, écriture des accords) et au chargement.

## Forme

Marques de forme : type `frm`, sous-types (`TYPES_FORME`, `Constants.js`) `fpar`/`fsec`/`fseg` (début de partie, section, segment) et `fparz`/`fsecz`/`fsegz` (fins). Une fin est associée à sa marque de début par `data.start` (identifiant) et prend son nom. Menu « Forme » : `Forme.js`.

Construction de la forme, fin d'une portion (`Forme.endOf`) :

1. la marque de fin associée au début, si elle existe ;
2. sinon le premier début de portion suivant, de même niveau ou de niveau supérieur (une partie termine aussi une section) ;
3. sinon la fin de la pièce.

Construction (`FormeBuilder.js`, styles `css/Forme.css`) : `div#form-diagram` sur la table, avant (partition descendue si la place manque) ou après la partition. « Forme générale » : une ligne avec les portions du plus haut niveau sur toute la pièce ; puis, pour chacune, son nom en titre et une ligne de détail (sections, segments). Portions non définies : blocs vides (`FormeBuilder.gapsOf`). Proportionnalité ligne par ligne ; même largeur de mesure pour toutes les lignes de détail. Selon les réglages (préférences cachées `form_build_measures`, `form_build_keys`), tonalités au-dessus des blocs (tonalité courante au début de chaque ligne et de chaque partie, puis modulations) et numéros de mesure dessous. Redessinée à l'ouverture de l'analyse (préférence `form_built`, évènement `systems:loaded`). Noir et blanc ; couleurs des préférences en mode couleur. À l'export, pages à elle seule, coupées entre ses blocs (cf. `Exporter`, `formItem`, `formSlices`).

Type de la forme (liste modifiable `form_types` de `locales/<langue>/ui.yaml`, « other » en dernier), précision et description : panneau « Construire la forme », enregistrés dans `infos.form` ({type, other, precision, description}), affichés en tête de la forme.


## Extrait de partition

Marque de type `ext` (`AMExtrait`, `AMark.js`) : image composée de morceaux d'images de systèmes, `data.pieces` = [{image, x1, x2, y1, y2, dx, dy}] (bornes dans l'image du système, position dans l'extrait, en px des images), `data.scale` (px de la table par px des images), contenu = mesures (« 12 », « 12-15 »). Image : fichier `images/extrait-<id>.png` de l'analyse (`data.file`), écrit à l'assemblage (canevas, fond blanc, `multiply` ; canal `extract:save`), modifiable hors de l'application comme les images des systèmes ; avant le premier assemblage, morceaux assemblés à l'affichage (data URL). Redimensionnable sur la table (proportions gardées), taille gardée dans `data.scale`.

Morceaux proposés (`AMExtrait.extractOf`) : un par système traversé (barres de mesure lues dans l'image, cf. `Forme.barlineNear`), sans l'en-tête du système pour une mesure qui le commence (`HEADER_STAVES` hauteurs de portée, `HEADER_STAVES_FIRST` pour le premier système, métrique comprise) ; en tête, en morceau séparé, l'en-tête du système de la première mesure. Hauteur des morceaux limitée à ce qui est imprimé, image assemblée rognée de même (`INK_MARGIN`, `AMExtrait.trimmed`). Alignement (`AMExtrait.aligned`) sur les lignes de portée du premier morceau ; un morceau dont les portées sont espacées autrement est coupé entre ses portées (rangée la moins encrée).

Assemblage : `ExtraitComposer.js` (à la création et au double-clic), boite `#ext_composer_panel` avec la zone d'assemblage (morceaux recadrables par les 4 bords, déplaçables à la souris et aux flèches) ; « Assembler » recompose et réécrit l'image ; mesures changées (sortie du champ) : morceaux de ces mesures. Menu contextuel « Ouvrir l'image » : son fichier, ouvert par l'application du système (canal `extract:open`) ; « Recharger l'image » : le fichier relu (`showImage`).


## Mise en page

Marque de type `lay` (`TYPES_MISE_EN_PAGE`, `Constants.js`) : `pag` (saut de page), `del` (délimitation, contenu = hauteur « 10 mm », « 1 cm », « 20 pt »…), `tit` (titre, `data.level` 1 à 3, choisi après le sous-type dans `AMark_Editor`). Saut de page et délimitation : ligne sur la largeur des systèmes, non exportée. Titres : police et taille en préférences (`layout_title_<n>_font/size`), espaces avant/après à l'export (`layout_title_<n>_before/after`).

Export (`Stage.respace`) : blocs = systèmes avec leurs éléments, titres ; espace avant un bloc = hauteur de la délimitation qui le précède, sinon espace avant/après du titre, sinon au plus l'espace blanc vertical maximal. Sauts de page : `Stage.breaks`, coupures imposées dans `paginate` (mode « pages de taille fixe » seulement).


## Groupement des marques

`renderer/js/Groups.js` (menus « Marque > Grouper » Cmd/Ctrl+G, « Dégrouper » Cmd/Ctrl+Maj+G, « Ajouter au groupe »).

`data.groups` d'une marque : identifiants (`g1`, `g2`…) de ses groupes, du plus intérieur au plus extérieur (groupes imbriqués). Sélectionner une marque sélectionne toutes celles de même groupe extérieur (`AObjet.groupOf`, dans `addToSelection` et `removeFromSelection`) : déplacement, suppression, etc. ensemble. « Dégrouper » retire le groupe extérieur ; « Ajouter au groupe » met les autres unités sélectionnées dans le groupe extérieur de la première marque groupée. Ancienne propriété `grp` (groupes plats) convertie au chargement (`Groups.migrate`).


## Liaisons

`renderer/js/Liaison.js` (menus « Marque > Relier / Délier », menus contextuels) : marque de type `lia` reliant deux marques (`TYPES_RELIABLES` : cercle, cadre, forme, texte, motif, type de note), données `from`, `to`, `style` (`DEFAULT_STYLE`), `top`/`left` recalculés. Courbe de Bézier quadratique dans un `<svg class="liaison">` de la table, visant le centre de chaque marque et arrêtée sur son bord (boite, ellipse pour un cercle) ; redessinée (une fois par image) dès qu'un élément de la table change (`MutationObserver`, `Liaison.observeTable`). Marque supprimée : ses liaisons aussi. Sélection propre (hors `AObjet.selection`) : clic, double-clic ou Entrée (édition), Effacer. Export : liaisons de la copie redessinées après `respace` (`Liaison.drawIn`), zone de clic (`lia-hit`) retirée.

Édition : `LiaisonEditor.js`, réglages montrés aussitôt (aperçu, `Liaison#previewStyle`), gardés par « OK » (`confirmStyle`), annulés par « Renoncer » ou la croix (`cancelStyle`). Types de liaison (styles nommés) : préférence `link_types` de l'application (canaux `liaisons:getTypes`, `liaisons:saveTypes`), communs à toutes les analyses.


## Historique de l'analyse

`renderer/js/History.js` : étapes de la construction (infos, marques, positions des systèmes ; ni préférences, ni options, ni sélections, ni verrouillages) dans `history.jsonl` du dossier de l'analyse (une étape JSON par ligne : état initial complet, puis changements). Étape mémorisée 0,8 s après la dernière modification (`Analyse#setModified`). Menu « Fichier > Historique de l'analyse… » : retour à une étape = nouvelle étape `restore`, enregistrement puis rechargement.


## Zoom

Menu « Fenêtre > Zoom > Augmenter / Diminuer » (⌘/Ctrl + « + » / « - », `main/main.js`, `changeZoom`) : zoom de la vue d'édition = zoom qui fait tenir les systèmes dans la fenêtre (`fitZoom`, `window:fitWidth`) × zoom choisi (`userZoom`, paliers `ZOOM_STEPS`), gardé avec l'analyse (préférence cachée `zoom`, écrite tout de suite dans `preferences.yaml`, `Analyse#saveZoom`). Les éléments d'interface gardent leur taille (`--ui-zoom`, message `window:zoom`). La vue de visualisation de la fenêtre scindée garde son propre zoom.

## Fenêtre scindée

Menus « Options > Scinder la fenêtre » et « Fenêtre > Scinder la fenêtre » (raccourci ⌘/Ctrl + Maj + « : » sur le clavier français, caractère « / » ; géré par la page, `KeyboardEvents.js`, le raccourci natif du menu répondant à ⌘ + « : ») : la page demande le numéro de la mesure à afficher en haut (par défaut 6 mesures avant la première mesure visible, `Split.defaultMeasure`), puis `main/main.js` (`openSplit`) place au-dessus de la page de l'application (vue d'édition, en bas, plus grande) une `WebContentsView` qui charge `sa://viewer/index.html?mirror=1&measure=N` (vue de visualisation ; autre hôte que `sa://app` pour que son zoom, `VIEWER_ZOOM`, ne s'applique pas à la vue d'édition), séparée par une barre (`renderer/splitter.html`, agrandie à toute la fenêtre pendant son déplacement). La page réserve en haut la place cachée (`--split-inset`, aussi pris en compte par `keepInView` pour les panneaux et par « Aller à la mesure »). Refermée au rechargement de la page.

Vue de visualisation (`IS_MIRROR`, `renderer/js/api.js`, `renderer/js/Split.js`) : analyse ENREGISTRÉE (`split:getCurrent`, sans les opérations de l'ouverture) ; ni menus, ni taille de fenêtre, ni historique, ni enregistrement. Aucune action : voile (`div#split-veil`), souris et clavier arrêtés, focus rendu à la vue d'édition ; seul le défilement passe. Bouton « Actualiser » (en haut à droite) : rechargement de la page, position gardée (`sessionStorage`). Aucune synchronisation entre les deux vues.

## Partage à distance (#220)

Un analyste partage en direct son analyse avec des spectateurs invités (lecture seule).

- **Serveur** : `serveur/ta-partage/` (Node ≥ 22.13, `ws`, `nodemailer`, base `node:sqlite`), indépendant de tout autre service. Sur AlwaysData : code dans `~/ta-partage/`, lancé par `start.sh` (SMTP de `~/.secrets/smtp.env`), base `~/data/ta-partage/partage.sqlite` (adresses confirmées, pseudo, empreintes des jetons). Les analyses partagées restent en mémoire : effacées à l'arrêt, ou après une heure d'absence de l'analyste.
- **Analyste** : aucune formalité. « Inviter… » (nom vu des spectateurs, adresses) ; la première fois, `POST /analyste {pseudo}` donne un jeton sans email (`partage_analyste_jeton`).
- **Spectateur** : chaque invitation lui est envoyée par email avec la marche à suivre (et, la première fois, un code à 6 chiffres) ; « Outils › Partage › Rejoindre… » : adresse + code (`POST /valider`) → jeton gardé (`partage_jeton`, `partage_email`) ; ensuite « Rejoindre… » suffit (`list` : analyse choisie dans la liste, bouton « Rejoindre »). « Recevoir un nouveau code » : `POST /identifier`. L'analyste est averti de chaque arrivée (`joined`).
- **Sauvegarde automatique** (#225) : seuls les enregistrements partent vers les autres. Analyse sans sauvegarde automatique : à « Inviter » (analyste) et à la prise de la main (spectateur), question « l'activer le temps du partage ? » ; oui → `Current.forceAutosave` (la préférence de l'analyse reste inchangée). Lancement de contrôle : `SA_SMOKE_DIALOG=oui|non`.
- **Barre latérale de l'analyste** (#229) : à droite (300 px, `Current.sidebar`), fenêtre élargie d'autant (ou analyse réduite, `window:fitWidth` avec `sidebar`) ; spectateurs invités/connectés, main passée et « Reprendre la main », demandes de la main, événements (`joined`, `left`), bouton rouge « Mettre un terme au partage », message aux spectateurs (`say` → `said`, créateur du partage seulement, affiché chez les spectateurs dans un panneau). La partie visible envoyée aux spectateurs exclut la barre.
- **Connexion** au serveur seulement pendant un partage, un suivi, ou le temps de chercher les partages proposés (#223).
- **WebSocket `/ws`** (JSON) : `hello`, puis analyste `start`, `invite`, `file` (base64), `remove`, `saved`, `view`, `stop`, `resume` ; spectateur `accept`, `leave`, `list`. Serveur : `welcome`, `joined`, `begin`/`file`/`ready` (envoi complet), `saved`, `view`, `owner`, `count`, `end`, `gone`.
- **La main** (#221) : spectateur `ask` (menu « Demander la main… », ⌘/Ctrl + Maj + M) → analyste `request` ; `grant` (les autres demandes sont closes : `requestClosed`, `askClosed`) ou `deny` (`denied`) ; `takeback`. `control` {on} change le mode de la page (rechargée) ; `controller` annonce aux autres spectateurs qui a la main. Celui qui a la main envoie fichiers et partie visible ; l'analyste qui l'a donnée reçoit les fichiers dans son propre dossier (seulement les fichiers partagés). Le spectateur qui a la main s'en va : elle revient à l'analyste.
- **Application** : `main/Partage.js` (connexion, envoi des différences du dossier après chaque écriture, réception dans `<données utilisateur>/partages/<id>/`), `renderer/js/Partage.js` (panneaux, bandeau, notifications, lecture seule, marques refaites à chaque enregistrement sans recharger la page, sauf systèmes déplacés ou préférences changées). Carnet d'adresses : `partage_contacts`, `partage_groupes`.
- **Essais** : `node --no-warnings server.js` (sans `SMTP_SERVER`, les emails sont écrits dans le journal) ; application : `SA_PARTAGE_URL=http://localhost:<port>`. Lancement de contrôle : `SA_PARTAGE_JETON`, `SA_PARTAGE_EMAIL`, `SA_PARTAGE_PSEUDO` (identité d'essai), `SA_PARTAGE_TRACE=1` (messages reçus).
