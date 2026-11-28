import { AObjet } from './AObjet.js'
import { t } from './i18n.js'

export const TYPES_OU_SOUSTYPES_AU_DESSUS = [
  'acc', 'mod', 'emp', 'prt', 'prtz', 'sec','secz', 'frm'
]
export const TYPES_OU_SOUSTYPES_EN_DESSOUS = [
  'har', 'ped', 'cad'
]

export const TYPES_CADRE = {
    'cel' : {name:t('ui.marks.frames.cel.name')         , shortcut:'c'  , value:'cel'   , default:'C1'}
  , 'bxt' : {name:t('ui.marks.frames.bxt.name'), shortcut:'t'  , value:'bxt'   , default:t('ui.marks.frames.bxt.default')}
  , 'box' : {name:t('ui.marks.frames.box.name')    , shortcut:'x'  , value:'box'} // pas de default: => pas de texte
}

export const TAILLES_TEXTE = {
  'size1' : {name:t('ui.marks.texts.size1.name')              ,value:'size1'    ,shortcut:'4' ,default:t('ui.marks.texts.size1.default')}
  , 'size2' : {name:t('ui.marks.texts.size2.name')             ,value:'size2'  ,shortcut:'3' ,default:t('ui.marks.texts.size2.default')}
  , 'size3' : {name:t('ui.marks.texts.size3.name')             ,value:'size3'  ,shortcut:'2' ,default:t('ui.marks.texts.size3.default')}
  , 'size4' : {name:t('ui.marks.texts.size4.name')              ,value:'size4'  ,shortcut:'1' ,default:t('ui.marks.texts.size4.default')}
  , 'mes'   : {name:t('ui.marks.texts.mes.name')  ,value:'mes'    ,shortcut:'m' ,default: function(){return AObjet.lastMeasureNumber()}}
  , 'long'  : {name:t('ui.marks.texts.long.name')        ,value:'long'   ,shortcut:'l' ,default:t('ui.marks.texts.long.default')}
  , 'idx'   : {name:t('ui.marks.texts.idx.name')  ,value:'idx'    ,shortcut:'i' ,default:t('ui.marks.texts.idx.default')}
}

// :full, nom entier (nomenclature de l'export) quand :name est abrégé
export const TYPES_NOTES = {
  'np': {name:t('ui.marks.notes.np')   , value:'np', autocontent:'NP'  , shortcut:'p'}
  , 'pc': {name:t('ui.marks.notes.pc')   , value:'pc', autocontent:'PC'  , shortcut:'P', full:t('ui.marks.notes_full.pc')}
  , 'ap': {name:t('ui.marks.notes.ap')      , value:'ap', autocontent:'AP'  , shortcut:'a'}
  , 'ac': {name:t('ui.marks.notes.ac') , value:'ac', autocontent:'AC'  , shortcut:'A', full:t('ui.marks.notes_full.ac')}
  , 'da': {name:t('ui.marks.notes.da') , value:'da', autocontent:'DAP' , shortcut:'g'}
  , 'dac': {name:t('ui.marks.notes.dac'), value:'dac', autocontent:'DAC' , shortcut:'G', full:t('ui.marks.notes_full.dac')}
  , 're': {name:t('ui.marks.notes.re')            , value:'re', autocontent:'R'   , shortcut:'r'}
  , 'br': {name:t('ui.marks.notes.br')          , value:'br', autocontent:'BR'  , shortcut:'b'}
  , 'db': {name:t('ui.marks.notes.db')   , value:'db', autocontent:'DB'  , shortcut:'d'}
  , 'bc': {name:t('ui.marks.notes.bc')   , value:'bc', autocontent:'BC'  , shortcut:'B', full:t('ui.marks.notes_full.bc')}
  , 'dc': {name:t('ui.marks.notes.dc')   , value:'dc', autocontent:'DC'  , shortcut:'D', full:t('ui.marks.notes_full.dc')}
  , 'ec': {name:t('ui.marks.notes.ec')          , value:'ec', autocontent:'E'   , shortcut:'e'}
  , 'in': {name:t('ui.marks.notes.in')    , value:'in', autocontent:'NN'  , shortcut:'n'}
  , 'an': {name:t('ui.marks.notes.an')         , value:'an', autocontent:'AN'  , shortcut:'s'}
  , 'df': {name:t('ui.marks.notes.df')         , value:'df', autocontent:'≠'   , shortcut:'≠'}
}

