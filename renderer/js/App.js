import { message, erreur } from './lib/Message.js'
import { invoke, onMain } from './api.js'
import { Analyse } from './Analyse.js'
import { AnalyseSaver } from './AnalyseSaver.js'
import { Preferences } from './Preferences.js'
import { PreferencesPanel } from './PreferencesPanel.js'
import { Manuel } from './Manuel.js'
import { Tools } from './Tools.js'
import { Forme } from './Forme.js'
import { Exporter } from './Exporter.js'
import { Animation } from './Animation.js'
import { TableAnalyse } from './TableAnalyse.js'
import { t } from './i18n.js'
import { DCreate } from './dom.js'
import { History } from './History.js'
import { Variables } from './Variables.js'
import { Split } from './Split.js'
import { Systeme } from './Systeme.js'
import { keepPanelsInView } from './Panneau.js'
import { once } from './events.js'
import { Partage } from './Partage.js'

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
      // Analyse suivie (partage) : lecture seule
      data.partage && Partage.enterSpectator(data.partage)
      Preferences.setValuesSaved(data.preferences)
      analyse.checkSystems()
      analyse.display()
      analyse.applyWindowSize()
      analyse.scrollToLastPosition()
      PreferencesPanel.afterLoadingAnalyse()
      // Numéros de mesure tout juste importés (découpe, numérotation) :
      // distance après leur ligne (distance_after_measure_line) appliquée
      // et enregistrée
      data.measures_imported && once('systems:loaded', () => requestAnimationFrame(() => {
        Systeme.spaceAfterMeasureLines()
        AnalyseSaver.save()
      }))
      if ( data.just_cut ) {
        message(t('messages.after_cut'), {keep: true})
      } else if ( !data.systems_in_folder.length ) {
        message(t('messages.no_systems'), {keep: true})
      }
    } else {
      this.showWatermark()
    }
  }

  /**
   * Table vide : nom de l'application en filigrane (fondu), puis lien
   * vers la prise en main du manuel
   */
  showWatermark(){
    const titre = DCreate('SPAN', {class: 'filigrane-titre', text: t('ui.app.name')})
    const lien  = DCreate('A', {class: 'filigrane-lien', text: t('ui.app.getting_started')})
    titre.addEventListener('animationend', () => lien.classList.add('visible'))
    lien.addEventListener('click', () => invoke('app:openManual', {anchor: 'prise-en-main'}).catch(err => erreur(err.message)))
    document.body.appendChild(DCreate('DIV', {id: 'filigrane', inner: [titre, lien]}))
  }

  /**
   * Commandes envoyées par le menu de l'application
   */
  onMenuCommand(command){
    switch(command){
      case 'newAnalyse':    return Analyse.newAnalyse()
      case 'openAnalyse':   return Analyse.openAnalyse()
      case 'reloadAnalyse': return Analyse.reloadAnalyse()
      case 'closeAnalyse':  return Analyse.closeAnalyse()
      case 'save':          return AnalyseSaver.save()
      case 'cutScore':      return Analyse.cutScore()
      case 'numberScore':   return Analyse.numberScore()
      case 'renumberMeasures': return Systeme.renumberAllMeasures()
      case 'infosAnalyse':  return Analyse.panneau_infos.toggle()
      case 'history':       return History.show()
      case 'export':        return Exporter.ask()
      case 'toolsPanel':    return Tools.toggle()
      case 'gotoMeasure':   return Forme.gotoMeasure()
      case 'showForm':      return Forme.show(true)
      case 'hideForm':      return Forme.show(false)
      case 'buildForm':     return Forme.openBuildPanel()
      case 'animate':       return Animation.start()
      case 'removeBlanks':  return TableAnalyse.removeBlanks()
      case 'prefs':         return PreferencesPanel.toggle()
      case 'manual':        return Manuel.toggle()
      case 'toggleSplit':   return Split.toggle()
      case 'partageInvite': return Partage.openInvite()
      case 'partageJoin':   return Partage.openJoin()
      default: console.error("Commande de menu inconnue : %s", command)
    }
  }

  /**
   * Avant la fermeture de la fenêtre : analyse modifiée non enregistrée
   * → confirmation (enregistrer, quitter sans enregistrer, annuler). Un
   * enregistrement raté laisse la fenêtre ouverte.
   */
  async onWillClose(){
    if ( Analyse.current && Analyse.current.modified ) {
      const choice = await invoke('app:confirmClose')
      if ( choice == 'cancel' ) return
      if ( choice == 'save' ) {
        try {
          if ( !(await Analyse.saveIfModified()) ) return
        } catch(err) { return erreur(err.message) }
      }
    }
    invoke('app:closeReady')
  }

  observe(){
    Split.init()
    Partage.init()
    onMain('menu', this.onMenuCommand.bind(this))
    onMain('menu:variable', name => Variables.copy(name))
    // Zoom de l'affichage (cf. main.js applyZoom) : les éléments
    // d'interface gardent leur taille
    onMain('window:zoom', ({zoom, userZoom}) => {
      Preferences.set('zoom', userZoom)
      document.documentElement.style.setProperty('--ui-zoom', String(1 / zoom))
      keepPanelsInView()
      // (place de la vue de visualisation de la fenêtre scindée)
      Split.sendTitlebarHeight()
    })
    onMain('app:will-close', this.onWillClose.bind(this))
    window.onresize = function(){
      if ( Analyse.current ) {
        Analyse.current.defineWindowSize(window.outerWidth, window.outerHeight)
      }
    }
  }
}

export const App = new AppClass()
