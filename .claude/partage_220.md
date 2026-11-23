# Issue #220 — Partage à distance (spécification validée par Phil, 2026-11-23)

## Serveur (TOTALEMENT séparé de la CAMI, jamais Brevo)
- Service Node `ta-partage`, adresse `partage.analyse-musicale.fr` (DNS chez AlwaysData, site distinct, www intact).
- Code `~/ta-partage/` (script de démarrage façon `~/remark42/start.sh`), base `~/data/ta-partage/partage.sqlite` (emails confirmés, jeton, pseudo).
- Analyses partagées en mémoire seulement ; effacées à l'arrêt ou après 1 h d'absence de l'analyste. Rien de gardé sur le serveur.
- Emails : SMTP AlwaysData (`smtp-icare.alwaysdata.net`, identifiants dans `~/.secrets/smtp.env`). Expéditeur `partage@analyse-musicale.fr` : Phil la créera — LE LUI RAPPELER.
- NE RIEN CRÉER sur le serveur sans en parler à Phil avant.

## Application
- Menus : « Outils › Partage › Inviter… / Arrêter / Rejoindre ».
- Analyste : 1re invitation → pseudo + email, confirmation par email une seule fois (jeton permanent).
- Inviter… : liste des emails déjà invités à cocher, groupes nommés (créer/modifier/supprimer ; cocher un groupe = cocher ses adresses), champ d'ajout, bouton « Inviter et démarrer le partage ».
- Bandeau fixe « En partage · 2 spectateurs sur 3 ».
- Chaque enregistrement → envoyé ; défilement, zoom, partie visible envoyés en continu (spectateur = copie d'écran, mise à l'échelle).
- Arrêter : message convivial aux spectateurs + vide le serveur.
- Spectateur : 1re invitation → email « <pseudo> vous invite… Confirmez votre adresse : [lien] » ; lien → page avec code à 6 chiffres à saisir une fois dans « Outils › Partage › Rejoindre ».
- Ensuite : notification en haut à droite « <pseudo> vous invite à suivre son analyse » [Accepter] [Refuser].
- Lecture seule, bandeau « Analyse suivie · lecture seule » + bouton « Quitter » ; « Rejoindre » pour revenir (actualisée). Connexion perdue → « Reconnexion… ».
- Fin du partage (ou Quitter) : déverrouillage, l'analyse devient celle du spectateur (enregistrer où il veut, modifier, exporter). Message : « Le partage est terminé. Cette analyse est maintenant la vôtre : vous pouvez l'enregistrer, la modifier ou l'exporter. »

## Déploiement (2026-11-23, accord de Phil : créer du neuf, NE RIEN TOUCHER d'existant sur l'hébergement)
- `~/ta-partage/` (code + node_modules), `~/data/ta-partage/` créés ; site AlwaysData « ta-partage » (user_program, `partage.analyse-musicale.fr/`, commande `~/ta-partage/start.sh`, max_idle_time 0, ssl_force) créé par l'API.
- Clé d'API AlwaysData : `~/.secrets/ldq_rails.env` (ALWAYSDATA_API_KEY), utilisée sur le serveur sans jamais l'afficher ; auth `"$K account=icare:"`.
- Mise à jour du code : scp vers `~/ta-partage/` puis redémarrage du site (POST /v1/site/<id>/restart/).
- Reste : adresse `partage@analyse-musicale.fr` à créer par Phil ; essai réel d'envoi d'email.
