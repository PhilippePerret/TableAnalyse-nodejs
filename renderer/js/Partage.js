import { DCreate, DGet, listen } from './dom.js'
import { invoke, onMain, IS_MIRROR, setSpectator } from './api.js'
import { message, erreur } from './lib/Message.js'
import { addPanelHead } from './Panneau.js'
import { AObjet } from './AObjet.js'
import { AMark } from './AMark.js'
import { Systeme } from './Systeme.js'
import { Variables } from './Variables.js'
import { Current } from './Current.js'
import { t } from './i18n.js'
/**
 * Partage
 * -------
 * Partage à distance de l'analyse (issue #220), côté interface (cf.
 * main/Partage.js) :
 *
 * - menu « Outils › Partage › Inviter… » : panneau des invitations
 *   (adresses déjà invitées, groupes nommés), qui démarre le partage ;
 * - « Outils › Partage › Rejoindre… » : partages où l'on est invité ;
 * - identification (une seule fois) : adresse, puis code de la page du
 *   lien reçu par email ;
 * - bandeau « En partage » (analyste), « Analyse suivie » (spectateur) ;
 * - notifications en haut à droite (invitations, fin du partage) ;
 * - spectateur : lecture seule (voile), même partie de l'analyse que
 *   l'analyste (cf. onView), marques actualisées à chaque
 *   enregistrement de l'analyste (cf. onUpdate).
 */
const T = (key, params) => t(`ui.partage.${key}`, params)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]))
const VIEW_DELAY = 80 // ms entre deux envois de la partie visible

class PartageClass {

  init(){
    if ( IS_MIRROR ) return
    this.state = {}
    onMain('partage:state', this.setState.bind(this))
    onMain('partage:invitation', this.showInvitation.bind(this))
    onMain('partage:update', this.onUpdate.bind(this))
    onMain('partage:view', this.onView.bind(this))
    onMain('partage:ended', this.onEnded.bind(this))
    onMain('partage:message', ({error}) => error && erreur(error))
    invoke('partage:state').then(s => {
      this.setState(s)
      ;(s.invitations || []).forEach(inv => this.showInvitation(inv))
    }).catch(err => console.error(err))
    invoke('partage:ended').then(raison => raison && this.onEnded({raison})).catch(err => console.error(err))
    // Analyste : partie visible envoyée aux spectateurs
    const sendView = () => {
      if ( !this.state.sharing ) return
      clearTimeout(this.viewTimer)
      this.viewTimer = setTimeout(() => {
        invoke('partage:view', {x: window.scrollX, y: window.scrollY, w: window.innerWidth, h: window.innerHeight}).catch(() => {})
      }, VIEW_DELAY)
    }
    this.sendView = sendView
    window.addEventListener('scroll', sendView, {passive: true})
    window.addEventListener('resize', sendView)
  }

  setState(s){
    const wasSharing = !!(this.state && this.state.sharing)
    this.state = s || {}
    this.updateBanner()
    this.state.sharing && !wasSharing && this.sendView && this.sendView()
    // Invitations retirées (partage arrêté)
    const ids = new Set((this.state.invitations || []).map(i => i.id))
    document.querySelectorAll('div.partage-notif[data-invitation]').forEach(n => ids.has(n.dataset.invitation) || n.remove())
  }

  /* --- Bandeau --- */

  updateBanner(){
    const s = this.state
    let banner = DGet('#partage-bandeau')
    if ( !s.sharing && !this.spectator ) return banner && banner.remove()
    if ( !banner ) {
      banner = DCreate('DIV', {id: 'partage-bandeau', class: 'panneau-ui'})
      document.body.appendChild(banner)
    }
    banner.innerHTML = ''
    if ( this.spectator ) {
      const f = s.following || this.spectator
      let text = T('banner_following', {pseudo: esc(f.pseudo)})
      if ( !s.online ) text += ' · ' + T('reconnecting')
      else if ( f.ownerPresent === false ) text += ' · ' + T('owner_absent', {pseudo: esc(f.pseudo)})
      const quit = DCreate('BUTTON', {text: T('quit')})
      listen(quit, 'click', () => invoke('partage:leave').catch(err => erreur(err.message)))
      banner.appendChild(DCreate('SPAN', {text}))
      banner.appendChild(quit)
    } else {
      const {connected, invited} = s.sharing
      let text = T('banner_sharing', {connected, invited})
      if ( !s.online ) text += ' · ' + T('reconnecting')
      banner.appendChild(DCreate('SPAN', {text}))
    }
  }

