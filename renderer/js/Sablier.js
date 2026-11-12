import { DCreate, DGet } from './dom.js'
/**
 * Sablier affiché pendant une opération longue (découpe de la
 * partition, numérotation…).
 *
 *    Sablier.show("Découpe en cours…")
 *    Sablier.hide()
 */
class SablierClass {

  show(msg){
    this.obj || this.build()
    DGet('.sablier-message', this.obj).innerHTML = msg || ''
    this.obj.classList.remove('hidden')
  }

  hide(){
    this.obj && this.obj.classList.add('hidden')
  }

  build(){
    this.obj = DCreate('DIV', {
        id:     'sablier'
      , class:  'hidden'
      , inner:  [
            DCreate('DIV', {class: 'sablier-icon', text: '⏳'})
          , DCreate('DIV', {class: 'sablier-message'})
        ]
    })
    document.body.appendChild(this.obj)
  }
}

export const Sablier = new SablierClass()
