import { AObjet } from './AObjet.js'
import { t } from './i18n.js'

export const TYPES_OU_SOUSTYPES_AU_DESSUS = [
  'acc', 'mod', 'emp', 'prt', 'prtz', 'sec','secz'
]
export const TYPES_OU_SOUSTYPES_EN_DESSOUS = [
  'har', 'ped', 'cad'
]

export const TYPES_CADRE = {
  'prt' : {name:t('ui.marks.frames.prt.name')  , shortcut:'a'  , value:'prt'   , default:t('ui.marks.frames.prt.default')}
  , 'prtz': {name:t('ui.marks.frames.prtz.name')   , shortcut:'z'  , value:'prtz'  , default:t('ui.marks.frames.prtz.default')}
  , 'sec' : {name:t('ui.marks.frames.sec.name')   , shortcut:'s'  , value:'sec'   , default:t('ui.marks.frames.sec.default')}
  , 'secz': {name:t('ui.marks.frames.secz.name')  , shortcut:'f'  , value:'secz'  , default:t('ui.marks.frames.secz.default')}
  , 'cel' : {name:t('ui.marks.frames.cel.name')         , shortcut:'c'  , value:'cel'   , default:'C1'}
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

export const TYPES_NOTES = {
  'np': {name:t('ui.marks.notes.np')   , value:'np', autocontent:'NP'  , shortcut:'p'}
  , 'ap': {name:t('ui.marks.notes.ap')      , value:'ap', autocontent:'AP'  , shortcut:'a'}
  , 'ac': {name:t('ui.marks.notes.ac') , value:'ac', autocontent:'AC'  , shortcut:'c'}
  , 're': {name:t('ui.marks.notes.re')            , value:'re', autocontent:'R'   , shortcut:'r'}
  , 'br': {name:t('ui.marks.notes.br')          , value:'br', autocontent:'BR'  , shortcut:'b'}
  , 'db': {name:t('ui.marks.notes.db')   , value:'db', autocontent:'DB'  , shortcut:'d'}
  , 'ec': {name:t('ui.marks.notes.ec')          , value:'ec', autocontent:'E'   , shortcut:'e'}
  , 'in': {name:t('ui.marks.notes.in')    , value:'in', autocontent:'NN'  , shortcut:'n'}
  , 'an': {name:t('ui.marks.notes.an')         , value:'an', autocontent:'AN'  , shortcut:'s'}
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
  , 'mod': {name:t('ui.marks.types.mod.name')   , shortcut:'m', ajustX:24,  ajustY:-80,   value:'mod', default:'C', message:t('ui.marks.types.mod.message')}
  , 'emp': {name:t('ui.marks.types.emp.name')      , shortcut:'e', ajustX:4,   ajustY:-60,   value:'emp', default:'C', message:t('ui.marks.types.emp.message')}
  , 'cad': {name:t('ui.marks.types.cad.name')     , shortcut:'c', ajustX:-70, ajustY:14,    value:'cad', subtype:true, autocontent:true}
  , 'bbx': {name:t('ui.marks.types.bbx.name')        , shortcut:'b', value:'bbx', subdata:TYPES_CADRE, message:t('ui.marks.types.bbx.message')}
  , 'not': {name:t('ui.marks.types.not.name'), shortcut:'n', value:'not', subdata:TYPES_NOTES, autocontent:true, message:t('ui.marks.types.not.message')}
  , 'deg': {name:t('ui.marks.types.deg.name')   , shortcut:'d', ajustX:26,  ajustY:24,  value:'deg', default:'1', message:t('ui.marks.types.deg.message')}
  , 'seg': {name:t('ui.marks.types.seg.name')      , shortcut:'s', value:'seg', subtype:true   , default:t('ui.marks.types.seg.default'), message:t('ui.marks.types.seg.message')}
  , 'img': {name:t('ui.marks.types.img.name')        , shortcut:'i', value:'img' , default:'image.jpg'  , message:t('ui.marks.types.img.message')}
  , 'txt': {name:t('ui.marks.types.txt.name')        , shortcut:'t', ajustX:0,   ajustY:23       ,value:'txt', subdata:TAILLES_TEXTE,  message:t('ui.marks.types.txt.message')}
  , 'ped': {name:t('ui.marks.types.ped.name')       , shortcut:'p', ajustX:20,  ajustY:10,    value:'ped', default:'5', message:t('ui.marks.types.ped.message')}
  , 'cir': {name:t('ui.marks.types.cir.name')       , shortcut:'r', value:'cir'}
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
  'par': {name:t('ui.marks.cadences.par'),   value:'par', autocontent:'I',  shortcut:'p'}
  , 'imp': {name:t('ui.marks.cadences.imp'), value:'imp', autocontent:'I',  shortcut:'n'}
  , 'dem': {name:t('ui.marks.cadences.dem'),       value:'dem', autocontent:'V',  shortcut:'d'}
  , 'ita': {name:t('ui.marks.cadences.ita'),  value:'ita', autocontent:'I',  shortcut:'i'}
  , 'rom': {name:t('ui.marks.cadences.rom'),     value:'rom', autocontent:'VI', shortcut:'r'}
  , 'pla': {name:t('ui.marks.cadences.pla'),    value:'pla', autocontent:'I',  shortcut:'g'}
  , 'fau': {name:t('ui.marks.cadences.fau'),  value:'fau', autocontent:'I',  shortcut:'f'}
}


export const TYPES_SEGMENT = [
    {name:t('ui.marks.segments.h-up')    , value:'h-up'    , shortcut: 'u'}
  , {name:t('ui.marks.segments.h-down')   , value:'h-down'  , shortcut: 'd'}
  , {name:t('ui.marks.segments.v-left') , value:'v-left'  , shortcut: 'l'}
  , {name:t('ui.marks.segments.v-right') , value:'v-right' , shortcut: 'r'}
]




// Liste des types (ci-dessus) qui doivent utiliser la 
// fonte PhilNote (PhilNote2 maintenant)
export const TYPES_PHILHARMONIEFONT = ['acc','har','mod','emp','cad','ped']
