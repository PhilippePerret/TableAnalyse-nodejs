import { t } from './i18n.js'

/**
 * Préférences propres à l'application
 * 
 */

export const PreferencesAppData = {
    theme                   :{type:'select'       ,typeV:'string'   ,default:null, values: null /* défini par Preferences */}
  , lock_systems            :{type:'checkbox'     ,typeV:'boolean'  ,default:true}
  , grid_horizontal_space   :{type:'inputtext'    ,typeV:'number'   ,default:50 ,unite:'px' ,apply:true}
  , grid_vertical_space     :{type:'inputtext'    ,typeV:'number'   ,default:50 ,unite:'px' ,apply:true}
  , systeme_width           :{type:'inputtext'    ,typeV:'number'   ,default:1860, selector:'img.systeme', selector_value:"width:__VALUE__px;" ,unite:'px' ,apply:true}
  , top_first_system        :{type:'inputtext'    ,typeV:'number'   ,default:300, apply:true ,unite:'px'}
  , distance_systemes       :{type:'inputtext'    ,typeV:'number'   ,default:50, apply:true ,unite:'px'}
  , max_table_blank         :{type:'inputtext'    ,typeV:'number'   ,default:80 ,unite:'px'}
  , adjust_same_mark        :{type:'checkbox'     ,typeV:'boolean'  ,default:true}
  , snap_for_adjust_pos     :{type:'inputtext'    ,typeV:'number'   ,default:30 ,unite:'px'}
  , marque_accords_size     :{type:'inputtext'    ,typeV:'number'   ,default:26      ,unite:'pt' ,selector:'div.aobj.acc span.content', selector_value:'font-size:__VALUE__pt;' ,apply:true}
  , marque_harmonie_size    :{type:'inputtext'    ,typeV:'number'   ,default:26    ,unite:'pt' ,selector:'div.aobj.har span.content, div.aobj.cad span.content', selector_value:'font-size:__VALUE__pt;' ,apply:true}
  , marque_cadence_type_size:{type:'inputtext'    ,typeV:'number'   ,default:20    ,unite:'px' ,selector:'div.amark.cad div.mtype', selector_value:'font-size:__VALUE__px;' ,apply:true}
  , marque_modulation_size  :{type:'inputtext'    ,typeV:'number'   ,default:26    ,unite:'pt' ,selector:'div.aobj.mod span.content', selector_value:'font-size:__VALUE__pt;' ,apply:true}
  , marque_emprunt_size     :{type:'inputtext'    ,typeV:'number'   ,default:24     ,unite:'pt' ,selector:'div.aobj.emp span.content', selector_value:'font-size:__VALUE__pt;' ,apply:true}
  , marque_motif_size       :{type:'inputtext'    ,typeV:'number'   ,default:24      ,unite:'px' ,selector:'div.amark.mot span.content', selector_value:'font-size:__VALUE__px;' ,apply:true}
  , marque_cellule_size     :{type:'inputtext'    ,typeV:'number'   ,default:26      ,unite:'pt' ,selector:'div.amark.cel span.content', selector_value:'font-size:__VALUE__pt;' ,apply:true}
  , thiness_segment_line    :{type:'inputtext'    ,typeV:'number'   ,default:4         ,unite:'px' ,selector:'div.amark.seg'   ,selector_value:'border-width:__VALUE__px;--bw:__VALUE__px;' ,border:'width',apply:true}
  , thiness_cellule_line    :{type:'inputtext'    ,typeV:'number'   ,default:5         ,unite:'px' ,selector:'div.amark.cel'   ,selector_value:'border-width:__VALUE__px;--bw:__VALUE__px;' ,border:'width',apply:true}
  , thiness_motif_line      :{type:'inputtext'    ,typeV:'number'   ,default:1         ,unite:'px' ,selector:'div.amark.mot'   ,selector_value:'border-width:__VALUE__px;--bw:__VALUE__px;' ,border:'width',apply:true}
  , thiness_border          :{type:'inputtext'    ,typeV:'number'   ,default:4  ,unite:'px' ,selector:'div.amark.bbx.bxt' ,selector_value:'border-width:__VALUE__px;' ,border:'width',apply:true}
  , border_circle           :{type:'inputtext'    ,typeV:'number'   ,default:5  ,unite:'px' ,selector:'div.amark.cir' ,selector_value:'border-width:__VALUE__px;' ,border:'width',apply:true}
  , border_box              :{type:'inputtext'    ,typeV:'number'   ,default:5  ,unite:'px' ,selector:'div.amark.box' ,selector_value:'border-width:__VALUE__px;' ,border:'width',apply:true}
  , border_emprunt          :{type:'inputtext'    ,typeV:'number'   ,default:2  ,unite:'px' ,selector:'div.amark.emp' ,selector_value:'border-top-width:__VALUE__px;border-left-width:__VALUE__px;border-right-width:__VALUE__px;' ,border:'width',apply:true}
  , border_cadence          :{type:'inputtext'    ,typeV:'number'   ,default:5  ,unite:'px' ,selector:'div.amark.cad:not(.selected)' ,selector_value:'border-right-width:__VALUE__px;border-bottom-width:__VALUE__px;' ,border:'width',apply:true}
  , border_note             :{type:'inputtext'    ,typeV:'number'   ,default:2  ,unite:'px' ,selector:'div.amark.not span.content' ,selector_value:'border-width:__VALUE__px;' ,border:'width',apply:true}
  , border_form             :{type:'inputtext'    ,typeV:'number'   ,default:4  ,unite:'px' ,selector:'div.amark.bbx.prt span.content, div.amark.bbx.prtz span.content, div.amark.bbx.sec span.content, div.amark.bbx.secz span.content' ,selector_value:'border-width:__VALUE__px;' ,border:'width',apply:true}
  , border_measure          :{type:'inputtext'    ,typeV:'number'   ,default:1  ,unite:'px' ,selector:'div.amark.txt.mes.on-line span.content' ,selector_value:'border-width:__VALUE__px;' ,border:'width',apply:true}
  , marque_pedale_size      :{type:'inputtext'    ,typeV:'number'   ,default:40             ,unite:'px' ,selector:'div.aobj.ped span.content', selector_value:'font-size:__VALUE__px;width:calc(__VALUE__px / 2);height:calc(__VALUE__px / 2);line-height:calc(__VALUE__px / 2);' ,apply:true}
  , marque_texte_size_1     :{type:'inputtext'    ,typeV:'number'   ,default:60         ,unite:'px' ,selector:'div.amark.txt.size1 span.content'    ,selector_value:'font-size:__VALUE__px;' ,apply:true}
  , marque_texte_size_2     :{type:'inputtext'    ,typeV:'number'   ,default:40       ,unite:'px' ,selector:'div.amark.txt.size2 span.content'    ,selector_value:'font-size:__VALUE__px;' ,apply:true}
  , measure_line_offset     :{type:'inputtext'    ,typeV:'number'   ,default:150 ,unite:'px' ,apply:true}
  , distance_after_measure_line :{type:'inputtext' ,typeV:'number'  ,default:250, apply:true ,unite:'px'}
  , marque_measure          :{type:'inputtext'    ,typeV:'number'   ,default:24        ,unite:'px' ,selector:'div.amark.txt.mes span.content'    ,selector_value:'font-size:__VALUE__px;' ,apply:true}
  , marque_texte_size_3     :{type:'inputtext'    ,typeV:'number'   ,default:24         ,unite:'px' ,selector:'div.amark.txt.size3 span.content'  ,selector_value:'font-size:__VALUE__px;' ,apply:true}
  , marque_texte_size_4     :{type:'inputtext'    ,typeV:'number'   ,default:16     ,unite:'px' ,selector:'div.amark.txt.size4 span.content'  ,selector_value:'font-size:__VALUE__px;' ,apply:true}
  
  // --- Mise en page : titres (espaces avant et après : à l'export) ---
  , layout_title_1_font    :{type:'inputtext'    ,typeV:'string'   ,default:'Arial Narrow' ,selector:'div.amark.lay.tit.t1 span.content', selector_value:'font-family:"__VALUE__";' ,apply:true}
  , layout_title_1_size    :{type:'inputtext'    ,typeV:'number'   ,default:60 ,unite:'px' ,selector:'div.amark.lay.tit.t1 span.content', selector_value:'font-size:__VALUE__px;' ,apply:true}
  , layout_title_1_before  :{type:'inputtext'    ,typeV:'number'   ,default:80 ,unite:'px'}
  , layout_title_1_after   :{type:'inputtext'    ,typeV:'number'   ,default:40 ,unite:'px'}
  , layout_title_2_font    :{type:'inputtext'    ,typeV:'string'   ,default:'Arial Narrow' ,selector:'div.amark.lay.tit.t2 span.content', selector_value:'font-family:"__VALUE__";' ,apply:true}
  , layout_title_2_size    :{type:'inputtext'    ,typeV:'number'   ,default:44 ,unite:'px' ,selector:'div.amark.lay.tit.t2 span.content', selector_value:'font-size:__VALUE__px;' ,apply:true}
  , layout_title_2_before  :{type:'inputtext'    ,typeV:'number'   ,default:60 ,unite:'px'}
  , layout_title_2_after   :{type:'inputtext'    ,typeV:'number'   ,default:30 ,unite:'px'}
  , layout_title_3_font    :{type:'inputtext'    ,typeV:'string'   ,default:'Arial Narrow' ,selector:'div.amark.lay.tit.t3 span.content', selector_value:'font-family:"__VALUE__";' ,apply:true}
  , layout_title_3_size    :{type:'inputtext'    ,typeV:'number'   ,default:32 ,unite:'px' ,selector:'div.amark.lay.tit.t3 span.content', selector_value:'font-size:__VALUE__px;' ,apply:true}
  , layout_title_3_before  :{type:'inputtext'    ,typeV:'number'   ,default:40 ,unite:'px'}
  , layout_title_3_after   :{type:'inputtext'    ,typeV:'number'   ,default:20 ,unite:'px'}

  // --- Export PDF/SVG (mm), réglés dans le panneau d'export ---
  , export_page_format      :{type:'inputtext'    ,typeV:'string'   ,default:'A4'       ,hidden:true}
  , export_page_width       :{type:'inputtext'    ,typeV:'number'   ,default:210        ,hidden:true}
  , export_page_height      :{type:'inputtext'    ,typeV:'number'   ,default:297        ,hidden:true}
  , export_page_unit        :{type:'inputtext'    ,typeV:'string'   ,default:'mm'       ,hidden:true}
  , export_page_orientation :{type:'inputtext'    ,typeV:'string'   ,default:'portrait' ,hidden:true}
  , export_page_margin      :{type:'inputtext'    ,typeV:'number'   ,default:10         ,hidden:true}
  , export_systems_gap      :{type:'inputtext'    ,typeV:'number'   ,default:20         ,unite:'pt'}
  , export_type             :{type:'inputtext'    ,typeV:'string'   ,default:'pdf'      ,hidden:true}
  , export_document         :{type:'inputtext'    ,typeV:'string'   ,default:'normal'   ,hidden:true}

  // --- Window ---
  , window_width            :{type:'inputtext'    ,typeV:'number'   ,default:null}
  , window_height           :{type:'inputtext'    ,typeV:'number'   ,default:null}
    // Zoom choisi de l'affichage (menu « Fenêtre > Zoom », cf. main.js)
  , zoom                    :{type:'inputtext'    ,typeV:'number'   ,default:1      ,hidden:true}
  , last_scroll             :{type:'inputtext'    ,typeV:'number'   ,default:0}
  
  // --- Couleurs ---
  , color_mesure            :{type:'inputtext'    ,typeV:'color'    ,default:'000099'      ,selectors:'div.amark.txt.mes span.content' ,apply:true}
  , color_accords           :{type:'inputtext'    ,typeV:'color'    ,default:'999999'         ,selectors:'div.amark.acc span.content' ,apply:true}
  , color_harmonie          :{type:'inputtext'    ,typeV:'color'    ,default:'999999' ,selectors:'div.amark.har span.content' ,apply:true}
  , color_mark_parties      :{type:'inputtext'    ,typeV:'color'    ,default:'CC0000'      ,selectors:'div.amark.prt span.content, div.amark.prt span.vline, div.amark.prtz span.content, div.amark.prtz span.vline, div.form-diagram div.portion.fpar' ,apply:true}
  , color_mark_sections     :{type:'inputtext'    ,typeV:'color'    ,default:'CC0000'    ,selectors:'div.amark.sec span.content, div.amark.sec span.vline, div.amark.secz span.content, div.amark.secz span.vline, div.form-diagram div.portion.fsec' ,apply:true}
  , color_cellule           :{type:'inputtext'    ,typeV:'color'    ,default:'8383ed' ,selectors:'div.amark.cel, div.amark.cel span.content' ,apply:true}
  , color_modulations       :{type:'inputtext'    ,typeV:'color'    ,default:'009900' ,selectors:'div.amark.mod:before, div.amark.mod span.content, div.amark.mod span.vline, div.form-diagram span.fkey' ,apply:true}
  , color_emprunts          :{type:'inputtext'    ,typeV:'color'    ,default:'22BB22'     ,selectors:'div.amark.emp, div.amark.emp span.content' ,apply:true}
  , color_segments          :{type:'inputtext'    ,typeV:'color'    ,default:'333333'               ,selectors:'div.amark.seg, div.amark.seg span.content, div.form-diagram div.portion.fseg' ,apply:true}
  

  // --- Forme (marques de forme et construction) ---
  , form_height_1           :{type:'inputtext'    ,typeV:'number'   ,default:160 ,unite:'px'}
  , form_height_2           :{type:'inputtext'    ,typeV:'number'   ,default:120 ,unite:'px'}
  , form_height_3           :{type:'inputtext'    ,typeV:'number'   ,default:80  ,unite:'px'}
  , form_position           :{type:'select'       ,typeV:'string'   ,default:'after', values: [
        {name: t('ui.form_position.before'), value: 'before'}
      , {name: t('ui.form_position.after'),  value: 'after'}
    ]}
  , form_build_measures     :{type:'checkbox'     ,typeV:'boolean'  ,default:true   ,hidden:true}
  , form_build_keys         :{type:'checkbox'     ,typeV:'boolean'  ,default:true   ,hidden:true}
  , form_built              :{type:'checkbox'     ,typeV:'boolean'  ,default:false  ,hidden:true}
  , show_form_names         :{type:'checkbox'     ,typeV:'boolean'  ,default:false  ,hidden:true}
    // Erreurs de vérification retirées à la main (JSON, cf. Verifications.js)
  , checks_dismissed        :{type:'inputtext'    ,typeV:'string'   ,default:''     ,hidden:true}

  , animation_tempo         :{type:'inputtext'    ,typeV:'number'   ,default:60 ,unite:'BPM'}
  , autosave                :{type:'checkbox'     ,typeV:'boolean'  ,default:true}
  , mark_creation_click     :{type:'select'       ,typeV:'string'   ,default:'simple', values: [
        {name: t('ui.mark_creation_click.simple'), value: 'simple'}
      , {name: t('ui.mark_creation_click.double'), value: 'double'}
    ]}
  , animate                 :{type:'checkbox'     ,typeV:'boolean'  ,default:false}

  // --- Notation des accords (cf. Notation.js) ---
  , notation_display        :{type:'select'       ,typeV:'string'   ,default:'bat', values: [
        {name: t('ui.notation.bat'), value: 'bat'}
      , {name: t('ui.notation.it'),  value: 'it'}
      , {name: t('ui.notation.us'),  value: 'us'}
    ]}
  , notation_input          :{type:'select'       ,typeV:'string'   ,default:'bat', values: [
        {name: t('ui.notation.bat'), value: 'bat'}
      , {name: t('ui.notation.it'),  value: 'it'}
    ]}
}

