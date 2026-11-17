import { AObjet } from './AObjet.js'
import { setModified } from './Current.js'
/**
 * Groupes de marques
 * ------------------
 *
 * Menus « Marque > Grouper / Dégrouper / Ajouter au groupe ».
 *
 * Une marque groupée définit `data.groups` : identifiants de ses
 * groupes, du plus intérieur au plus extérieur (groupes imbriqués).
 * Sélectionner une marque sélectionne toutes celles de son groupe le
 * plus extérieur (cf. AObjet.addToSelection) : elles sont déplacées,
 * supprimées, etc. ensemble (pas éditées).
 */
export class Groups {

  // Groupe le plus extérieur de +ao+ (ou undefined)
  static outerOf(ao){
    const g = ao.data && ao.data.groups
    return g && g.length ? g[g.length - 1] : undefined
  }

  /**
   * « Unités » de la sélection : groupes extérieurs (identifiant) et
   * marques non groupées (la marque), dans l'ordre de la sélection
   */
  static unitsOf(selection){
    const units = []
    selection.forEach(ao => {
      const unit = this.outerOf(ao) || ao
      units.includes(unit) || units.push(unit)
    })
    return units
  }

  // Grouper : plusieurs unités sélectionnées
  static canGroup(selection){
    return this.unitsOf(selection).length > 1
  }
  // Dégrouper : une marque groupée au moins
  static canUngroup(selection){
    return selection.some(ao => this.outerOf(ao))
  }
  // Ajouter au groupe : un groupe et au moins une autre unité
  static canAddToGroup(selection){
    const units = this.unitsOf(selection)
    return units.length > 1 && units.some(u => 'string' == typeof u)
  }

  /**
   * Grouper : nouveau groupe, extérieur à ceux des marques sélectionnées
   */
  static group(selection){
    if ( !this.canGroup(selection) ) return
    const id = this.newId()
    selection.forEach(ao => ao.data.groups = [...(ao.data.groups || []), id])
    setModified()
  }

  /**
   * Dégrouper : les groupes extérieurs des marques sélectionnées sont
   * défaits (les groupes qu'ils contenaient restent)
   */
  static ungroup(selection){
    const outers = new Set(selection.map(ao => this.outerOf(ao)).filter(Boolean))
    if ( outers.size == 0 ) return
    AObjet.each(ao => {
      const g = ao.data && ao.data.groups
      if ( !g || !outers.has(g[g.length - 1]) ) return
      g.pop()
      g.length || delete ao.data.groups
    })
    setModified()
  }

  /**
   * Ajouter au groupe : les autres marques (ou groupes) sélectionnées
   * entrent dans le premier groupe de la sélection
   */
  static addToGroup(selection){
    if ( !this.canAddToGroup(selection) ) return
    const units  = this.unitsOf(selection)
    const target = units.find(u => 'string' == typeof u)
    selection.forEach(ao => {
      if ( this.outerOf(ao) == target ) return
      ao.data.groups = [...(ao.data.groups || []), target]
    })
    setModified()
  }

  // +reserved+ : identifiants déjà pris, pas encore posés sur une marque
  static newId(reserved = []){
    const used = new Set(reserved)
    AObjet.each(ao => (ao.data && ao.data.groups || []).forEach(g => used.add(g)))
    let n = used.size + 1
    while ( used.has(`g${n}`) ) ++n
    return `g${n}`
  }

  /**
   * Anciennes analyses : groupes plats (`data.grp`, identifiants des
   * marques du groupe) convertis en `data.groups`
   */
  static migrate(){
    const done = {}
    AObjet.each(ao => {
      const grp = ao.data && ao.data.grp
      if ( !grp ) return
      delete ao.data.grp
      if ( !grp.length || ao.data.groups ) return
      const key = [...grp].sort().join(',')
      done[key] || (done[key] = this.newId())
      ao.data.groups = [done[key]]
    })
  }
}
