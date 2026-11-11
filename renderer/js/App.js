import { message, erreur } from './lib/Message.js'
import { invoke, onMain } from './api.js'
import { Analyse } from './Analyse.js'
import { AnalyseSaver } from './AnalyseSaver.js'
import { Preferences } from './Preferences.js'
import { PreferencesPanel } from './PreferencesPanel.js'
import { Manuel } from './Manuel.js'
import { Tools } from './Tools.js'

class AppClass {

  /**
   * Méthode appelée au chargement de l'application pour charger
   * l'analyse courante (if any)
   */
  async load_analyse_if_exist(){
    try {
      await Preferences.loadThemes()
      this.onload_analyse(await invoke('analyse:getCurrent'))
    } catch(err) {
      console.error(err)
      erreur(err.message)
    }
  }

  /**
   * Si une analyse est en cours, cette méthode reçoit les éléments
   */
  onload_analyse(data){
    if (data) {
      var analyse = new Analyse(data)
      Preferences.setValuesSaved(data.preferences)
      analyse.checkSystems()
      analyse.display()
      analyse.applyWindowSize()
      analyse.scrollToLastPosition()
      PreferencesPanel.afterLoadingAnalyse()
    } else {
      message("Aucune analyse n'est ouverte.<br><br>Utiliser le menu « Fichier » pour ouvrir une analyse existante (⌘O) ou en créer une nouvelle (⌘N).", {keep: true})
    }
  }

  /**
   * Commandes envoyées par le menu de l'application
   */
  onMenuCommand(command){
    switch(command){
      case 'newAnalyse':    return Analyse.newAnalyse()
      case 'openAnalyse':   return Analyse.openAnalyse()
      case 'reloadAnalyse': return Analyse.reloadAnalyse()
      case 'save':          return AnalyseSaver.save()
      case 'infosAnalyse':  return Analyse.panneau_infos.toggle()
      case 'exportToHTML':  return Analyse.exportCurrentToHtml()
      case 'toolsPanel':    return Tools.toggle()
      case 'prefs':         return PreferencesPanel.toggle()
      case 'manual':        return Manuel.toggle()
      default: console.error("Commande de menu inconnue : %s", command)
    }
  }

  /**
   * Avant la fermeture de la fenêtre : on enregistre l'analyse si
   * elle a été modifiée.
   */
  async onWillClose(){
    try {
      await Analyse.saveIfModified()
    } finally {
      invoke('app:closeReady')
    }
  }

  observe(){
    onMain('menu', this.onMenuCommand.bind(this))
    onMain('app:will-close', this.onWillClose.bind(this))
    window.onresize = function(){
      if ( Analyse.current ) {
        Analyse.current.defineWindowSize(window.outerWidth, window.outerHeight)
      }
    }
  }
}

export const App = new AppClass()