/**
 * Intensité des bords (0 blanc à 100 noir, vide : couleur du style) de
 * chaque type de marque à bord : préférence intensity_<nom>, associée à
 * celle de son épaisseur (cf. AMark#borderPrefKeyOf)
 */
const BORDER_KINDS = {
    circle:  {width: 'border_circle',        selector: 'div.amark.cir'}
  , box:     {width: 'border_box',           selector: 'div.amark.box'}
  , cellule: {width: 'thiness_cellule_line', selector: 'div.amark.cel'}
  , bxt:     {width: 'thiness_border',       selector: 'div.amark.bbx.bxt'}
  , motif:   {width: 'thiness_motif_line',   selector: 'div.amark.mot'}
  , segment: {width: 'thiness_segment_line', selector: 'div.amark.seg'}
  , emprunt: {width: 'border_emprunt',       selector: 'div.amark.emp'}
  , cadence: {width: 'border_cadence',       selector: 'div.amark.cad:not(.selected)'}
  , note:    {width: 'border_note',          selector: 'div.amark.not span.content'}
  , form:    {width: 'border_form',          selector: 'div.amark.bbx.prt span.content, div.amark.bbx.prtz span.content, div.amark.bbx.sec span.content, div.amark.bbx.secz span.content'}
  , measure: {width: 'border_measure',       selector: 'div.amark.txt.mes.on-line span.content'}
}
// Préférence d'intensité de chaque préférence d'épaisseur
export const BORDER_INTENSITY = {}
Object.entries(BORDER_KINDS).forEach(([name, kind]) => {
  const key = `intensity_${name}`
  BORDER_INTENSITY[kind.width] = key
  PreferencesAppData[key] = {type:'inputtext', typeV:'number', default:'', unite:'%', selector: kind.selector, selector_value:'border-color:hsl(0 0% calc(100% - __VALUE__%));', border:'intensity', apply:true}
})

// Ajout de l'identifiant aux données
// et de ses textes (locales/<lang>/ui.yaml, prefs)
Object.keys(PreferencesAppData).forEach(keyPref => {
    PreferencesAppData[keyPref].id = keyPref
    Object.assign(PreferencesAppData[keyPref], t(`ui.prefs.${keyPref}`))
})

