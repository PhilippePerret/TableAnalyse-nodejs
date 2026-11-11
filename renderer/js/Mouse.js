import { DGet } from './dom.js'
import { coordonnate } from './handies.js'
/**
 * Ce module doit permet de gérer les déplacements autrement :
 * en fait, c'est la fenêtre elle-même qui réceptionne tous les
 * mouvement de souris, tout le temps.
 * Lorsqu'un élément est cliqué (comme un système), il est mis en
 * relation avec ce module, pour savoir d'où on part, ce qu'on bouge,
 * etc. jusqu'à ce qu'un clique vienne mettre fin au déplacement.
 * 
 * OBSOLÈTE 
 * Ça ne fonctionne pas car tout reposait sur le fait que l'élément
 * en dessous captait le onMove. Mais il suffit qu'il y ait un élément
 * devant pour que ça ne soit pas le cas.
 * 
 */

class MouseClass {

  onMove(e){
    // console.log(e.clientY, e.clientX)
    // console.log("e = ", e)
    this.x = e.layerX
    this.y = e.layerY
    coordonnate(e.layerX, e.layerY)
  }

  observe(){
    // Pour observer tous les déplacements
    DGet('body').addEventListener('mousemove', this.onMove.bind(this))
  }

}
export const Mouse = new MouseClass()