  /* --- Notifications (en haut à droite) --- */

  notifBox(){
    let box = DGet('#partage-notifs')
    box || document.body.appendChild(box = DCreate('DIV', {id: 'partage-notifs'}))
    return box
  }

  notify({text, detail, buttons, invitation}){
    const btns = buttons.map(b => {
      const btn = DCreate('BUTTON', {class: b.default ? 'btn-default' : '', text: b.label})
      listen(btn, 'click', (e) => { e.stopPropagation() ; notif.remove() ; b.action && b.action() })
      return btn
    })
    const notif = DCreate('DIV', {class: 'partage-notif panneau-ui', inner: [
        DCreate('DIV', {class: 'partage-notif-text', text})
      , ...(detail ? [DCreate('DIV', {class: 'partage-notif-detail', text: detail})] : [])
      , DCreate('DIV', {class: 'partage-notif-buttons', inner: btns})
    ]})
    invitation && (notif.dataset.invitation = invitation)
    listen(notif, 'click', (e) => e.stopPropagation())
    this.notifBox().appendChild(notif)
    return notif
  }

  showInvitation({id, pseudo, titre}){
    if ( DGet(`div.partage-notif[data-invitation="${CSS.escape(id)}"]`) ) return
    this.notify({
        invitation: id
      , text:   T('invitation', {pseudo: `<b>${esc(pseudo)}</b>`})
      , detail: titre ? `« ${esc(titre)} »` : ''
      , buttons: [
            {label: T('refuse'), action: () => invoke('partage:refuse', {id}).catch(err => erreur(err.message))}
          , {label: T('accept'), default: true, action: () => this.accept(id)}
        ]
    })
  }

  async accept(id){
    try {
      // Analyse courante modifiée : enregistrée avant de la quitter
      const { Analyse } = await import('./Analyse.js')
      if ( Analyse.current && Analyse.current.modified && !this.spectator ) await Analyse.saveIfModified()
      await invoke('partage:accept', {id})
      message(T('loading'))
    } catch(err) { erreur(err.message) }
  }

  // Fin du partage (analyste) ou partage disparu : l'analyse est au spectateur
  onEnded({raison}){
    if ( raison == 'gone' ) return message(T('gone'))
    this.notify({
        text:   T(raison == 'absent' ? 'ended_absent' : 'ended')
      , detail: T('ended_detail')
      , buttons: [
            {label: t('ui.buttons.ok')}
          , {label: T('save_as'), default: true, action: () => invoke('partage:saveAs').catch(err => erreur(err.message))}
        ]
    })
  }

  /* --- Spectateur --- */

  /**
   * Analyse suivie (données de l'ouverture, cf. main analyse:getCurrent) :
   * lecture seule ; aucune action, aucun défilement propre.
   */
  enterSpectator(info){
    this.spectator = info
    setSpectator(true)
    document.documentElement.classList.add('partage-spectateur')
    document.body.appendChild(DCreate('DIV', {id: 'partage-voile'}))
    const allowed = (e) => e.target instanceof Element && e.target.closest('#partage-bandeau, #partage-notifs, .panneau-ui')
    ;['mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel'].forEach(type => {
      window.addEventListener(type, (e) => {
        if ( allowed(e) ) return
        e.stopImmediatePropagation()
        ;(type == 'contextmenu' || type == 'wheel') && e.preventDefault()
      }, {capture: true, passive: false})
    })
    ;['keydown', 'keypress', 'keyup'].forEach(type => {
      window.addEventListener(type, (e) => {
        if ( allowed(e) ) return
        e.stopImmediatePropagation()
        e.metaKey || e.ctrlKey || e.preventDefault()
      }, true)
    })
    this.updateBanner()
    invoke('partage:ready').catch(() => {})
  }

