import { DCreate, DGet, listen, stopEvent } from './dom.js'
import { px, unpx } from './handies.js'
import { pref } from './Preferences.js'
import { Grid } from './Grid.js'
import { AObjet } from './AObjet.js'
import { AMark } from './AMark.js'
import { Systeme } from './Systeme.js'
import { TableAnalyse } from './TableAnalyse.js'
import { Analyse } from './Analyse.js'
import { Preferences } from './Preferences.js'
import { Tools } from './Tools.js'
import { Form } from './Form.js'
import { Mouse } from './Mouse.js'
import { SelectionTool } from './MenuSelection.js'
import { BordersTool } from './MenuBords.js'
import { OptionsTool } from './MenuOptions.js'
import { AmarkMenu } from './MenuAMark.js'
import { AlignMenu } from './MenuAligner.js'
import { AdjustMenu } from './MenuAjuster.js'
import { MenusBar } from './MenusBar.js'
import { Themes } from './Themes.js'
import { onKeyUpOnAnalyse, onKeyDownOnAnalyse, onKeypressOnAnalyse, onKeyDownUniversel } from './KeyboardEvents.js'

export class UIClass {

  /**
   * Pour activer les raccourcis courants (utilisés au cours de 
   * l'analyse en elle-même)
   * 
   */
  reactiveCurrentShortcuts(){
    // console.info("-> activation des raccourcis d'analyse")
    window.onkeyup    = onKeyUpOnAnalyse.bind(null)
    window.onkeydown  = onKeyDownOnAnalyse.bind(null)
    window.onkeypress = onKeypressOnAnalyse.bind(null)
  }
  /**
   * Pour désactiver les raccourcis courants (par exemple lorsqu'on
   * ouvre un panneau, comme le panneau des données de l'analyse)
   * 
   */
  desactiveCurrentShortcuts(){
    // console.info("-> désactivation des raccourcis d'analyse")
    window.onkeyup    = null
    window.onkeydown  = onKeyDownUniversel
    window.onkeypress = null
  }

  /**
   * Préparation de l'interface en début de session
   * 
   */
  setInterface(){

    Preferences.init()

    // Les panneaux de l'interface
    Analyse.panneau_infos.init()
    Tools.init()

    // Le menu du pied de page
    SelectionTool.init()

    // Le menu "Bords" du pied de page
    BordersTool.init()

    // Le menu "Options" du pied de page
    OptionsTool.init()

    // Le menu "AMarque"
    AmarkMenu.init()


    // Le menu "Aligner…"
    AlignMenu.init()

    // Le menu "Ajuster"
    AdjustMenu.init()

    // Thème de l'interface (avant l'envoi des menus)
    Themes.init()

    // Ces menus dans la barre de menus de l'application
    MenusBar.init()

    // Tout ce qui concerne la forme
    Form.init()
        
    // Coordonnées de la souris
    Mouse.observe()

    this.TableAnalyse.onfocus = (e) => {
      this.TableAnalyse.style.border = "2px solid blue"
    }
    this.TableAnalyse.focus()

    // Observation des éléments de l'interface
    //
    this.observe()

    /**
     * Activation des raccourcis clavier
     */
    UI.reactiveCurrentShortcuts()

    AObjet.resetSelection()
  }

  observe(){
    listen(window, 'dblclick', this.onDoubleClick.bind(this))
    // listen(this.TableAnalyse, 'click', (e)=>{/*console.log("Un clic sur la table d'analyse.")*/})

      

    // Liens vers d'autres marques ([#id] dans les textes)
    listen(this.TableAnalyse, 'click', (e) => {
      const lien = e.target.closest('.goto-tag')
      if ( lien ) {
        AObjet.goto(Number(lien.dataset.tag))
        return stopEvent(e)
      }
    })

    // Pour gérer les sélections
    TableAnalyse.observe()

  }

  onDoubleClick(e){

    // On crée un nouvel élément
    AMark.createNew.call(AMark, e)

    return stopEvent(e)
  }

  /**
   * La lumière rouge/verte d'état d'enregistrement
   * 
   */
  eteinsRedLight(){
    this.redLight.classList.remove('red')
  }
  allumeRedLight(){
    this.redLight.classList.add('red')
  }
  get redLight(){
    return this._redlight || (this._redlight = DGet('#red-light'))
  }


  /* --- Grid Methods --- */

  get magneticGridON(){
    return Grid.on
  }

  toggleGridDisplay(){
    /**
     ** Méthode appelée quand on active ou désactive un magnétisme. Elle
     ** affiche (construit) ou masque la grille : lignes horizontales
     ** pour le magnétisme vertical, verticales pour l'horizontal.
    */
    this.MagneticGrid || this.buildGrid()
    this.MagneticGrid.classList[Grid.on ? 'remove' : 'add']('hidden')
    this.gridHLines.hidden = !Grid.vertical
    this.gridVLines.hidden = !Grid.horizontal
  }
  buildGrid(){
    /**
     ** (Re)Construction de la grille magnétique.
     **/
    /*
    |  La grille (objet DOM)
    */
    this.MagneticGrid = DCreate('DIV',{id:'magnetic-grid',class:'hidden',style:'position:absolute;top:0px;left:0px;'})
    this.gridHLines = DCreate('DIV', {class: 'grid-hlines'})
    this.gridVLines = DCreate('DIV', {class: 'grid-vlines'})
    this.MagneticGrid.appendChild(this.gridHLines)
    this.MagneticGrid.appendChild(this.gridVLines)
    document.body.appendChild(this.MagneticGrid)

    /*
    |  Les valeurs à utiliser
    */
    const hsnap   = Number(pref('grid_horizontal_space'))
    const vsnap   = Number(pref('grid_vertical_space'))
    const maxTop  = unpx(DGet('section#content').style.height) + 500
    const maxLeft = unpx(getComputedStyle(DGet('section#content')).getPropertyValue('width')) + 100
    /*
    |  Les lignes horizontales
    */
    var curTop =  0 /* rectif */
    while ( curTop < maxTop ) {
      const hLine = DCreate('DIV', {style:`top:${curTop}px;width:${maxLeft}px;position:absolute;height:1px;background-color:pink;opacity:0.5;`})
      this.gridHLines.appendChild(hLine)
      curTop += vsnap
    }
    /*
    |  Les lignes verticales
    */
    var curLeft = 0 /* rectif */
    while ( curLeft < maxLeft ) {
      const vLine = DCreate('DIV', {style:`left:${curLeft}px;height:${maxTop}px;position:absolute;top:0px;width:1px;background-color:pink;opacity:0.5;`})
      this.gridVLines.appendChild(vLine)
      curLeft += hsnap
    }
  
  }


  // Le picto pour verrouiller les systèmes
  // Le picto pour activer l'enregistrement

  get TableAnalyse(){
    return this._tableana || (this._tableana = DGet('body section#content'))
  }
}
export const UI = new UIClass()
