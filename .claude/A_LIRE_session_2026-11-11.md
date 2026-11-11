Les numéros sont maintenant posés sur une ligne fine sous chaque système, et la renumérotation automatique fonctionne. Testé dans l'application sur une analyse d'essai de 3 systèmes :

1. **Ligne des numéros** :
   - **Position** : la ligne, gris clair, est à 150 px sous chaque système par défaut. Les numéros sont posés dessus, sans toucher aux images.
   - **Réglage** : une nouvelle préférence, « Distance (px) de la ligne des numéros de mesure sous le système », agit immédiatement.
   - **Déplacement** : quand on déplace un système, sa ligne et ses numéros suivent. Testé avec un déplacement de 100 px.
   - **Couleur** : les numéros gardent la préférence existante « Couleur des numéros de mesure ».
2. **Numéro ajouté** : un nouveau numéro de mesure se place sur la ligne du système où l'on a cliqué. Le numéro saisi fait foi, et les suivants sont décalés vers le haut. Testé avec un « 3 » ajouté entre 2 et 3 : la suite devient 1…21.
3. **Numéro supprimé** : les suivants sont décalés vers le bas. Testé avec le 3 supprimé : la suite redevient continue.
4. **Numéro modifié** : la nouvelle valeur fait foi pour la suite. Si le 5 devient 40, les suivants deviennent 41, 42…
5. **Portée** : seuls les numéros produits par la découpe sont concernés. Les numéros de mesure déjà présents dans d'autres analyses, sans ligne, ne bougent pas.

J'ai relancé la découpe d'`analyse-2` : elle n'agrandit plus les images pour y loger les numéros. Une analyse déjà créée à partir de l'ancien résultat est à recréer pour en profiter.

Rien n'est commité.
