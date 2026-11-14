/**
 *
 * AnalyseSaver
 * ============
 * Enregistrement de l'analyse (marques, préférences, infos et
 * systèmes).
 *
 */
import { erreur } from './lib/Message.js'
import { invoke } from './api.js'
import { AObjet } from './AObjet.js'
import { Current } from './Current.js'
import { Preferences } from './Preferences.js'
import { Systeme } from './Systeme.js'
import { Analyse } from './Analyse.js'
import { t } from './i18n.js'

export class AnalyseSaver {

  /**
   * Appelée par le bouton "Sauver", ⌘S, le menu Fichier > Enregistrer
   * et la sauvegarde automatique.
   *
   * @return true en cas de succès
   */
  static async save(){
    const analyse = Current.analyse
    if ( !analyse ) {
      erreur(t('errors.need_analyse_to_save'))
      return false
    }
    // Un enregistrement est déjà en cours (⌘S + menu, par exemple)
    if ( this.saving ) return this.saving
    this.saving = this.proceedSave(analyse)
    try {
      return await this.saving
    } finally {
      this.saving = null
    }
  }

  static async proceedSave(analyse){
    try {
      /*
      |  On vérifie qu'il n'y ait pas de problèmes
      */
      analyse.checkDataBeforeSave()
      /*
      |  On prend le scroll actuel pour pouvoir le remettre
      */
      Preferences.set('last_scroll' , window.scrollY)
      await this.saveAnalyseTags(analyse)
      await this.savePreferences(analyse)
      await this.saveInfos(analyse)
      analyse.modified = false
      console.info("Enregistrement terminé.")
      return true
    } catch(err) {
      erreur(t('errors.cannot_save', {error: err.message || err}))
      console.error("Enregistrement interrompu.", err)
      return false
    }
  }

  static async saveInfos(analyse){
    // Infos de l'analyse (et non du panneau, qui peut servir à une création)
    var newInfos = Object.assign({}, analyse.data.infos)
    Object.assign(newInfos, {
        systems:  Systeme.getData()
    })
    delete newInfos.form // ancien panneau de la forme
    analyse.data.infos = newInfos
    await invoke('analyse:saveInfos', {infos: newInfos})
    console.info("CONF: Infos de l'analyse enregistrées.")
  }

  static async savePreferences(analyse){
    await invoke('analyse:savePreferences', {preferences: Preferences.getData()})
    console.info('CONF: Préférences de l’analyse enregistrées.')
  }

  /**
   * Enregistrement des tags d'analyse
   */
  static async saveAnalyseTags(analyse){
    const atags = []
    AObjet.items.forEach(objet => {
      if ( objet.isSystem  ) return
      atags.push(objet.data)
    })
    await invoke('analyse:saveTags', {tags: atags})
    console.info("CONF: Marques de l'analyse enregistrées.")
  }

  /**
   * Méthode de classement des objets
   * --------------------------------
   * Cette méthode doit permettre d'avoir une liste classée des
   * objets. Mais elle fonctionne de façon simple maintenant que les
   * objets sont associés à leur système. Il suffit de les vérifier
   * de gauche à droite
   */
  static objetSorting(a, b){
    return a.left < b.left ? -1 : 1
  }
}
