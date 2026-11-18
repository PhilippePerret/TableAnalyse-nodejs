import { AObjet } from './AObjet.js'
import { Current } from './Current.js'
import { invoke } from './api.js'
import { message, erreur } from './lib/Message.js'
import { t } from './i18n.js'
/**
 * Variables des textes
 * --------------------
 *
 * Dans le texte d'une marque, `{<variable>}` est remplacé par :
 *    - une donnée de l'analyse (titre de la pièce, compositeur, titre
 *      de l'analyse, analyste) ;
 *    - le nom du motif qui définit cette variable (champ « Variable »
 *      de l'édition d'un motif).
 * Une variable inconnue reste telle quelle.
 */

// Variables des infos de l'analyse → propriété de infos.yaml
const INFOS_VARIABLES = {
    'title':          'piece_title'
  , 'composer':       'composer'
  , 'analysis-title': 'analyse_title'
  , 'analyst':        'analyst'
}

const VARIABLE_REG = /\{([\p{L}\p{N}_\-]+)\}/gu

export class Variables {

  /**
   * @return le nom de variable +name+ nettoyé (accolades et espaces
   * retirés), ou '' s'il n'est pas valide
   */
  static clean(name){
    name = String(name || '').trim().replace(/^\{|\}$/g, '').trim()
    return /^[\p{L}\p{N}_\-]+$/u.test(name) ? name : ''
  }

  // @return true si +name+ est une variable des infos de l'analyse
  static isReserved(name){
    return name in INFOS_VARIABLES
  }

  // @return le motif qui définit la variable +name+ (autre que +except+)
  static motifOf(name, except){
    return AObjet.selectFirst(ao => ao.type == 'mot' && ao.data.variable == name && ao !== except)
  }

  // @return la valeur de la variable +name+, ou undefined (inconnue)
  static valueOf(name){
    if ( this.isReserved(name) ) {
      const infos = (Current.analyse && Current.analyse.infos) || {}
      return infos[INFOS_VARIABLES[name]] || ''
    }
    const motif = this.motifOf(name)
    return motif ? String(motif.content || '') : undefined
  }

  // @return +str+ dont les variables connues sont remplacées
  static replaceIn(str){
    if ( !str || !String(str).includes('{') ) return str
    return String(str).replace(VARIABLE_REG, (tout, name) => {
      const value = this.valueOf(name)
      return undefined === value ? tout : value
    })
  }

  /**
   * Réaffiche les marques dont le texte contient une variable (après
   * modification des infos de l'analyse ou d'un motif)
   */
  static refresh(){
    AObjet.each(ao => {
      if ( ao.isMark && ao.contentSpan && String(ao.content || '').includes('{') ) {
        ao.contentSpan.innerHTML = ao.formated_content
      }
    })
    this.updateMenus()
  }

  /**
   * Noms des variables : {general} (infos de l'analyse), {motifs}
   * (variables des motifs, par ordre alphabétique)
   */
  static get names(){
    const motifs = new Set()
    AObjet.each(ao => ao.type == 'mot' && ao.data.variable && motifs.add(ao.data.variable))
    return {general: Object.keys(INFOS_VARIABLES), motifs: [...motifs].sort((a, b) => a.localeCompare(b))}
  }

  // `{<name>}` copié dans le presse-papier (message temporaire)
  static copy(name){
    const text = `{${name}}`
    invoke('clipboard:write', {text})
      .then(() => message(t('messages.variable_copied', {text}), {duration: 3000}))
      .catch(err => erreur(err.message))
  }

  // Menu « Outils > Variable » actualisé quand les variables changent
  static updateMenus(){
    const names = this.names
    const key = JSON.stringify(names)
    if ( key == this._menusKey ) return
    this._menusKey = key
    invoke('menu:variables', names).catch(err => console.error(err))
  }
}
