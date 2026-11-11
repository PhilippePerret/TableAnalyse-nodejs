
/**
 * Préférences propres à l'application
 * 
 */

export const PreferencesAppData = {
    theme                   :{type:'select'       ,typeV:'string'   ,default:null     ,label:'Thème analyse', values: null /* défini par Preferences */, precision:'Définit les tailles à appliquer ainsi que les couleurs (dans le mode couleur de l’analyse)'}
  , lock_systems            :{type:'checkbox'     ,typeV:'boolean'  ,default:false    ,label:'Verrouiller les systèmes'}
  , grid_horizontal_space   :{type:'inputtext'    ,typeV:'number'   ,default:50       ,label:'Espacement horizontal sur le grille'}
  , grid_vertical_space     :{type:'inputtext'    ,typeV:'number'   ,default:50       ,label:'Espacement vertical sur le grille'}
  , systeme_width           :{type:'inputtext'    ,typeV:'number'   ,default:1860     ,label:"Largeur (en pixels) des systèmes", selector:'img.systeme', selector_value:"width:__VALUE__px;"}
  , top_first_system        :{type:'inputtext'    ,typeV:'number'   ,default:50       ,label:"Décalage haut du premier système (en pixels)"}
  , distance_systemes       :{type:'inputtext'    ,typeV:'number'   ,default:50       ,label:"Distance par défaut (en pixels) des système"}
  , adjust_same_mark        :{type:'checkbox'     ,typeV:'boolean'  ,default:true     ,label:"Ajuster en hauteur les marques de même type"}
  , snap_for_adjust_pos     :{type:'inputtext'    ,typeV:'number'   ,default:50       ,label:"Distance magnétisme alignement marques", precision:"Affecte les marques de même type et seulement si la préférence “Ajuster en hauteur” ci-dessus est activée."}
  , marque_accords_size     :{type:'inputtext'    ,typeV:'number'   ,default:26       ,label:"Taille des marques d'accord"      ,unite:'pt' ,selector:'div.aobj.acc span.content', selector_value:'font-size:__VALUE__pt;'}
  , marque_harmonie_size    :{type:'inputtext'    ,typeV:'number'   ,default:26       ,label:"Taille des marques d'harmonie"    ,unite:'pt' ,selector:'div.aobj.har span.content, div.aobj.cad span.content', selector_value:'font-size:__VALUE__pt;'}
  , marque_modulation_size  :{type:'inputtext'    ,typeV:'number'   ,default:26       ,label:"Taille des marques d'harmonie"    ,unite:'pt' ,selector:'div.aobj.mod span.content', selector_value:'font-size:__VALUE__pt;'}
  , marque_emprunt_size     :{type:'inputtext'    ,typeV:'number'   ,default:24       ,label:"Taille des marques d'emprunt"     ,unite:'pt' ,selector:'div.aobj.emp span.content', selector_value:'font-size:__VALUE__pt;'}
  , marque_cellule_size     :{type:'inputtext'    ,typeV:'number'   ,default:26       ,label:"Taille des noms de cellules"      ,unite:'pt' ,selector:'div.amark.cel span.content', selector_value:'font-size:__VALUE__pt;'}
  , thiness_segment_line    :{type:'inputtext'    ,typeV:'number'   ,default:4        ,label:"Épaisseur trait segments"         ,unite:'px' ,selector:'div.amark.seg'   ,selector_value:'border-width:__VALUE__px;'}
  , thiness_cellule_line    :{type:'inputtext'    ,typeV:'number'   ,default:5        ,label:"Épaisseur trait cellules"         ,unite:'px' ,selector:'div.amark.cel'   ,selector_value:'border-width:__VALUE__px;'}
  , thiness_border          :{type:'inputtext'    ,typeV:'number'   ,default:4        ,label: 'Épaisseur des traits de boites'  ,unite:'px' ,selector:'div.amark.bbx:not(.cel):not(.bxt) span.content, div.amark.bbx.bxt' ,selector_value:'border-width:__VALUE__px;'}
  , marque_pedale_size      :{type:'inputtext'    ,typeV:'number'   ,default:40       ,label:"Taille des pédales"             ,unite:'px' ,selector:'div.aobj.ped span.content', selector_value:'font-size:__VALUE__px;width:calc(__VALUE__px / 2);height:calc(__VALUE__px / 2);line-height:calc(__VALUE__px / 2);'}
  , marque_texte_size_1     :{type:'inputtext'    ,typeV:'number'   ,default:60       ,label:"Taille des gros textes"         ,unite:'px' ,selector:'div.amark.txt.size1 span.content'    ,selector_value:'font-size:__VALUE__px;'}
  , marque_texte_size_2     :{type:'inputtext'    ,typeV:'number'   ,default:40       ,label:"Taille des textes moyens"       ,unite:'px' ,selector:'div.amark.txt.size2 span.content'    ,selector_value:'font-size:__VALUE__px;'}
  , measure_line_offset     :{type:'inputtext'    ,typeV:'number'   ,default:150      ,label:"Distance (px) de la ligne des numéros de mesure sous le système"}
  , marque_measure          :{type:'inputtext'    ,typeV:'number'   ,default:24       ,label:"Taille numéros de mesures"        ,unite:'px' ,selector:'div.amark.txt.mes span.content'    ,selector_value:'font-size:__VALUE__px;'}
  , marque_texte_size_3     :{type:'inputtext'    ,typeV:'number'   ,default:24       ,label:"Taille des petits textes"         ,unite:'px' ,selector:'div.amark.txt.size3 span.content'  ,selector_value:'font-size:__VALUE__px;'}
  , marque_texte_size_4     :{type:'inputtext'    ,typeV:'number'   ,default:16       ,label:"Taille des textes très petis"     ,unite:'px' ,selector:'div.amark.txt.size4 span.content'  ,selector_value:'font-size:__VALUE__px;'}
  
  // --- Window ---
  , window_width            :{type:'inputtext'    ,typeV:'number'   ,default:null     ,label:'Largeur de la fenêtre à l’ouverture'}
  , window_height           :{type:'inputtext'    ,typeV:'number'   ,default:null     ,label:'Hauteur de la fenêtre à l’ouverture'}
  , last_scroll             :{type:'inputtext'    ,typeV:'number'   ,default:0        ,label:'Scroll à l’ouverture'}
  
  // --- Couleurs ---
  , color_mesure            :{type:'inputtext'    ,typeV:'color'    ,default:'000099' ,label:'Couleur des numéros de mesure'      ,selectors:'div.amark.txt.mes span.content'}
  , color_accords           :{type:'inputtext'    ,typeV:'color'    ,default:'999999' ,label:'Couleur des noms d’accords'         ,selectors:'div.amark.acc span.content'}
  , color_harmonie          :{type:'inputtext'    ,typeV:'color'    ,default:'999999' ,label:'Couleur des chiffrages harmoniques' ,selectors:'div.amark.har span.content'}
  , color_mark_parties      :{type:'inputtext'    ,typeV:'color'    ,default:'CC0000' ,label:'Couleur des marques de partie'      ,selectors:'div.amark.prt span.content, div.amark.prt span.vline, div.amark.prtz span.content, div.amark.prtz span.vline'}
  , color_mark_sections     :{type:'inputtext'    ,typeV:'color'    ,default:'CC0000' ,label:'Couleur des marques de sections'    ,selectors:'div.amark.sec span.content, div.amark.sec span.vline, div.amark.secz span.content, div.amark.secz span.vline'}
  , color_cellule           :{type:'inputtext'    ,typeV:'color'    ,default:'8383ed' ,label:'Couleur pour les cellules & motifs' ,selectors:'div.amark.cel, div.amark.cel span.content'}
  , color_modulations       :{type:'inputtext'    ,typeV:'color'    ,default:'009900' ,label:'Couleur des marques de modulations' ,selectors:'div.amark.mod:before, div.amark.mod span.content, div.amark.mod span.vline'}
  , color_emprunts          :{type:'inputtext'    ,typeV:'color'    ,default:'22BB22' ,label:'Couleur des marques d’emprunts'     ,selectors:'div.amark.emp, div.amark.emp span.content'}
  , color_segments          :{type:'inputtext'    ,typeV:'color'    ,default:'333333' ,label:'Couleur des segments'               ,selectors:'div.amark.seg, div.amark.seg span.content'}
  
  , vitesse_relecture       :{type:'inputtext'    ,typeV:'number'   ,default:20       ,label:"Vitesse de la relecture (de 1 à 100)", precision:"Ça détermine le temps d'affichage d'un objet en mode relecture. Avec la valeur 100, tous les objets sont à peu près ré-écrit en même temps."}
  , autosave                :{type:'checkbox'     ,typeV:'boolean'  ,default:true     ,label:'Sauvegarde automatique'}
  , animate                 :{type:'checkbox'     ,typeV:'boolean'  ,default:false    ,label:'Animer l’analyse'   ,precision:'Les marques seront affichées progressivement'}
}

// Ajout de l'identifiant aux données
Object.keys(PreferencesAppData).forEach(keyPref => {
    PreferencesAppData[keyPref].id = keyPref
})

