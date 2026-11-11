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

Fenêtre invisible, messages de la console du renderer recopiés dans le Terminal, script optionnel joué dans le renderer après chargement, arrêt au bout de `SA_SMOKE` secondes.


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



## Groupement des tags

Depuis la version de novembre 2022, on peut grouper les tags, ce qui permet notamment de les déplacer ou de les supprimer ensemble.

QUESTION : comment les tags sont-ils groupés.

C’est une propriété ‘grp’ qui signifie “groupe” qui liste tous les tags associés

Pour le moment, je considère que cette liste doit contenir tous les ID de tags, même celui qui possède la propriété. Cela permet d’actualiser les listes très facilement, sans avoir à enlever l’ID du tag 

Par exemple :

~~~javascript
T1 et T5 sont associés :
T1.grp = [1, 5]
T5.grp = [1, 5]
~~~

Les méthodes à créer

~~~javascript
groupWith(tag) // regroupe (attention 

degroupFrom(tag) // dégroupe

isGrouped // => true si le tag est associé

isGroupedWith(tag) // => true si associé au tag +tag+
~~~



