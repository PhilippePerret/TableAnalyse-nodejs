# Images du manuel — consignes pour Claude

- Garder ce dossier ORGANISÉ : une image = un sous-dossier thématique.
- Créer un nouveau sous-dossier dès qu'un nouveau thème apparaît (p.e. `marques/`, `preferences/`, `forme/`, `systemes/`…).
- Rien à la racine sauf ce README.
- Noms de fichiers : minuscules, tirets, sans accents ni espaces (p.e. `panneau-type-marque.png`).
- Format : SVG par défaut (choix de Phil, 2026-11-22), produit par l'exporteur SVG de l'app (classe `Stage` d'`Exporter.js` : `build`, `prepareForSvg`, `svgOf`, `svgFonts`). PNG Retina ×2 seulement pour ce qui ne passe pas en SVG (panneaux de l'interface).
- Hauteur dans le manuel : `height=N` suffit (extension `_scripts/manuel/extensions/hauteur_images.rb`, chargée par `Manuels/Manuel/macros.rb`).
- Après création d'une image : donner à Phil le code AsciiDoc (`image::images/<dossier>/<fichier>.png[…, width=…]`). Ne jamais modifier les `.adoc`.

## Procédure de capture (détourée, coins et ombre transparents)

1. Copier l'analyse dans le scratchpad (ne jamais travailler sur l'originale).
2. Script renderer (`SA_SMOKE_JS`) : ouvrir le panneau, puis masquer tout le reste
   (`body > *:not(<panneau>) { visibility:hidden }`) et forcer le fond à `white`.
3. `SA_SMOKE=8 SA_SMOKE_JS=… SA_SMOKE_SHOT=f_white.png npx electron --force-device-scale-factor=2 . <analyse>`
4. Même chose avec fond `black` → `f_black.png`.
5. Découper les deux à l'identique (rect du panneau ×2 + marge pour l'ombre), puis avec ImageMagick :
   ```
   magick w.png b.png -compose difference -composite -colorspace gray -negate alpha.png
   magick b.png alpha.png -fx 'v.r>0 ? min(1,u/v.r) : 0' alpha.png -alpha off -compose copy_opacity -composite panel.png
   magick panel.png -crop $(magick panel.png -alpha extract -threshold 1% -format "%@" info:) +repage final.png
   ```
