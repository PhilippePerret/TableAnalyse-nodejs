import { DCreate, DGet, listen, stopEvent } from './dom.js'
import { isBool } from './lib/common.js'
import { Panneau } from './Panneau.js'
import { onKeyDownUniversel, inTextField } from './KeyboardEvents.js'
import { ManuelData, ManuelShortcutsData } from './Manuel_AppData.js'
import { t, cmdText } from './i18n.js'
/**
 * Manuel
 * ------
 * version 1.0.0
 * 
 * Pour afficher le manuel de l'application.
 * 
 * 
 # 1.0.0
    Version complète avec affichage des raccourcis-clavier
    
 # 0.1.0
    Première version utilisable
 */


class ManuelClass {

  toggle(){this.panneau.toggle.call(this.panneau)}
  get panneau(){return this._pano || (this._pano = new Panneau(this))}
  get panneauId(){return 'manuel'}
  get panneauTitle(){return t('ui.panels.manual.title')}
  onKeyPress(e){
    var returnU = onKeyDownUniversel(e)
    if ( isBool(returnU) ) return returnU
    if ( e.shiftKey && e.key == 'M' && !inTextField(e) ) return this.toggle()
  }

  build(){
  
    this.buildShortcutPanel()

    const o = DCreate('SECTION', {id:"manuel", class:'hidden'})

    const cont = DCreate('DIV', {id:'contenu_manuel', class:'content'})
   

    //
    // La section des raccourcis clavier (if any)
    //
    if ( this.shortcutsSection ) {
      cont.appendChild(DCreate('BUTTON', {id:'btn_shortcuts', style:"float:right;", text:t('ui.panels.manual.shortcuts')}))
      o.appendChild(this.shortcutsSection)
    }


    var ioperation = 0
    ManuelData.forEach(md => {
      const op = new ManuelItem(Object.assign(cmdData(md), {index: ++ioperation}))
      cont.appendChild(op.build())
    })
    o.appendChild(cont)

    //
    // On ajoute tout ça au DOM
    //
    document.body.appendChild(o)
    this.obj = o
    this.observe()
  }


  /**
   * Construction du panneau des raccourcis, s'ils sont définis
   * 
   * L'application doit définir la constante ManuelShortcutsData
   */
  buildShortcutPanel(){
    const o = DCreate('SECTION', {id:'manuel_shortcuts', class:'hidden'})
    o.appendChild(DCreate('BUTTON', {id:'btn_manuel', style:"float:right;", text:t('ui.panels.manual.manual_button')}))
    o.appendChild(DCreate('H2', {text:t('ui.panels.manual.shortcuts_list')}))
    const tbl = DCreate('TABLE', {id:'table_shortcuts'})
    o.appendChild(tbl)
    var ishortcut = 0
    ManuelShortcutsData.forEach(msd => {
      const shc = new ManuelShortcut(Object.assign(cmdData(msd), {index:++ishortcut}))
      tbl.appendChild(shc.build())
    })
    this.shortcutsSection = o
  }

  observe(){
    const btnShortcuts  = DGet('#btn_shortcuts', this.obj)
    const btnManuel     = DGet('#btn_manuel', this.obj)
    listen(btnShortcuts,  'click', this.toggleShortcutsPanel.bind(this))
    listen(btnManuel,     'click', this.toggleShortcutsPanel.bind(this))
  }

  toggleShortcutsPanel(){
    if ( this.isShortcutPanelDisplayed ) {
      this.shortcutsSection.classList.add('hidden')
      this.manualContent.classList.remove('hidden')
    } else {
      this.shortcutsSection.classList.remove('hidden')
      this.manualContent.classList.add('hidden')
    }
    this.isShortcutPanelDisplayed = !this.isShortcutPanelDisplayed
  }


  get manualContent(){return this._manualcont || (this._manualcont = DGet('#contenu_manuel', this.obj))}
}

/**
*
* INSTANCE MAMNUEL
*/
export const Manuel = new ManuelClass()


// Le manuel est écrit avec ⌘ : touche de commande du système
function cmdData(data){
  const fix = (v) => typeof v == 'string' ? cmdText(v) : (Array.isArray(v) ? v.map(fix) : v)
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, fix(v)]))
}

class ManuelItem {
  constructor(data){
    this.index     = data.index
    this.operation = data.operation
    this.procedure = data.procedure
    this.precision = data.precision
    this.note      = data.note
  }

  build(){
    const o = DCreate('DIV', {id:`operation-${this.index}`, class:'operation-manuel'})
    const tit = DCreate('DIV',{class:'operation-titre', text: this.operation})
    listen(tit, 'click', this.toggleProcedure.bind(this))
    o.appendChild(tit)
    const proc = DCreate('DIV', {class:'operation-procedure hidden', text: this.codeProcedure()})
    if ( this.precision ){
      proc.appendChild(DCreate('DIV', {class:'operation-precision', text:this.precision}))
    }
    o.appendChild(proc)
    this.divProc = proc
    this.obj = o
    return this.obj // pour le mettre tout de suite
  }

  codeProcedure(){
    if ( 'string' == typeof this.procedure ) {
      if ( this.procedure.substring(0,1) == '<') {
        return this.procedure
      } else {
        return '<p>' + this.procedure + '</p>'
      }
    } else {
      var c = this.procedure.map(p => `<li>${p}</li>`).join('')
      return '<ul>' + c + '</ul>'
    }
  }

  toggleProcedure(e){
    this.divProc.classList[ this.isOpened ? 'add' : 'remove']('hidden')
    this.isOpened = !this.isOpened
    return stopEvent(e)
  }

}


class ManuelShortcut {
  constructor(data){
    this.data = data
    this.index      = data.index
    this.operation  = data.operation
    this.shortcut   = data.shortcut
    this.precision  = data.precision
    this.note       = data.note
  }

  /**
   * Construction de cette ligne pour le raccourci
   * 
   */
  build(){
    const o = DCreate('TR', {class:'shortcut_tr'})
    o.appendChild(DCreate('TD', {text: this.operation, class:'ope_td'}))
    o.appendChild(DCreate('TD', {text: this.shortcut, class:'shortcut_td'}))
    o.appendChild(DCreate('TD', {text: this.precision || '', class:'precision_td'}))
    this.obj = o
    return o
  }
}