  // Même partie de l'analyse que l'analyste (zoom réglé par main)
  onView({x, y, zoom}){
    if ( !this.spectator ) return
    document.documentElement.style.setProperty('--ui-zoom', String(1 / zoom))
    window.scrollTo(x, y)
  }

  /**
   * Enregistrement de l'analyste : marques refaites (les systèmes et
   * leurs images restent en place) ; systèmes déplacés ou préférences
   * changées : page rechargée.
   */
  async onUpdate(){
    if ( !this.spectator ) return
    const analyse = Current.analyse
    try {
      const data = await invoke('analyse:getCurrent')
      if ( !analyse || !data ) return location.reload()
      // Préférences changées (hors défilement, fenêtre, zoom ; une
      // préférence ajoutée avec sa valeur par défaut ne compte pas)
      const IGNORED = ['last_scroll', 'window_width', 'window_height', 'zoom']
      const oldPrefs = analyse.data.preferences || {}
      const prefsChanged = Object.entries(data.preferences || {}).some(([k, v]) => !IGNORED.includes(k) && k in oldPrefs && JSON.stringify(v) !== JSON.stringify(oldPrefs[k]))
      const sysKey = (list) => JSON.stringify((list || []).map(s => [s.image_name, s.top, s.left, s.height, s.locked]))
      if ( prefsChanged || sysKey(data.systems) != sysKey(analyse.data.systems) ) return location.reload()
      analyse.data.preferences = data.preferences
      analyse.loading = true
      AObjet.items.filter(o => !o.isSystem).forEach(o => { try { o.destroy() } catch(err) {} })
      const systems = AObjet.items.filter(o => o.isSystem)
      AObjet.init()
      systems.forEach(s => AObjet.add(s))
      analyse.data.analyse_tags = data.analyse_tags
      analyse.data.infos = data.infos
      analyse._tags = undefined
      analyse.tags.forEach(tag => tag.build_and_observe())
      Variables.refresh()
      Systeme.placeMeasureNumbers()
      analyse.loading = false
    } catch(err) {
      console.error(err)
      location.reload()
    }
  }

  /* --- Panneaux --- */

  // Menu « Outils › Partage › Inviter… »
  async openInvite(){
    try {
      const s = await invoke('partage:state')
      if ( !s.identity || !s.identity.pseudo ) return this.openIdentify({asOwner: true, then: () => this.openInvite()})
      this.buildInvitePanel(await invoke('partage:book'), s)
    } catch(err) { erreur(err.message) }
  }

  // Menu « Outils › Partage › Rejoindre… »
  async openJoin(){
    try {
      const s = await invoke('partage:state')
      if ( !s.identity ) return this.openIdentify({asOwner: false, then: () => this.openJoin()})
      this.buildJoinPanel(await invoke('partage:list'))
    } catch(err) { erreur(err.message) }
  }

  closePanel(){
    this.panel && this.panel.remove()
    this.panel = null
  }

  makePanel(id, title, inner, buttons){
    this.closePanel()
    const panel = DCreate('DIV', {id, class: 'partage-panneau', inner: [
        ...inner
      , DCreate('DIV', {class: 'buttons', inner: buttons})
    ]})
    document.body.appendChild(panel)
    this.panel = panel
    addPanelHead(panel, {title, onClose: this.closePanel.bind(this)})
    return panel
  }