// Les portions de la forme (marque « Forme »). Une fin de portion
// (:startOf, sans contenu propre) est associée à sa marque de début
// (data.start) ; :level sert à trouver la fin implicite d'une portion
// (cf. Forme.endOf). :frame, version cadre (dessinée comme une boite),
// sinon version borne
export const TYPES_FORME = {
    'fpar':  {name:t('ui.marks.forms.fpar.name'),  value:'fpar',  shortcut:'p', level:1, default:t('ui.marks.forms.fpar.default')}
  , 'prt':   {name:t('ui.marks.forms.prt.name'),   value:'prt',   shortcut:'a', level:1, default:t('ui.marks.forms.prt.default'),  frame:true}
  , 'fsec':  {name:t('ui.marks.forms.fsec.name'),  value:'fsec',  shortcut:'s', level:2, default:t('ui.marks.forms.fsec.default')}
  , 'sec':   {name:t('ui.marks.forms.sec.name'),   value:'sec',   shortcut:'c', level:2, default:t('ui.marks.forms.sec.default'),  frame:true}
  , 'fseg':  {name:t('ui.marks.forms.fseg.name'),  value:'fseg',  shortcut:'g', level:3, default:t('ui.marks.forms.fseg.default')}
  , 'fparz': {name:t('ui.marks.forms.fparz.name'), value:'fparz', shortcut:'P', startOf:'fpar'}
  , 'prtz':  {name:t('ui.marks.forms.prtz.name'),  value:'prtz',  shortcut:'A', startOf:'prt',  frame:true}
  , 'fsecz': {name:t('ui.marks.forms.fsecz.name'), value:'fsecz', shortcut:'S', startOf:'fsec'}
  , 'secz':  {name:t('ui.marks.forms.secz.name'),  value:'secz',  shortcut:'C', startOf:'sec',  frame:true}
  , 'fsegz': {name:t('ui.marks.forms.fsegz.name'), value:'fsegz', shortcut:'G', startOf:'fseg'}
}

// Version cadre (:frame) d'un sous-type de forme borne, et inversement
export const FORME_CADRE_BORNE = {fpar:'prt', fsec:'sec', fparz:'prtz', fsecz:'secz'}
Object.entries(FORME_CADRE_BORNE).forEach(([b, c]) => FORME_CADRE_BORNE[c] = b)

// Niveau (1 partie, 2 section, 3 segment) d'un sous-type de forme,
// début ou fin
/**
 * Marques de mise en page (pour l'export) : saut de page, délimitation
 * (hauteur entre ce qui précède et ce qui suit), titre (niveau 1 à 3,
 * cf. AMark_Editor)
 */
export const TYPES_MISE_EN_PAGE = {
    'pag': {name: t('ui.marks.layout.pag'), value: 'pag', shortcut: 'p'}
  , 'del': {name: t('ui.marks.layout.del'), value: 'del', shortcut: 'd', default: '10 mm', message: t('ui.marks.layout.del_message')}
  , 'tit': {name: t('ui.marks.layout.tit'), value: 'tit', shortcut: 't', default: t('ui.marks.layout.tit_default'), message: t('ui.marks.layout.tit_message')}
}

export function formLevel(subtype){
  const d = TYPES_FORME[subtype]
  return d.level || TYPES_FORME[d.startOf].level
}

/**
 * Les types de marques (modulation, emprunt, pédale, etc.)
 * Ils déterminent la propriété 'type' de la marque.
 * 
 * Les champs qui n'ont pas de valeur 'default', ne possède pas de
 * propriété :content.
 * 
 */
