import { pref } from './Preferences.js'
import { UI } from './UI.js'
import { emit } from './events.js'
/**
 * Aspect de l'analyse (préférence « theme ») : modes gris (#240).
 * Classe aspect-<thème> sur la table d'analyse (cf. AMark.css). Une
 * marque peut être sortie du mode gris (classe « ungray », cf. AMark).
 */
const GRAY_ASPECTS = ['gris', 'clair_de_gris']

export const Aspect = {
  get current(){ return pref('theme') },
  get isGray(){ return GRAY_ASPECTS.includes(this.current) },
  apply(){
    const table = UI.TableAnalyse
    if ( !table ) return
    GRAY_ASPECTS.forEach(a => table.classList.toggle(`aspect-${a}`, a == this.current))
    emit('aspect:changed', {aspect: this.current})
  }
}