  /**
   * Identification : adresse (et pseudo pour l'analyste) → email avec
   * lien ; la page du lien donne le code, saisi ici.
   */
  async openIdentify({asOwner, then}){
    const s = await invoke('partage:state')
    // Déjà identifié : pseudo seul (analyste)
    if ( s.identity && asOwner ) return this.openPseudo(s.identity, then)
    const pseudo = DCreate('INPUT', {type: 'text', class: 'partage-pseudo', maxlength: '40', placeholder: T('pseudo_ph')})
    const email  = DCreate('INPUT', {type: 'text', inputmode: 'email', class: 'partage-email', placeholder: T('email_ph')})
    const code   = DCreate('INPUT', {type: 'text', class: 'partage-code', maxlength: '6', inputmode: 'numeric', placeholder: '000000'})
    const step2  = DCreate('DIV', {class: 'partage-step2 hidden', inner: [
        DCreate('P', {text: T('identify_code')})
      , code
    ]})
    const btnSend = DCreate('BUTTON', {class: 'btn-default', text: T('send_link')})
    const btnOk   = DCreate('BUTTON', {class: 'hidden', text: T('validate')})
    const inner = [DCreate('P', {class: 'partage-intro', text: T(asOwner ? 'identify_owner' : 'identify_spectator')})]
    asOwner && inner.push(DCreate('LABEL', {text: T('pseudo')}), pseudo)
    inner.push(DCreate('LABEL', {text: T('email')}), email, step2)
    this.makePanel('partage_identify', T('identify_title'), inner, [btnSend, btnOk])
    ;(asOwner ? pseudo : email).focus()
    listen(btnSend, 'click', async () => {
      if ( asOwner && !pseudo.value.trim() ) return erreur(T('pseudo_required'))
      try {
        await invoke('partage:identify', {email: email.value.trim(), pseudo: pseudo.value.trim()})
        step2.classList.remove('hidden')
        btnSend.classList.remove('btn-default')
        btnSend.textContent = T('send_again')
        btnOk.classList.remove('hidden')
        btnOk.classList.add('btn-default')
        message(T('link_sent', {email: esc(email.value.trim())}))
        code.focus()
      } catch(err) { erreur(err.message) }
    })
    listen(btnOk, 'click', async () => {
      try {
        await invoke('partage:validate', {email: email.value.trim(), code: code.value.trim(), pseudo: pseudo.value.trim()})
        this.closePanel()
        then && then()
      } catch(err) { erreur(err.message) }
    })
  }

  // Analyste identifié comme spectateur : pseudo à donner
  openPseudo(identity, then){
    const pseudo = DCreate('INPUT', {type: 'text', class: 'partage-pseudo', maxlength: '40', placeholder: T('pseudo_ph')})
    const btn = DCreate('BUTTON', {class: 'btn-default', text: t('ui.buttons.ok')})
    this.makePanel('partage_identify', T('identify_title'), [
        DCreate('P', {class: 'partage-intro', text: T('pseudo_intro')})
      , DCreate('LABEL', {text: T('pseudo')}), pseudo
    ], [btn])
    pseudo.focus()
    listen(btn, 'click', async () => {
      if ( !pseudo.value.trim() ) return erreur(T('pseudo_required'))
      await invoke('partage:setPseudo', {pseudo: pseudo.value.trim()})
      this.closePanel()
      then && then()
    })
  }

