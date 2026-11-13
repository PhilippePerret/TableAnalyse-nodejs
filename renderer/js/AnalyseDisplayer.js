/**
 * Class AnalyseDisplayer
 * ----------------------
 * Pour écrire sur la table d'analyse une analyse
 */
import { PreferencesAppData } from './Preferences_AppData.js'
import { Form } from './Form.js'
import { Analyse, setWindowTitle } from './Analyse.js'
import { UI } from './UI.js'
import { Systeme } from './Systeme.js'

export class AnalyseDisplayer {

/**
 * = main =
 *
 * Méthode principale pour afficher l'analyse {Analyse} +analyse+
 * transmise en argument.
 *
 * @return TRUE si l'affichage s'est bien passé
 */
static display(analyse){
  /**
   * Nettoyage général et notamment de la table d'analyse
   * s'il y avait déjà une analyse affichée. Normalement ça
   * n'arrive pas
   */
  this.cleanUp()

  /*
  |  Application des métadonnées
  */
  Analyse.panneau_infos.setData(analyse.infos)
  setWindowTitle(analyse.infos)

  /*
  |  Application des préférences
  |
  |   (serviront aussi pour l'affichage des systèmes et des marques,
  |    donc il faut les prendre avant d'inscrire les systèmes et les
  |    marques)
  */
  this.setPreferences(analyse.preferences)

  /*
  |  Affichage des systèmes
  */
  this.displaySystems(analyse)

  /*
  |  Affichage des marques d'analyse
  */
  this.displayAnalyseTags(analyse.tags)
  Systeme.placeMeasureNumbers() // si les images sont déjà chargées

  /*
  |  Données de forme
  */
  Form.setData(analyse.infos.form)

  console.info("= AFFICHAGE OK =")

  return true
}

/**
 * Nettoyage général de la table d'analyse
 */
static cleanUp(){
  UI.TableAnalyse.innerHTML = ''
}

/**
 * Application des préférences (principalement pour la suite)
 *
 */
static setPreferences(appPrefs){
  if ( appPrefs ) {
    Object.keys(appPrefs).forEach(prefKey => {
      if ( PreferencesAppData[prefKey] ) {
        PreferencesAppData[prefKey].value = appPrefs[prefKey]
      } else {
        console.error("Impossible de trouver la clé de préférence '%s'. Les clés des préférences ont peut-être été modifiées depuis la création de cette analyse.", prefKey)
      }
    })
  }
}

static displaySystems(analyse){
  analyse.systems.forEach(sys => sys.build())
}

static displayAnalyseTags(tags){
  tags.forEach(tag => tag.build_and_observe())
}

}// class AnalyseDisplayer
