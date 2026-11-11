<style type="text/css">
.cmd {display:inline-block;background-color:#555;color:white;font-family:Courier;padding:4px 12px;}
  .cmd:before {content:"$> ";}
  .key, key {display:inline-block;border:1px solid;padding:0px 4px 1px;border-radius:4px;}
</style>


# Tutoriel Score-Analyse

Ce tutoriel présente le procédure complète d’une analyse avec la suite **ScoreSuite** et principalement **ScoreAnalyse** qui en est la pièce centrale.



[TOC]

## Procédure complète

---

Voyons comment produire l’analyse d’une pièce de musique que nous avons en partition (récupérée par exemple sur le site de l’[ISMLP](https://imslp.org). Pour l’exemple, ce sera le premier prélude du clavier bien tempéré de Jean-Sébastien Bach.

<a name="dossier-analyse"></a>

### Dossier de l’analyse

La première chose à faire est de créer un dossier dans lequel seront placés tous les éléments de notre analyse. J’appelle ce dossier **`Analyse_CBT1_p1`** (“CBT1” signifie “premier clavier bien tempéré” et “p1” signifie “Premier prélude”).

Je place dans un dossier **`Divers`** de ce dossier la partition récupérée en PDF sur le site de l’[ISMLP](https://imslp.org). Je la renomme **`Partition_originale.pdf`** (mais cela n’a pas d’importance pour la suite, si ce n’est pour en parler plus simplement).

> Je placerai dans ce dossier tous les fichiers qui ne seront pas vraiment utiles à l’analyse.

### Séparation des pages en images

Pour pouvoir manipuler la partition, je vais devoir séparer le fichier PDF (noter qu’il contient tout le cahier, dans la version que j’ai téléchargée) en plusieurs fichier image au format `JPEG`. Pour ce faire, j’ouvre la partition dans l’application **Aperçu** (**Preview** en anglais), je sélectionne la première page, je l’exporte en JPG dan mon dossier `Divers`, avec pour nom **`page1.jpg`** et une qualité maximale. Je fais la même chose pour la seconde page avec le nom **`page2.jpg`**.

Je me retrouve donc à présent avec cette hiérarchie d’éléments :

~~~bash
Analyse_CBT1_p1 | 
								| Divers  |
													| Partition_originale.pdf
													| page1.jpg
													| page2.jpg
~~~

<a name="decoupe-systems"></a>

### Découpage des pages de la partition en systèmes

Pour pouvoir analyser confortablement la partition, nous devons écarter les systèmes afin de laisser assez de place pour mettre toutes les marques d’analyse. Dans ce but, nous devons découper la partition en systèmes.

Pour découper les pages `jpeg` de la partition en systèmes, nous utilisons **`ScoreCutting`**.

Je commence par place l’image `page1.jpg` à la racine du dossier principal `Analyse_CBT1_p1` (je laisse l’autre page à sa place).

Je controle-clique sur le dossier `Analyse_CBT1_p1` et j’ouvre un nouveau Terminal à ce dossier. Et je joue la commande :

<span class="cmd">score-cutting</span>

Cela ouvre la première page dans **ScoreCutting**. 

Il suffit maintenant de double-cliquer aux endroits où il faut faire la découpe, c’est-à-dire le plus près du haut et du bas de chaque système.

> Attention, il faut absolument 2 lignes de coupe par système.

Je confirme la découpe si elle convient et je demande d’y procéder avec le bouton `Procéder à la découpe`.

Cela produit un dossier **`systems`** dans le dossier racine de l’analyse dans lequel sont rangés tous les systèmes de la première page.

Je remets le fichier `page1.jpg` dans le dossier `Divers` et je place le fichier `page2.jpg` (la deuxième page) dans le dossier principal. 

Je demande le rechargement de **ScoreCutting**, qui va prendre en compte, maintenant, la deuxième page de la partition.

**ATTENTION** : Commencer par bien régler le champ « N° premier système », en bas de l’interface, avec le numéro de système suivant. Si le dernier système de la première page portait le numéro **6** (ce qu’on peut voir dans le dossier `systems` alors il faut mettre **7** ici, pour que le premier système de la page 2 soit le système 7.

Comme pour la première page, placer les doubles lignes de découpe et procéder au découpage.

Si vous avez procédé correctement à l’opération, vous devez vous retrouver avec **12 systèmes** dans le dossier `systems`.

Replacer le fichier `page2.jpg` dans le dossier `Divers`, nous ne devrions plus en avoir besoin.

#### Retouche des images systèmes

On peut retoucher les images des systèmes dans n’importe quel logiciel de dessin (ou même Aperçu, en masquant les « taches » avec des cadres/formes blanches) pour supprimer les petits bouts de texte qui ont éventuellement dépassé.

### Mise en place de l’analyse

Nous allons bientôt pouvoir procéder au début de l’analyse. Dans la fenêtre de Terminal que nous avons ouverte (dans le dossier où nous voulons placer l’analyse), tapons la commande :

<span class="cmd">score-analyse analyse</span>

**ScoreAnalyse** nous demande si nous voulons créer une nouvelle analyse dans ce dossier, qui portera le nom « analyse ». Nous confirmons que c’est bien ça que nous voulons faire.

L’application réclame alors quelques informations sur la pièce et l’analyse elle-même.

Elle détecte le dossier `systems` et nous demande s’il contient les systèmes de la partition. Nous confirmons que oui.

**ScoreAnalyse** procède alors à la création de l’analyse, ce qui produit la hiérarchie suivante :

~~~bash
Analyse_CBT1_p1 | 
								| analyse | analyse_tags.yaml (fichier contenant les tags/marques)
								|					| infos.yaml        (fichier des informations de l'analyse)
								|					| backups | 				(dossier pour mettre les backups)
								|					| preferences.yaml
								|					| systems | 				(dossier des systèmes)
								|
								| Divers  |
								|		 	  	| Partition_originale.pdf
								|	 	  		| page1.jpg
								| 				| page2.jpg
								| systems | system-01.jpg
													| system-02.jpg
													| etc.
~~~

### Ouverture de l’analyse

L’analyse est aussitôt ouverte dans Firefox. Nous pouvons voir trois textes d’accueil expliquant les opérations de base et les systèmes que nous avons confectionnés, répartis régulièrement sur la page.

### Définition de la taille de la fenêtre

Nous pouvons redimensionner la fenêtre de Firefox pour voir entièrement les systèmes en largeur. 

Pour conserver cette dimension, afin qu’elle soit appliquée à chaque chargement de l’analyse, nous enregistrons notre analyse. Cela peut se faire avec le raccourci <span class="key">⌘</span> <span class="key">s</span> ou en cliquant sur le bouton « Enregistrer ».

### Sélection et destruction de marque/textes

Nous allons commencer par supprimer les petits textes d’aide affichés en haut de page.

Pour sélectionner, ScoreAnalyse utilise une fonctionnalité très pratique : inutile, comme dans les autres logiciels, de cliquer sur les éléments à sélectionner. Il suffit de tenir la touche majuscule appuyée (⇧) et de glisser la souris sur les éléments. C’est de cette manière que je sélectionne très rapidement les trois premiers textes.

Je joue ensuite la touche <span class="key">⌫</span> (effacement arrière) pour supprimer ces trois textes. Je peux enregistrer l’analyse pour consigner ce choix.

### Premiers accords et premières harmonies

Nous allons créer nos premiers accords et nos premières harmonies. 

Pour les accords, nous double-cliquons à l’endroit voulu au-dessus du premier système, nous choisissons « Accord » (ou nous tapons « a ») puis nous confirmons, puisque le premier accord est un DO majeur (C) et que c’est justement le choix par défaut. Nous pouvons ajuster la position de cet accord à la souris, ou avec les flèches. 

Nous double-cliquons au-dessus de la deuxième mesure, nous tapons <key>a</key> puis « Dm7 » puisque c’est le second accord.

> Si vous avez cliqué à peu près au niveau du premier accord (en hauteur), les deux accords **sont automatiquement alignés**.

Nous pouvons placer les harmonies. Nous double-cliquons sous la première mesure, nous choisissons le menu « Harmonie » (ou nous tapons <key>h</key>) et nous confirmons puisque le premier choix est « I » (1 en chiffre romain) et que c’est justement le degré du premier accord. Ajustons la position avec les flèches du clavier, cette fois-ci.

Plaçons de la même manière l’harmonie de la deuxième mesure. C’est un deuxième degré (II) dans sont 3e renversement, nous tapons donc « II*** » dans le champ puis nous tapons entrée. Vous notez que ScoreAnalyse ajoute automatiquement le « 7 » entendu qu’un accord dans son troisième renversement possède forcément sa septième.

> À nouveau, les harmonies sont automatiquement alignées si elles sont proches.

### Ligne de prolongation

Ajoutons une ligne de prolongation à nos harmonies, entendu qu’elles perdurent sur toute la mesure. Pour ce faire, double-cliquons sur le « I » (il se met en édition) et ajoutons « -- » (deux tirets) après ce « I ». Entrée pour finir. Une ligne de prolongation a été ajoutée. Nous pouvons l’allonger sous toute la mesure en tirant sur sa poignée (qui apparait lorsqu’on glisse la souris vers sa fin).

Nous pouvons procéder de la même manière pour les accords au-dessus du système.

Procédons à l’enregistrement de nos premiers « tags » (nos premières marques d’harmonie) à l’aide du raccourci clavier <key>⌘</key><key>s</key>.

### Déplacement des systèmes

Si nous trouvons que notre premier système est trop bas (ou trop haut), nous pouvons le déplacer.

Par défaut, les systèmes sont verrouillés (pour éviter les erreurs), nous devons donc d’abord les déverrouiller en cliquant sur le cadenas en bas à droite de la fenêtre (qui est vert, indiquant que le verrou est actif). Maintenant les systèmes sont déverrouillés.

Nous cliquons une fois sur le premier système (sans tenir la souris appuyée) et nous 

### Quitter l’analyse

Nous pouvons quitter l’analyse à l’aide du raccourci <key>⌘</key><key>q</key>.

Nous pouvons aussi jouer le raccourci <key>⌃</key><key>c</key> dans la fenêtre Terminal ouverte pour lancer l’application (rappel : <key>⌃</key> correspond à la touche <key>control</key>).

### Relancer l’analyse

Pour relancer l’analyse, nous allons revenir dans notre fenêtre Terminal et jouer :

<span class="cmd">cd analyse</span>

… pour nous placer dans le dossier de l’analyse (rappelons-nous qu’il faut toujours se placer dans le dossier de l’analyse pour la charger à l’aide de la commande suivante) et taper :

<span class="cmd">score-analyse .</span>

> Ne pas oublier le point, qui signifie « dans le dossier courant ».

### Fabrication d’un extrait de musique

Maintenant, nous avons besoin d’un extrait qui va reprendre la première mesure en la réduisant à un seul système, avec une seule voix. 

Pour ce faire, nous allons utiliser l’outil de « partition rapide » dans le panneau Outils.

Pour **ouvrir le panneau Outils**, nous pouvons activer le menu `Fichier > Panneau outils…` ou jouer le raccourci clavier <key>⇧ o</key> (« o » comme « Outils » bien sûr). 

En haut de ce panneau, nous trouvons un champ (noir) dans lequel nous pouvons entrer du code *muscore* (pseudo Lilypond) qui sera transformé en partition. Un menu permet d’ajouter des précisions, comme par exemple la tonalité ou la suppression des hampes pour les notes.

Tapons dans la champ `c16 e g c e g, c e`, et  cliquons sur le bouton <bouton>Construire</bouton> qui se situe en bas à droite du champ.

Après quelques secondes, l’app renvoie un message indiquant que l’image a été construite et que **son nom a été placé dans le presse-papier**. Il nous suffit donc de l’insérer dans la page de cette manière :

Nous fermons la boite à outils avec <key>⇧ o</key>, nous double-cliquons à l’endroit voulu sur la table d’analyse (ici, au-dessus de la première mesure), nous tapons <key>i</key> pour insérer une image et nous tapons <key>⌘v</key> pour coller le nom de l’image nouvellement créée. Nous confirmons enfin avec <key>↩︎</key> et l’image est posée sur la table d’analyse, à l’endroit double-cliqué.

> Pour information, l’image, au format SVG, a été placé dans le dossier `images` de l’analyse et elle a été construite dans le dossier `images/_Chantier/`.

### Fabrication d’un extrait complexe de musique

L’outil « partition rapide » permet de composer des images simples (elle permet en fait de composer n’importe quelle image, mais l’interface est trop rudimentaire pour que ce soit confortable). Pour des images plus complexe — et surtout pour travailler de façon plus confortable —, nous pouvons utiliser **ScoreWriter** de la suite **ScoreSuite**. Reportez-vous à son manuel d’utilisation pour savoir comment l’utiliser.

<a name="backups"></a>

### Récupération d’une sauvegarde

Lorsque nous avons eu un problème ou que nous voulons revenir en arrière dans l’analyse, nous pouvons utiliser un des backups enregistrés dans le dossier `backups` de l’analyse. Il suffit de reprendre les fichiers consignés dans le dossier du backup voulu.

> Les backups sont enregistrés à chaque chargement de l’analyse et les 100 derniers sont conservés.



<a name="exporter"></a>

### Exporter l’analyse en HTML

Je veux à présent exporter cette analyse en HTML pour pouvoir la partager avec une amie ou la déposer sur un site internet. Pour ce faire, j’utilise l’outil d’exportation en activant le menu `Fichier > Exporter en HTML…`.

Un fichier `analyse-JJ_MM_YYYY.html` est produit dans le dossier `exports` de l’analyse (`JJ_MM_YYYY` est remplacé par la date du jour, par exemple `analyse-29-11-2022.html`). Ce dossier contient tous les éléments utiles, à commencer par les images et les fontes (au format `base64`).

---

<a name="table-analyse"></a>

## La table d’analyse

---

<a name="gestion-images"></a>

## Gestion des images et autres extraits de partition

### Extrait de partition simple

J’ai besoin d’un extrait assez simple de partition, sur une seule portée, avec quelques notes. Plutôt que de changer de logiciel, je vais utiliser l’outil de fabrication rapide d’image, dans la boite à outils de l’application.

Pour ouvrir la boite à outils, je peux choisir le menu `Fichier > Boite à outils…` ou activer le raccourci `⌘O`.

En haut de la boite à outils, je trouve un champ (fond noir) dans lequel je vais pouvoir taper du pseudo code Lilypond (Lilypond simplifié) que j’appelle `code MusicScore`. Ce code permet de produire des images très simplement. Je peux produire mon premier extrait simplement en copiant le code suivant dans le champ et en cliquant sur le bouton `Construire`.

~~~bash
-> segment1
c d e f
~~~

La procédure précédente va produire l’image `segment1.svg` dans le dossier `images`de l’analyse et mettre ce nom dans le presse-papier.

Il me reste juste, alors, à double-cliquer sur la [table d’analyse][] à l’endroit voulu, de choisir le type `Image` dans le menu des types qui s’affiche, et de coller le nom de l’image.

Aussitôt, l’image s’insère dans mon analyse !

### Partition plus complexe

J’ai besoin de développer une partition plus complexe, que je serais en peine de développer dans le champ de la boite d’outil. Pour ça, je vais utilise **ScoreWriter** qui offre une interface pratique pour produire des images de partition assez complexes.



[table d’analyse]: #table-analyse