  /**
   * Invitations : adresses déjà invitées (cases), groupes nommés (cocher
   * un groupe coche ses adresses), ajout d'une adresse ; « Inviter et
   * démarrer le partage ».
   */
  buildInvitePanel(book, state){
    let {contacts, groups} = book
    const checked = new Set()
    const listBox  = DCreate('DIV', {class: 'partage-list partage-contacts'})
    const groupBox = DCreate('DIV', {class: 'partage-list partage-groups'})
    const add      = DCreate('INPUT', {type: 'text', inputmode: 'email', class: 'partage-email', placeholder: T('add_ph')})
    const btnAdd   = DCreate('BUTTON', {text: T('add')})
    const gname    = DCreate('INPUT', {type: 'text', class: 'partage-gname', placeholder: T('group_name_ph')})
    const btnGroup = DCreate('BUTTON', {text: T('group_create')})
    const count    = DCreate('DIV', {class: 'partage-count'})
    const btnStart = DCreate('BUTTON', {class: 'btn-default', text: T(state.sharing ? 'invite_more' : 'invite_start')})

    const save = async () => {
      try { ({contacts, groups} = await invoke('partage:saveBook', {contacts, groups})) } catch(err) { erreur(err.message) }
    }
    const row = (label, isOn, onToggle, onDelete, extra) => {
      const cb = DCreate('INPUT', {type: 'checkbox'})
      cb.checked = isOn
      listen(cb, 'change', () => onToggle(cb.checked))
      const del = DCreate('SPAN', {class: 'partage-del', title: T('remove'), text: '×'})
      listen(del, 'click', onDelete)
      return DCreate('DIV', {class: 'partage-row', inner: [DCreate('LABEL', {inner: [cb, DCreate('SPAN', {text: label})]}), ...(extra || []), del]})
    }
    const render = () => {
      listBox.innerHTML = ''
      contacts.length || listBox.appendChild(DCreate('DIV', {class: 'partage-empty', text: T('no_contacts')}))
      contacts.forEach(email => listBox.appendChild(row(esc(email), checked.has(email)
        , (on) => { on ? checked.add(email) : checked.delete(email) ; render() }
        , () => { checked.delete(email) ; contacts = contacts.filter(e => e != email) ; save().then(render) }
      )))
      groupBox.innerHTML = ''
      Object.keys(groups).length || groupBox.appendChild(DCreate('DIV', {class: 'partage-empty', text: T('no_groups')}))
      Object.entries(groups).forEach(([name, list]) => {
        const full = list.length && list.every(e => checked.has(e))
        const update = DCreate('SPAN', {class: 'partage-update', title: T('group_update_title'), text: T('group_update')})
        listen(update, 'click', () => { groups[name] = [...checked] ; save().then(render) })
        groupBox.appendChild(row(`${esc(name)} <span class="partage-n">(${list.length})</span>`, full
          , (on) => { list.forEach(e => on ? checked.add(e) : checked.delete(e)) ; render() }
          , () => { delete groups[name] ; save().then(render) }
          , [update]
        ))
      })
      count.textContent = T(checked.size > 1 ? 'count_many' : 'count_one', {n: checked.size})
      btnStart.disabled = checked.size == 0
    }
    const addEmail = () => {
      const email = add.value.trim().toLowerCase()
      if ( !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ) return erreur(T('bad_email'))
      contacts.includes(email) || (contacts = [...contacts, email].sort())
      checked.add(email)
      add.value = ''
      save().then(render)
    }
    listen(btnAdd, 'click', addEmail)
    listen(add, 'keydown', (e) => { if ( e.key == 'Enter' ) { e.preventDefault() ; e.stopPropagation() ; addEmail() } })
    listen(btnGroup, 'click', () => {
      const name = gname.value.trim()
      if ( !name ) return erreur(T('group_name_required'))
      if ( !checked.size ) return erreur(T('group_empty'))
      groups[name] = [...checked]
      gname.value = ''
      save().then(render)
    })
    listen(btnStart, 'click', async () => {
      try {
        await invoke('partage:start', {invites: [...checked]})
        this.closePanel()
        message(T(state.sharing ? 'invited' : 'started', {n: checked.size}))
      } catch(err) { erreur(err.message) }
    })
    this.makePanel('partage_invite', T('invite_title'), [
        DCreate('DIV', {class: 'partage-cols', inner: [
            DCreate('DIV', {inner: [DCreate('H4', {text: T('contacts')}), listBox, DCreate('DIV', {class: 'partage-line', inner: [add, btnAdd]})]})
          , DCreate('DIV', {inner: [DCreate('H4', {text: T('groups')}), groupBox, DCreate('DIV', {class: 'partage-line', inner: [gname, btnGroup]})]})
        ]})
      , count
    ], [btnStart])
    render()
  }

  // Partages en cours où l'on est invité
  buildJoinPanel(shares){
    const list = DCreate('DIV', {class: 'partage-list'})
    shares.length || list.appendChild(DCreate('DIV', {class: 'partage-empty', text: T('no_share')}))
    shares.forEach(s => {
      const btn = DCreate('BUTTON', {class: 'btn-default', text: T('follow')})
      listen(btn, 'click', () => { this.closePanel() ; this.accept(s.id) })
      list.appendChild(DCreate('DIV', {class: 'partage-row', inner: [
          DCreate('SPAN', {text: `<b>${esc(s.pseudo)}</b> — « ${esc(s.titre)} »`}), btn
      ]}))
    })
    this.makePanel('partage_join', T('join_title'), [list], [])
  }
}

export const Partage = new PartageClass()
