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
 * - menu « Outils › Partage › Inviter… » : panneau des invitations (nom
 *   de l'analyste, adresses à inviter, adresses déjà invitées, groupes
 *   nommés) ; « Inviter » démarre le partage, rien d'autre à faire ;
 * - « Outils › Partage › Rejoindre… » : partages proposés (demandés au
 *   serveur) ; la première fois, adresse et code reçu par email ;
 * - bandeau « En partage » (analyste), « Analyse suivie » (spectateur) ;
 * - notifications en haut à droite (demandes de la main, fin du
 *   partage) ;
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
    onMain('partage:update', this.onUpdate.bind(this))
    onMain('partage:view', this.onView.bind(this))
    onMain('partage:ended', this.onEnded.bind(this))
    onMain('partage:message', ({error, notice}) => error ? erreur(error) : (notice && message(notice)))
    onMain('partage:request', this.showRequest.bind(this))
    invoke('partage:state').then(s => {
      this.setState(s)
      ;(s.requests || []).forEach(req => this.showRequest(req))
    }).catch(err => console.error(err))
    invoke('partage:ended').then(raison => raison && this.onEnded({raison})).catch(err => console.error(err))
    // Analyste (ou spectateur qui a la main) : partie visible envoyée
    const sendView = () => {
      if ( !this.state.sender ) return
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
    const wasSender = !!(this.state && this.state.sender)
    this.state = s || {}
    this.updateBanner()
    this.state.sender && !wasSender && this.sendView && this.sendView()
    // Demandes de la main closes
    const emails = new Set((this.state.requests || []).map(r => r.email))
    document.querySelectorAll('div.partage-notif[data-request]').forEach(n => emails.has(n.dataset.request) || n.remove())
  }

  /* --- Bandeau --- */

  updateBanner(){
    const s = this.state
    let banner = DGet('#partage-bandeau')
    if ( !s.sharing && !s.following ) return banner && banner.remove()
    if ( !banner ) {
      banner = DCreate('DIV', {id: 'partage-bandeau', class: 'panneau-ui'})
      document.body.appendChild(banner)
    }
    banner.innerHTML = ''
    const button = (label, channel) => {
      const btn = DCreate('BUTTON', {text: label})
      listen(btn, 'click', () => invoke(channel).catch(err => erreur(err.message)))
      return btn
    }
    const sep = ' · '
    const off = s.online ? '' : sep + T('reconnecting')
    if ( s.sharing && s.sharing.given ) {
      // Analyste qui a donné la main : lecture seule
      banner.appendChild(DCreate('SPAN', {text: T('banner_given', {pseudo: esc(s.sharing.given)}) + off}))
      banner.appendChild(button(T('takeback'), 'partage:takeback'))
    } else if ( s.following ) {
      const f = s.following
      let text = f.control ? T('banner_control', {pseudo: esc(f.pseudo)}) : T('banner_following', {pseudo: esc(f.pseudo)})
      if ( !f.control && f.controller ) text += sep + T('controller', {pseudo: esc(f.controller)})
      if ( f.asked ) text += sep + T('asked')
      if ( off ) text += off
      else if ( f.ownerPresent === false ) text += sep + T('owner_absent', {pseudo: esc(f.pseudo)})
      banner.appendChild(DCreate('SPAN', {text}))
      f.control || f.asked || banner.appendChild(button(T('ask'), 'partage:ask'))
      banner.appendChild(button(T('quit'), 'partage:leave'))
    } else if ( s.sharing ) {
      const {connected, invited} = s.sharing
      banner.appendChild(DCreate('SPAN', {text: T('banner_sharing', {connected, invited}) + off}))
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

  // Analyste : un spectateur demande la main
  showRequest({email, pseudo}){
    if ( DGet(`div.partage-notif[data-request="${CSS.escape(email)}"]`) ) return
    const notif = this.notify({
        text: T('request', {pseudo: `<b>${esc(pseudo)}</b>`})
      , buttons: [
            {label: T('deny'),  action: () => invoke('partage:deny', {email}).catch(err => erreur(err.message))}
          , {label: T('grant'), default: true, action: () => invoke('partage:grant', {email}).catch(err => erreur(err.message))}
        ]
    })
    notif.dataset.request = email
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
      const [book, state] = await Promise.all([invoke('partage:book'), invoke('partage:state')])
      this.buildInvitePanel(book, state)
    } catch(err) { erreur(err.message) }
  }

  // Menu « Outils › Partage › Rejoindre… »
  async openJoin(){
    try {
      const s = await invoke('partage:state')
      if ( !s.identity || !s.identity.email ) return this.openCode()
      this.join()
    } catch(err) { erreur(err.message) }
  }

  // Partages proposés : choix de l'analyse, puis « Rejoindre »
  async join(){
    this.buildJoinPanel(await invoke('partage:list'))
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
   * Spectateur, la première fois : adresse et code reçu par email
   * (« Recevoir un nouveau code » si l'email est perdu)
   */
  openCode(){
    const email = DCreate('INPUT', {type: 'text', inputmode: 'email', class: 'partage-email', placeholder: T('email_ph')})
    const code  = DCreate('INPUT', {type: 'text', class: 'partage-code', maxlength: '6', inputmode: 'numeric', placeholder: '000000'})
    const btnNew  = DCreate('BUTTON', {text: T('new_code')})
    const btnJoin = DCreate('BUTTON', {class: 'btn-default', text: T('join')})
    this.makePanel('partage_code', T('join_title'), [
        DCreate('P', {class: 'partage-intro', text: T('code_intro')})
      , DCreate('LABEL', {text: T('email')}), email
      , DCreate('LABEL', {text: T('code')}), code
    ], [btnNew, btnJoin])
    email.focus()
    listen(btnNew, 'click', async () => {
      try {
        await invoke('partage:identify', {email: email.value.trim()})
        message(T('code_sent', {email: esc(email.value.trim())}))
        code.focus()
      } catch(err) { erreur(err.message) }
    })
    listen(btnJoin, 'click', async () => {
      try {
        await invoke('partage:validate', {email: email.value.trim(), code: code.value.trim()})
        this.closePanel()
        await this.join()
      } catch(err) { erreur(err.message) }
    })
  }

  /**
   * Invitations : nom vu des spectateurs, adresses à inviter (champ
   * multiligne), adresses déjà invitées (cases), groupes nommés (cocher
   * un groupe coche ses adresses). « Inviter » : c'est tout.
   */
  buildInvitePanel(book, state){
    let {contacts, groups} = book
    const checked = new Set()
    const name     = DCreate('INPUT', {type: 'text', class: 'partage-pseudo', maxlength: '40', placeholder: T('pseudo_ph')})
    name.value = state.pseudo || ''
    const area     = DCreate('TEXTAREA', {class: 'partage-addresses', rows: '5', placeholder: T('addresses_ph')})
    const listBox  = DCreate('DIV', {class: 'partage-list partage-contacts'})
    const groupBox = DCreate('DIV', {class: 'partage-list partage-groups'})
    const gname    = DCreate('INPUT', {type: 'text', class: 'partage-gname', placeholder: T('group_name_ph')})
    const btnGroup = DCreate('BUTTON', {text: T('group_create')})
    const count    = DCreate('DIV', {class: 'partage-count'})
    const btnInvite = DCreate('BUTTON', {class: 'btn-default', text: T('invite')})

    // Adresses du champ (une par ligne, ou séparées par virgules, espaces…)
    const typed = () => area.value.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean)
    const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    const chosen = () => [...new Set([...checked, ...typed()])]
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
    const updateCount = () => {
      const n = chosen().length
      count.textContent = T(n > 1 ? 'count_many' : 'count_one', {n})
      btnInvite.disabled = n == 0
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
      Object.entries(groups).forEach(([gn, list]) => {
        const full = list.length && list.every(e => checked.has(e))
        const update = DCreate('SPAN', {class: 'partage-update', title: T('group_update_title'), text: T('group_update')})
        listen(update, 'click', () => { groups[gn] = chosen() ; save().then(render) })
        groupBox.appendChild(row(`${esc(gn)} <span class="partage-n">(${list.length})</span>`, full
          , (on) => { list.forEach(e => on ? checked.add(e) : checked.delete(e)) ; render() }
          , () => { delete groups[gn] ; save().then(render) }
          , [update]
        ))
      })
      updateCount()
    }
    listen(area, 'input', updateCount)
    listen(btnGroup, 'click', () => {
      const gn = gname.value.trim()
      if ( !gn ) return erreur(T('group_name_required'))
      const list = chosen()
      if ( !list.length ) return erreur(T('group_empty'))
      if ( list.some(e => !isEmail(e)) ) return erreur(T('bad_email_list', {list: esc(list.filter(e => !isEmail(e)).join(', '))}))
      groups[gn] = list
      gname.value = ''
      save().then(render)
    })
    listen(btnInvite, 'click', async () => {
      if ( !name.value.trim() ) return erreur(T('pseudo_required'))
      const invites = chosen()
      const bad = invites.filter(e => !isEmail(e))
      if ( bad.length ) return erreur(T('bad_email_list', {list: esc(bad.join(', '))}))
      try {
        btnInvite.disabled = true
        await invoke('partage:start', {invites, pseudo: name.value.trim()})
        this.closePanel()
        message(T('invited_sent'))
      } catch(err) { btnInvite.disabled = false ; erreur(err.message) }
    })
    this.makePanel('partage_invite', T('invite_title'), [
        DCreate('LABEL', {text: T('invite_name')}), name
      , DCreate('LABEL', {text: T('addresses')}), area
      , DCreate('DIV', {class: 'partage-cols', inner: [
            DCreate('DIV', {inner: [DCreate('H4', {text: T('contacts')}), listBox]})
          , DCreate('DIV', {inner: [DCreate('H4', {text: T('groups')}), groupBox, DCreate('DIV', {class: 'partage-line', inner: [gname, btnGroup]})]})
        ]})
      , count
    ], [btnInvite])
    ;(name.value ? area : name).focus()
    render()
  }

  // Partages proposés : analyse choisie, bouton « Rejoindre »
  buildJoinPanel(shares){
    const list = DCreate('DIV', {class: 'partage-list'})
    shares.length || list.appendChild(DCreate('DIV', {class: 'partage-empty', text: T('no_share')}))
    shares.forEach((sh, i) => {
      const radio = DCreate('INPUT', {type: 'radio', name: 'partage-choix', value: sh.id})
      radio.checked = i == 0
      list.appendChild(DCreate('DIV', {class: 'partage-row', inner: [DCreate('LABEL', {inner: [
          radio, DCreate('SPAN', {text: `« ${esc(sh.titre)} » — <b>${esc(sh.pseudo)}</b>`})
      ]})]}))
    })
    const btn = DCreate('BUTTON', {class: 'btn-default', text: T('join')})
    btn.disabled = !shares.length
    listen(btn, 'click', () => {
      const chosen = list.querySelector('input[name="partage-choix"]:checked')
      if ( !chosen ) return
      this.closePanel()
      this.accept(chosen.value)
    })
    this.makePanel('partage_join', T('join_title'), [list], [btn])
  }
}

export const Partage = new PartageClass()
