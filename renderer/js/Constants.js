import { AObjet } from './AObjet.js'

export const TYPES_OU_SOUSTYPES_AU_DESSUS = [
  'acc', 'mod', 'emp', 'prt', 'prtz', 'sec','secz'
]
export const TYPES_OU_SOUSTYPES_EN_DESSOUS = [
  'har', 'ped', 'cad'
]

export const TYPES_CADRE = {
  'prt' : {name:'Partie (début)'  , shortcut:'a'  , value:'prt'   , default:'EXPO'}
  , 'prtz': {name:'Fin de partie'   , shortcut:'z'  , value:'prtz'  , default:'EXPO'}
  , 'sec' : {name:'Début section'   , shortcut:'s'  , value:'sec'   , default:'SECTION'}
  , 'secz': {name:'Fin de section'  , shortcut:'f'  , value:'secz'  , default:'SECTION'}
  , 'cel' : {name:'Cellule'         , shortcut:'c'  , value:'cel'   , default:'C1'}
  , 'bxt' : {name:'Texte dans cadre', shortcut:'t'  , value:'bxt'   , default:'Texte **stylé** et _stylé_.'}
  , 'box' : {name:'Cadre simple'    , shortcut:'x'  , value:'box'} // pas de default: => pas de texte
}

export const TAILLES_TEXTE = {
  'size1' : {name:"Gros"              ,value:'size1'    ,shortcut:'4' ,default:'Gros texte'}
  , 'size2' : {name:"Moyen"             ,value:'size2'  ,shortcut:'3' ,default:'Texte moyen'}
  , 'size3' : {name:"Petit"             ,value:'size3'  ,shortcut:'2' ,default:'Petit texte'}
  , 'size4' : {name:"Mini"              ,value:'size4'  ,shortcut:'1' ,default:'Texte miniature'}
  , 'mes'   : {name:'Numéro de mesure'  ,value:'mes'    ,shortcut:'m' ,default: function(){return AObjet.lastMeasureNumber()}}
  , 'long'  : {name:'Texte long'        ,value:'long'   ,shortcut:'l' ,default: 'Texte long (command + ENTER pour finir)'}
  , 'idx'   : {name:'En marge (index)'  ,value:'idx'    ,shortcut:'i' ,default:'Index'}
}

export const TYPES_NOTES = {
  'np': {name:'Note de passage'   , value:'np', autocontent:'NP'  , shortcut:'p'}
  , 'ap': {name:'Appoggiature'      , value:'ap', autocontent:'AP'  , shortcut:'a'}
  , 'ac': {name:'Appog.chromatique' , value:'ac', autocontent:'AC'  , shortcut:'c'}
  , 're': {name:'Retard'            , value:'re', autocontent:'R'   , shortcut:'r'}
  , 'br': {name:'Broderie'          , value:'br', autocontent:'BR'  , shortcut:'b'}
  , 'db': {name:'Double-broderie'   , value:'db', autocontent:'DB'  , shortcut:'d'}
  , 'ec': {name:'Échappée'          , value:'ec', autocontent:'E'   , shortcut:'e'}
  , 'in': {name:'Note naturelle'    , value:'in', autocontent:'NN'  , shortcut:'n'}
  , 'an': {name:'Anacrouse'         , value:'an', autocontent:'AN'  , shortcut:'s'}
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
  'acc': {name:'Accord'       , shortcut:'a', ajustX:12,  ajustY:8,     value:'acc', default:'C', message:"Nom de l'accord"}
  , 'har': {name:'Harmonie'     , shortcut:'h', ajustX:16,  ajustY:8,     value:'har', default:'I', message:"Chiffrage"}
  , 'mod': {name:'Modulation'   , shortcut:'m', ajustX:24,  ajustY:-80,   value:'mod', default:'C', message:"Nouvelle tonalité"}
  , 'emp': {name:'Emprunt'      , shortcut:'e', ajustX:4,   ajustY:-60,   value:'emp', default:'C', message:"Tonalité de l'emprunt"}
  , 'cad': {name:'Cadence…'     , shortcut:'c', ajustX:-70, ajustY:14,    value:'cad', subtype:true, autocontent:true}
  , 'bbx': {name:'Cadre'        , shortcut:'b', value:'bbx', subdata:TYPES_CADRE, message:'Type de cadre'}
  , 'not': {name:'Type de note…', shortcut:'n', value:'not', subdata:TYPES_NOTES, autocontent:true, message:'Type de la note'}
  , 'deg': {name:'Degré note'   , shortcut:'d', ajustX:26,  ajustY:24,  value:'deg', default:'1', message:'Degré de la note'}
  , 'seg': {name:'Segment'      , shortcut:'s', value:'seg', subtype:true   , default:'membre 1', message:"Légende (vide si aucune)"}
  , 'img': {name:'Image'        , shortcut:'i', value:'img' , default:'image.jpg'  , message:"Image à insérer (path dans le dossier 'images')"}
  , 'txt': {name:'Texte'        , shortcut:'t', ajustX:0,   ajustY:23       ,value:'txt', subdata:TAILLES_TEXTE,  message:"Texte à afficher"}
  , 'ped': {name:'Pédale'       , shortcut:'p', ajustX:20,  ajustY:10,    value:'ped', default:'5', message:"Degré de la pédale"}
  , 'cir': {name:'Cercle'       , shortcut:'r', value:'cir'}
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
  'par': {name:'Cadence parfaite',   value:'par', autocontent:'I',  shortcut:'p'}
  , 'imp': {name:'Cadence imparfaite', value:'imp', autocontent:'I',  shortcut:'n'}
  , 'dem': {name:'Demi-cadence',       value:'dem', autocontent:'V',  shortcut:'d'}
  , 'ita': {name:'Cadence italienne',  value:'ita', autocontent:'I',  shortcut:'i'}
  , 'rom': {name:'Cadence rompue',     value:'rom', autocontent:'VI', shortcut:'r'}
  , 'pla': {name:'Cadence plagale',    value:'pla', autocontent:'I',  shortcut:'g'}
  , 'fau': {name:'Cadence fauréenne',  value:'fau', autocontent:'I',  shortcut:'f'}
}


export const TYPES_SEGMENT = [
    {name:'À plat sur la portée'    , value:'h-up'    , shortcut: 'u'}
  , {name:'À plat sous la portée'   , value:'h-down'  , shortcut: 'd'}
  , {name:'Vertical trait à gauche' , value:'v-left'  , shortcut: 'l'}
  , {name:'Vertical trait à droite' , value:'v-right' , shortcut: 'r'}
]




// Liste des types (ci-dessus) qui doivent utiliser la 
// fonte PhilNote (PhilNote2 maintenant)
export const TYPES_PHILHARMONIEFONT = ['acc','har','mod','emp','cad','ped']
