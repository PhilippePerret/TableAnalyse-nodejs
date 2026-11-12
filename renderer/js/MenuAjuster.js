import { not } from './lib/common.js'
import { erreur } from './lib/Message.js'
import { MenusTool } from './MenusTool.js'
import { AObjet } from './AObjet.js'
import { Systeme } from './Systeme.js'
import { on } from './events.js'
import { t } from './i18n.js'
/**

  Class AjustMenu
  ---------------
  Gestion du menu principal "Ajuster"

  cf. la class MenusTool pour le fonction général

*/
export class AdjustMenu extends MenusTool {

  static init(){
    super.init()
    this.setAllMenusAjustement(false)
    on('selection:changed', ({selection}) => this.setStateBySelection(selection.length))
  }

  static setStateBySelection(count){
    this.setAllMenusAjustement(count > 1)
  }

  static setAllMenusAjustement(state){
    const dernierMenu = this.menu.options.length - 1
    for(var i = 1; i < dernierMenu; ++i){
      const menu = this.menu.options[i]
      // if ( ['SYS'].includes(menu.value) ) continue
      menu.disabled = not(state)
    }
  }


  /* --- On Activate Methods --- */

  static onActivate(e, adjust, option) {
    switch(adjust){
    case 'cancel':
      return this.cancelLastAjustement()
    case 'V':
      return this.ajusterVerticalement()
    case 'H':
      return this.ajusterHorizontalement()
    case 'SH':
      return this.spreadHorizontaly()
    case 'SV':
      return this.spreadVerticaly()
    case 'SYS':
      return this.ajusterSystemsEtObjets()
    default:
      erreur(t('errors.unknown_adjust', {adjust}))
    }
  }


  /* --- Operational Methods --- */

  static ajusterSystemsEtObjets(){
    /**
     ** Répartit les systèmes et leurs objets. C'est-à-dire qu'on
     ** met toujours le même écart entre l'objet le plus bas d'un
     ** système et l'objet le plus haut du système suivant.
     **/
    const nombreSystemes = Systeme.count
    for(var i = 1; i < nombreSystemes; ++i) {
      const cursys = Systeme.all[i]
      const presys = Systeme.all[i-1]
      console.debug("Système %i, top: %i", i, cursys.real_top, cursys.real_top + cursys.full_height)
    }
  }


  static spreadHorizontaly(){
    /**
     ** Répartit les éléments de la sélection horizontalement
     **/
    this.spreadTo('H')
  }
  static spreadVerticaly(){
    /**
     ** Répartit les éléments de la sélection verticalement
     **/
    this.spreadTo('V')
  }
  static spreadTo(direction){
    /**
     ** Répartit les éléments de la sélection verticalement ou 
     ** horizontalement en fonction de +direction+ qui peut être 
     ** 'H' ou 'V'
     **
     ** Cela consiste à mettre le même écart entre tous les éléments
     ** sélectionné, verticalement.
     **
     **/
    /*
    |  Les propriétés à prendre en compte en fonction de la 
    |  direction de l'alignement.
    */
    const prevProp = (direction == 'H') ? 'right' : 'bottom'
    const nextProp = (direction == 'H') ? 'left'  : 'top'
    /*
    |  On met les éléments dans l'ordre
    */
    const selection = AObjet.dupSelection()
    /*
    |  Les blocs dans l'ordre
    */
    selection.sort(function(a,b) { return a[nextProp] - b[nextProp] })
    /*
    |  Pour simplifier le code
    */
    const nombreTags = selection.length
    /*
    |  On fait la somme de ce qui sépare chaque bloc (pour en faire
    |  ensuite la moyenne à appliquer entre chacun d'entre eux)
    */
    var ecart_total = 0
    for ( var i = 1; i < nombreTags ; ++i){
      const curtag = selection[i]
      const pretag = selection[i-1]
      pretag[`_${prevProp}`] = null // pour forcer le recalcul
      ecart_total += curtag[nextProp] - pretag[prevProp]
    }
    // console.debug("écart total = %i", ecart_total)
    /*
    |  On applique la moyenne
    */
    const ecart_moyen = ecart_total / (nombreTags - 1)
    // console.debug("écart moyen = %i", ecart_moyen)
    for ( var i = 1; i < nombreTags - 1; ++i ) {
      const curtag = selection[i]
      const pretag = selection[i-1]
      pretag[`_${prevProp}`] = null // pour forcer le recalcul
      curtag[nextProp] = selection[i-1][prevProp] + ecart_moyen
    }
  }


  /* --- Functional Methods --- */


