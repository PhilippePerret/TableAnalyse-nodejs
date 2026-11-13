import { t } from './i18n.js'

/**
 * Préférences propres à l'application
 * 
 */

export const PreferencesAppData = {
    theme                   :{type:'select'       ,typeV:'string'   ,default:null, values: null /* défini par Preferences */}
  , lock_systems            :{type:'checkbox'     ,typeV:'boolean'  ,default:false}
  , grid_horizontal_space   :{type:'inputtext'    ,typeV:'number'   ,default:50}
  , grid_vertical_space     :{type:'inputtext'    ,typeV:'number'   ,default:50}
  , systeme_width           :{type:'inputtext'    ,typeV:'number'   ,default:1860, selector:'img.systeme', selector_value:"width:__VALUE__px;"}
  , top_first_system        :{type:'inputtext'    ,typeV:'number'   ,default:50}
  , distance_systemes       :{type:'inputtext'    ,typeV:'number'   ,default:50}
  , adjust_same_mark        :{type:'checkbox'     ,typeV:'boolean'  ,default:true}
  , snap_for_adjust_pos     :{type:'inputtext'    ,typeV:'number'   ,default:50}
  , marque_accords_size     :{type:'inputtext'    ,typeV:'number'   ,default:26      ,unite:'pt' ,selector:'div.aobj.acc span.content', selector_value:'font-size:__VALUE__pt;'}
  , marque_harmonie_size    :{type:'inputtext'    ,typeV:'number'   ,default:26    ,unite:'pt' ,selector:'div.aobj.har span.content, div.aobj.cad span.content', selector_value:'font-size:__VALUE__pt;'}
  , marque_modulation_size  :{type:'inputtext'    ,typeV:'number'   ,default:26    ,unite:'pt' ,selector:'div.aobj.mod span.content', selector_value:'font-size:__VALUE__pt;'}
  , marque_emprunt_size     :{type:'inputtext'    ,typeV:'number'   ,default:24     ,unite:'pt' ,selector:'div.aobj.emp span.content', selector_value:'font-size:__VALUE__pt;'}
  , marque_cellule_size     :{type:'inputtext'    ,typeV:'number'   ,default:26      ,unite:'pt' ,selector:'div.amark.cel span.content', selector_value:'font-size:__VALUE__pt;'}
  , thiness_segment_line    :{type:'inputtext'    ,typeV:'number'   ,default:4         ,unite:'px' ,selector:'div.amark.seg'   ,selector_value:'border-width:__VALUE__px;'}
  , thiness_cellule_line    :{type:'inputtext'    ,typeV:'number'   ,default:5         ,unite:'px' ,selector:'div.amark.cel'   ,selector_value:'border-width:__VALUE__px;'}
  , thiness_border          :{type:'inputtext'    ,typeV:'number'   ,default:4  ,unite:'px' ,selector:'div.amark.bbx:not(.cel):not(.bxt) span.content, div.amark.bbx.bxt' ,selector_value:'border-width:__VALUE__px;'}
  , marque_pedale_size      :{type:'inputtext'    ,typeV:'number'   ,default:40             ,unite:'px' ,selector:'div.aobj.ped span.content', selector_value:'font-size:__VALUE__px;width:calc(__VALUE__px / 2);height:calc(__VALUE__px / 2);line-height:calc(__VALUE__px / 2);'}
  , marque_texte_size_1     :{type:'inputtext'    ,typeV:'number'   ,default:60         ,unite:'px' ,selector:'div.amark.txt.size1 span.content'    ,selector_value:'font-size:__VALUE__px;'}
  , marque_texte_size_2     :{type:'inputtext'    ,typeV:'number'   ,default:40       ,unite:'px' ,selector:'div.amark.txt.size2 span.content'    ,selector_value:'font-size:__VALUE__px;'}
  , measure_line_offset     :{type:'inputtext'    ,typeV:'number'   ,default:150}
  , distance_after_measure_line :{type:'inputtext' ,typeV:'number'  ,default:100, apply:true}
  , marque_measure          :{type:'inputtext'    ,typeV:'number'   ,default:24        ,unite:'px' ,selector:'div.amark.txt.mes span.content'    ,selector_value:'font-size:__VALUE__px;'}
  , marque_texte_size_3     :{type:'inputtext'    ,typeV:'number'   ,default:24         ,unite:'px' ,selector:'div.amark.txt.size3 span.content'  ,selector_value:'font-size:__VALUE__px;'}
  , marque_texte_size_4     :{type:'inputtext'    ,typeV:'number'   ,default:16     ,unite:'px' ,selector:'div.amark.txt.size4 span.content'  ,selector_value:'font-size:__VALUE__px;'}
  
  // --- Export PDF/SVG (mm) ---
  , export_page_width       :{type:'inputtext'    ,typeV:'number'   ,default:210}
  , export_page_height      :{type:'inputtext'    ,typeV:'number'   ,default:297}
  , export_page_margin      :{type:'inputtext'    ,typeV:'number'   ,default:10}

  // --- Window ---
  , window_width            :{type:'inputtext'    ,typeV:'number'   ,default:null}
  , window_height           :{type:'inputtext'    ,typeV:'number'   ,default:null}
  , last_scroll             :{type:'inputtext'    ,typeV:'number'   ,default:0}
  
  // --- Couleurs ---
  , color_mesure            :{type:'inputtext'    ,typeV:'color'    ,default:'000099'      ,selectors:'div.amark.txt.mes span.content'}
  , color_accords           :{type:'inputtext'    ,typeV:'color'    ,default:'999999'         ,selectors:'div.amark.acc span.content'}
  , color_harmonie          :{type:'inputtext'    ,typeV:'color'    ,default:'999999' ,selectors:'div.amark.har span.content'}
  , color_mark_parties      :{type:'inputtext'    ,typeV:'color'    ,default:'CC0000'      ,selectors:'div.amark.prt span.content, div.amark.prt span.vline, div.amark.prtz span.content, div.amark.prtz span.vline'}
  , color_mark_sections     :{type:'inputtext'    ,typeV:'color'    ,default:'CC0000'    ,selectors:'div.amark.sec span.content, div.amark.sec span.vline, div.amark.secz span.content, div.amark.secz span.vline'}
  , color_cellule           :{type:'inputtext'    ,typeV:'color'    ,default:'8383ed' ,selectors:'div.amark.cel, div.amark.cel span.content'}
  , color_modulations       :{type:'inputtext'    ,typeV:'color'    ,default:'009900' ,selectors:'div.amark.mod:before, div.amark.mod span.content, div.amark.mod span.vline'}
  , color_emprunts          :{type:'inputtext'    ,typeV:'color'    ,default:'22BB22'     ,selectors:'div.amark.emp, div.amark.emp span.content'}
  , color_segments          :{type:'inputtext'    ,typeV:'color'    ,default:'333333'               ,selectors:'div.amark.seg, div.amark.seg span.content'}
  
  , vitesse_relecture       :{type:'inputtext'    ,typeV:'number'   ,default:20}
  , autosave                :{type:'checkbox'     ,typeV:'boolean'  ,default:true}
  , animate                 :{type:'checkbox'     ,typeV:'boolean'  ,default:false}
}

// Ajout de l'identifiant aux données
// et de ses textes (locales/<lang>/ui.yaml, prefs)
Object.keys(PreferencesAppData).forEach(keyPref => {
    PreferencesAppData[keyPref].id = keyPref
    Object.assign(PreferencesAppData[keyPref], t(`ui.prefs.${keyPref}`))
})

