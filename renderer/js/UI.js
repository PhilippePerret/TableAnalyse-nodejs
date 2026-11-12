import { DCreate, DGet, listen, stopEvent } from './dom.js'
import { px, unpx } from './handies.js'
import { pref } from './Preferences.js'
import { Grid } from './Grid.js'
import { AObjet } from './AObjet.js'
import { AMark } from './AMark.js'
import { Systeme } from './Systeme.js'
import { TableAnalyse } from './TableAnalyse.js'
import { AnalyseSaver } from './AnalyseSaver.js'
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

    listen(this.btnLockSystems, 'click', Systeme.toggleLock.bind(Systeme))
    listen(this.btnSaveAnalyse, 'click', AnalyseSaver.save.bind(AnalyseSaver))
      
    listen(DGet('footer'), 'click', function(e){return stopEvent(e)})
    listen(DGet('footer'), 'dblclick', function(e){e.stopPropagation()})

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
    this.btnSaveAnalyse.classList.remove('actived')
    this.redLight.classList.remove('red')
  }
  allumeRedLight(){
    this.btnSaveAnalyse.classList.add('actived')
    this.redLight.classList.add('red')
  }
  get redLight(){
    return this._redlight || (this._redlight = DGet('#red-light'))
  }


  /* --- Grid Methods --- */

  get magneticGridON(){
    return Grid.on
  }

  toggleGridDisplay(modeON){
    /**
     ** Méthode appelée quand on active ou désactive le mode Grid (a-
     ** lignement sur une grille). Elle affiche (construit) ou la 
     ** masque  
    */
    this.MagneticGrid || this.buildGrid()
    this.MagneticGrid.classList[modeON?'remove':'add']('hidden')
  }
  buildGrid(){
    /**
     ** (Re)Construction de la grille magnétique.
     **/
    /*
    |  La grille (objet DOM)
    */
    this.MagneticGrid = DCreate('DIV',{id:'magnetic-grid',class:'hidden',style:'position:absolute;top:0px;left:0px;'})
    document.body.appendChild(this.MagneticGrid)

    /*
    |  Les valeurs à utiliser
    */
    const hsnap   = Number(pref('grid_horizontal_space'))
    const vsnap   = Number(pref('grid_vertical_space'))
    const maxTop  = unpx(DGet('section#content').style.height) + 500
    console.debug("maxTop = ", maxTop, typeof maxTop)
    const maxLeft = unpx(getComputedStyle(DGet('section#content')).getPropertyValue('width')) + 100
    /*
    |  Les lignes horizontales
    */
    var curTop =  0 /* rectif */
    while ( curTop < maxTop ) {
      const hLine = DCreate('DIV', {style:`top:${curTop}px;width:${maxLeft}px;position:absolute;height:1px;background-color:pink;opacity:0.5;`})
      this.MagneticGrid.appendChild(hLine)
      curTop += vsnap
    }
    /*
    |  Les lignes verticales
    */
    var curLeft = 0 /* rectif */
    while ( curLeft < maxLeft ) {
      const vLine = DCreate('DIV', {style:`left:${curLeft}px;height:${maxTop}px;position:absolute;top:0px;width:1px;background-color:pink;opacity:0.5;`})
      this.MagneticGrid.appendChild(vLine)
      curLeft += hsnap
    }
  
  }


  // Le picto pour verrouiller les systèmes
  get btnLockSystems(){return this._btnlocksys || (this._btnlocksys = DGet('footer #cb_staves_lock'))}
  // Le picto pour activer l'enregistrement
  get btnSaveAnalyse(){return this._btnrecord || (this._btnrecord = DGet('footer #cb_recording'))}

  get TableAnalyse(){
    return this._tableana || (this._tableana = DGet('body section#content'))
  }
}
export const UI = new UIClass()