export const AMARQUES_TYPES = {
  'acc': {name:t('ui.marks.types.acc.name')       , shortcut:'a', ajustX:12,  ajustY:8,     value:'acc', default:'C', message:t('ui.marks.types.acc.message')}
  , 'har': {name:t('ui.marks.types.har.name')     , shortcut:'h', ajustX:16,  ajustY:8,     value:'har', default:'I', message:t('ui.marks.types.har.message')}
  , 'mod': {name:t('ui.marks.types.mod.name')   , shortcut:'M', ajustX:24,  ajustY:-80,   value:'mod', default:'C', message:t('ui.marks.types.mod.message')}
  , 'emp': {name:t('ui.marks.types.emp.name')      , shortcut:'e', ajustX:4,   ajustY:-60,   value:'emp', default:'C', message:t('ui.marks.types.emp.message')}
  , 'cad': {name:t('ui.marks.types.cad.name')     , shortcut:'c', ajustX:-70, ajustY:14,    value:'cad', subtype:true, autocontent:true}
  , 'bbx': {name:t('ui.marks.types.bbx.name')        , shortcut:'b', value:'bbx', subdata:TYPES_CADRE, message:t('ui.marks.types.bbx.message')}
  , 'not': {name:t('ui.marks.types.not.name'), shortcut:'n', value:'not', subdata:TYPES_NOTES, autocontent:true, message:t('ui.marks.types.not.message')}
  , 'frm': {name:t('ui.marks.types.frm.name')      , shortcut:'f', value:'frm', subdata:TYPES_FORME, message:t('ui.marks.types.frm.message')}
  , 'mot': {name:t('ui.marks.types.mot.name')      , shortcut:'m', value:'mot', default:t('ui.marks.types.mot.default'), message:t('ui.marks.types.mot.message')}
  , 'deg': {name:t('ui.marks.types.deg.name')   , shortcut:'d', ajustX:26,  ajustY:24,  value:'deg', default:'1', message:t('ui.marks.types.deg.message')}
  , 'seg': {name:t('ui.marks.types.seg.name')      , shortcut:'s', value:'seg', subtype:true   , emptyOk:true, default:t('ui.marks.types.seg.default'), message:t('ui.marks.types.seg.message')}
  , 'img': {name:t('ui.marks.types.img.name')        , shortcut:'i', value:'img' , default:'image.jpg'  , message:t('ui.marks.types.img.message')}
  , 'txt': {name:t('ui.marks.types.txt.name')        , shortcut:'t', ajustX:0,   ajustY:23       ,value:'txt', subdata:TAILLES_TEXTE,  message:t('ui.marks.types.txt.message')}
  , 'ped': {name:t('ui.marks.types.ped.name')       , shortcut:'p', ajustX:20,  ajustY:10,    value:'ped', default:'5', message:t('ui.marks.types.ped.message')}
  , 'cir': {name:t('ui.marks.types.cir.name')       , shortcut:'r', value:'cir'}
  , 'lay': {name:t('ui.marks.types.lay.name')       , shortcut:'P', value:'lay', subdata:TYPES_MISE_EN_PAGE, message:t('ui.marks.types.lay.message')}
  , 'ext': {name:t('ui.marks.types.ext.name')       , shortcut:'E', value:'ext', default:'1', message:t('ui.marks.types.ext.message')}
}

// @return true si le type de marque +type+ a des sous-types
export function typeHasSubtype(type){
  const dtype = AMARQUES_TYPES[type]
  return !!dtype && (!!dtype.subdata || undefined != dtype.subtype)
}


/**
* Les types de marques qu'on doit toujours aligner si elle se trouve
* assez proche verticalement.
*/
export const TYPES_AJUSTABLES = {
   'acc':['acc']
 , 'har':['har','cad']
 , 'mod':['mod']
 , 'cad':['cad','har']
}
export const SUBTYPES_AJUSTABLES = {
  'mes':['mes']
}


/**
 * Les TYPES DE CADENCES
 * 
 */
export const CADENCES = {
  'par': {name:t('ui.marks.cadences.par'),   value:'par', abbr:t('ui.marks.cadences_abbr.par'), autocontent:'I',  shortcut:'p'}
  , 'imp': {name:t('ui.marks.cadences.imp'), value:'imp', abbr:t('ui.marks.cadences_abbr.imp'), autocontent:'I',  shortcut:'n'}
  , 'dem': {name:t('ui.marks.cadences.dem'),       value:'dem', abbr:t('ui.marks.cadences_abbr.dem'), autocontent:'V',  shortcut:'d'}
  , 'ita': {name:t('ui.marks.cadences.ita'),  value:'ita', abbr:t('ui.marks.cadences_abbr.ita'), autocontent:'I',  shortcut:'i'}
  , 'rom': {name:t('ui.marks.cadences.rom'),     value:'rom', abbr:t('ui.marks.cadences_abbr.rom'), autocontent:'VI', shortcut:'r'}
  , 'pla': {name:t('ui.marks.cadences.pla'),    value:'pla', abbr:t('ui.marks.cadences_abbr.pla'), autocontent:'I',  shortcut:'g'}
  , 'fau': {name:t('ui.marks.cadences.fau'),  value:'fau', abbr:t('ui.marks.cadences_abbr.fau'), autocontent:'I',  shortcut:'f'}
}


export const TYPES_SEGMENT = [
    {name:t('ui.marks.segments.h-up')    , value:'h-up'    , shortcut: 'm'}
  , {name:t('ui.marks.segments.h-down')   , value:'h-down'  , shortcut: 'u'}
  , {name:t('ui.marks.segments.v-left') , value:'v-left'  , shortcut: 'd'}
  , {name:t('ui.marks.segments.v-right') , value:'v-right' , shortcut: 'b'}
]




// Liste des types (ci-dessus) qui doivent utiliser la 
// fonte PhilNote (PhilNote7 maintenant)
export const TYPES_PHILHARMONIEFONT = ['acc','har','mod','emp','cad','ped']