  static ajusterVerticalement(){
    this.ajuster('V')
  }
  static ajusterHorizontalement(){
    this.ajuster('H')
  }
  static ajuster(sens){
    /**
    ** Prend les boites qui sont à peu près aligner horizontalement
    ** et les met bord à bord et de même taille vertical
    **/
    const selection = AObjet.selection
    const boucle    = AObjet.eachSelection.bind(AObjet)
    const forH      = sens == 'H'
    const minProp   = forH ? 'top'    :'left'  
    const maxProp   = forH ? 'height' :'width'
    const sortProp  = forH ? 'left'   : 'top'
    const ctrProp   = forH ? 'right'  : 'bottom' // le bord contre lequel s'aligner
    
    /*
    |  Prendre la valeur minimale
    |  (le top pour l'ajustement H, le left pour l'ajustement V)
    */
    var minVal = null
    boucle(tag => {
      if ( not(minVal) || tag[minProp] < minVal ) { 
        minVal = tag[minProp] 
      }
    })
    // console.debug("minVal = ", minVal)

    /*
    |  Prendre la valeur maximale
    |  (le height pour l'ajustement H, le width pour l'ajustement V)
    */
    var maxVal = 0
    boucle(tag => {
      if ( tag[maxProp] > maxVal ) maxVal = tag[maxProp]
    })
    // console.debug("maxVal = ", maxVal)

    /*
    |  Classer les boites
    |  (dans l'ordre de leur left pour l'ajustement Horizontal et 
    |   dans l'ordre de leur top pour l'ajustement Verticalement)
    */
    selection.sort(function(a, b){
      return (a[sortProp] < b[sortProp]) ? -1 : 1
    })

    /*
    |  Pour conserver les boites ajustées
    */
    this.lastAdjustedTags = []

    /*
     |  Boucle pour ajuster toutes les boites sélectionnées
     */ 
    var wBorder ;
    const nombreBoites = selection.length
    for (var i = 0; i < nombreBoites; ++i) {
      const currtag = selection[i]
      /*
      |  On conserve les valeurs actuelles pour pouvoir les
      |  remettre en cas d'annulation.
      */
      // currtag.lastTop     = 0 + currtag.top
      currtag[sortProp+'Last'] = 0 + currtag[sortProp]
      // currtag.lastLeft    = 0 + currtag.left
      currtag[minProp+'Last'] = 0 + currtag[minProp]
      // currtag.lastHeight  = 0 + currtag.height
      currtag[maxProp+'Last'] = 0 + currtag[maxProp]

      if ( i > 0 ) {
        /*
        |  Si ce n'est pas la première boite, il faut la coller
        |  à la boite précédente.
        */
        const prevtag = selection[i-1]
        wBorder = this.getBordWidth(prevtag.obj, ctrProp)
        currtag[sortProp] = prevtag[ctrProp] //- wBorder
        console.debug("currtag.%s mis à prevtag.%s (%i) - wBorder (%s) = %i" , sortProp, ctrProp, prevtag[ctrProp], wBorder, currtag[sortProp])
      }
      // currtag.top     = minTop
      currtag[minProp]  = minVal
      // currtag.height  = maxHeight
      currtag[maxProp]  = maxVal
      /*
      |  On mémorise cette tag déplacée
      */
      this.lastAdjustedTags.push(currtag)
    }

    /*
    |  Vérification avec les bords explicites
    */
    for (var i = 1; i < nombreBoites; ++i){
      const currtag = selection[i]
      const prevtag = selection[i-1]
      if ( forH ) {
        const wborder = this.getBordWidth(prevtag.obj, 'right')
        if ( currtag.left != prevtag.right - wborder ) {
          console.error("currtag.left (%s) ne correspond pas à prevtag.right (%s) - wborder (%s)", currtag.left, prevtag.right, wborder)
        }
        if ( currtag.left != prevtag.left + prevtag.width) {
          console.error("Le left ne correspond pas")
        }
      } else {
        const wborder = this.getBordWidth(prevtag.obj, 'bottom')
        if ( currtag.top != prevtag.bottom - wborder) {
          console.error("currtag.top (%s) ne correspond à prevtag.bottom (%s) - wborder (%s)", currtag.top, prevtag.bottom, wborder)
        }
        currtag.top = prevtag.top + prevtag.height //- wborder
        if ( currtag.top != prevtag.top + prevtag.height - wborder) {
          console.error("Le top ne correspond pas : currtag.top (%s) != (%s) prevtag.top (%s) + prevtag.height (%s) - wborder (%s)", currtag.top, prevtag.top + prevtag.height - wborder, prevtag.top, prevtag.height, wborder)
          currtag.top = prevtag.top + prevtag.height - wborder
        }
      }
    }

  }

  static getBordWidth(obj, side){
    const wborder = getComputedStyle(obj,null).getPropertyValue(`border-${side}-width`)
    return Number(wborder.replace(/(px|pt|em|rem|cm|mm)/,'')) // normalement, toujours en px, mais plus tard ?…
  }

  static cancelLastAjustement(){
    /**
     ** Pour annuler le dernier ajustement
     **/
    this.lastAdjustedTags.forEach(tag => {
      [
        'left','top','right','bottom','width','height'
      ].forEach(prop => {
        if ( undefined == tag[prop + 'Last'] ) return
        tag[prop] = tag[prop + 'Last']
        delete tag[prop + 'Last']
        tag[prop + 'Last'] = undefined
      })
    })
    this.lastAdjustedTags = null
  }
}
