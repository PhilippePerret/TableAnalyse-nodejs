import { DCreate, listen } from '../dom.js'
import { t } from '../i18n.js'
/**
 * Class Message
 * --------------
 * Pour l'affichage des messages à l'écran
 * 
 * 
 *    message(str)      Une simple note
 *    erreur(str)       Un message d'erreur
 *    action(str)       Une action en cours
 * 
 * 
 * Pour afficher les messages à un endroit particulier, utiliser, par
 * exemple dans la préparation de l'UI :
 * 
 *  Message.position = center|bottom-left|bottom-right|top-left|top-right
 * 
 *  Par défaut, le message est centré (Message.position = center)
 * 
 */


export function message(str, options){
  Message.showMessage.call(Message, str, options || {})
  return true
}
export function error(err){
  Message.showError.call(Message, err)
  return false
}
export function erreur(err){return error(err)}

export function action(str){
  Message.showAction.call(Message, str)
}

class MessageClass {

  init(){
    this.build()
    listen(this.panneauMessage, 'click', this.hideMessage.bind(this))
  }

  showMessage(msg, options){ 
    this.panneauMessage || this.build()
    this.showText(msg, 'notice', options) 
  }
  showError(err, options){   
    this.panneauMessage || this.build()
    this.showText(err, 'error', options) 
  }
  showAction(msg, options){
    this.panneauMessage || this.build()
    this.showText(msg, 'doaction', options)
  }

  showText(str,type, options){
    options = options || {}
    str = String(str).replace(/\n/g,'<br>')
    this.clearTimerMessage()
    this.divContent.innerHTML = str
    this.divTitle.innerHTML = t(`ui.message_titles.${type}`)
    this.panneauMessage.className = `panneau-ui ${type} ${this.position}`
    if ( type !== 'error' && !options.keep ) this.msgTimer = setTimeout(this.hideMessage.bind(this), options.duration || 20*1000)
  }

  hideMessage(){
    this.divContent.innerHTML = ""
    this.panneauMessage.className = 'panneau-ui hidden'
    this.clearTimerMessage()
  }
  clearTimerMessage(){
    if ( this.msgTimer ){
      clearTimeout(this.msgTimer)
      this.msgTimer = null
    }
  }

  /**
   * Construction de la boite qui contiendra tous les messages (aspect
   * défini par le thème de l'interface, cf. css/themes.css)
   */
  build(){
    this.closeBox   = DCreate('SPAN', {class: 'panneau-close', title: t('ui.buttons.close'), text: '×'})
    this.divTitle   = DCreate('SPAN', {class: 'panneau-title'})
    this.divContent = DCreate('DIV',  {class: 'msg-content'})
    const o = DCreate('DIV', {
        id:     'message'
      , class:  `panneau-ui hidden ${this.position}`
      , inner:  [DCreate('DIV', {class: 'panneau-head', inner: [this.closeBox, this.divTitle]}), this.divContent]
    })
    document.body.appendChild(o)
    this._msgpanel = o

    this.observe()
  }

  observe(){
    this.closeBox.addEventListener('click', this.hideMessage.bind(this))
  }

  setPosition(v){ 
    v = v || this.position 
    this.panneauMessage.className = `panneau-ui ${v}`
  }
  get position(){return this._position || 'center'}
  set position(v){
    this._position = v
    if (this.panneauMessage) this.setPosition(v)
  }

  get panneauMessage(){ return this._msgpanel }
}

export const Message = new MessageClass()
