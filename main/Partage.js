/**
 * Partage à distance de l'analyse (issue #220), côté processus
 * principal : connexion au serveur ta-partage (serveur/ta-partage/),
 * identification, envoi de l'analyse (analyste), réception (spectateur).
 *
 * Analyste : « Outils › Partage › Inviter… » démarre le partage de
 * l'analyse courante ; ses fichiers sont envoyés, puis chaque
 * enregistrement (différences du dossier, cf. sync) et la partie
 * visible de la fenêtre (cf. view).
 *
 * Spectateur : l'analyse suivie est écrite dans un dossier des données
 * de l'application (partages/<id>/), ouvert en lecture seule. À la fin
 * du partage (ou « Quitter »), elle devient une analyse ordinaire.
 *
 * Préférences de l'application : partage_jeton, partage_email,
 * partage_pseudo, partage_contacts (adresses invitées), partage_groupes
 * ({nom: [adresses]}). Serveur : SA_PARTAGE_URL (essais) ou
 * partage_server.
 */
import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { AppPrefs } from './AppPrefs.js'
import { t } from './i18n.js'

const DEFAULT_SERVER = 'https://partage.analyse-musicale.fr'
// Fichiers de l'analyse envoyés (le reste : sauvegardes, exports,
// historique… reste chez l'analyste)
const SHARED_FILES   = ['infos.yaml', 'preferences.yaml', 'analyse_tags.yaml']
const SHARED_FOLDERS = ['systems', 'images']
// Fichiers dont le changement se suit sans recharger la page
const LIGHT_FILES    = ['analyse_tags.yaml', 'infos.yaml', 'preferences.yaml']
const SYNC_DELAY     = 400
const RECONNECT_MIN  = 2000
const RECONNECT_MAX  = 30000

class PartageClass {

  /**
   * +hooks+ : {window(), current(), openFolder(folder), reload(), menu()}
   */
  init(hooks){
    this.hooks = hooks
    this.ws = null
    this.online = false
    this.sharing = null     // analyste : {id, folder, titre, sent: Map rel → signature, connected, invited}
    this.following = null   // spectateur : {id, pseudo, titre, folder, ready, changed: Set, ownerPresent}
    this.invitations = new Map()
    this.lastView = null
    this.retry = RECONNECT_MIN
    // Lancement de contrôle : identité d'essai (cf. Manuel_dev.md)
    if ( process.env.SA_SMOKE && process.env.SA_PARTAGE_JETON ) {
      AppPrefs.set({partage_jeton: process.env.SA_PARTAGE_JETON, partage_email: process.env.SA_PARTAGE_EMAIL || '', partage_pseudo: process.env.SA_PARTAGE_PSEUDO || ''})
    }
    this.connect()
  }

  get server(){ return (process.env.SA_PARTAGE_URL || AppPrefs.get('partage_server') || DEFAULT_SERVER).replace(/\/$/, '') }
  get identity(){
    const jeton = AppPrefs.get('partage_jeton')
    return jeton ? {email: AppPrefs.get('partage_email'), pseudo: AppPrefs.get('partage_pseudo') || ''} : null
  }
  /**
   * Page en lecture seule, qui suit la fenêtre de celui qui a la main :
   * spectateur (sans la main), ou analyste qui a donné la main (#221)
   */
  get spectator(){
    return !!((this.following && this.following.ready && !this.following.control) || (this.sharing && this.sharing.given))
  }
  // Celui qui envoie l'analyse : analyste (sauf main donnée) ou
  // spectateur qui a la main
  get sender(){
    if ( this.sharing && !this.sharing.given ) return this.sharing
    if ( this.following && this.following.ready && this.following.control ) return this.following
    return null
  }
  // Celui qui reçoit : spectateur sans la main, analyste qui l'a donnée
  receiverFor(id){
    const f = this.following
    if ( f && f.id == id && f.folder && !f.control ) return f
    const s = this.sharing
    if ( s && s.id == id && s.given ) return s
    return null
  }
  // Infos de la page en lecture seule (cf. main analyse:getCurrent)
  get readOnlyInfo(){
    if ( !this.spectator ) return null
    if ( this.sharing ) return {owner: true, pseudo: this.sharing.given, titre: this.sharing.titre}
    return {pseudo: this.following.pseudo, titre: this.following.titre}
  }

  send(channel, data){
    const win = this.hooks.window()
    win && win.webContents.send(channel, data)
  }

  // État envoyé au renderer (bandeaux) et menus actualisés
  sendState(){
    this.send('partage:state', this.state())
    this.hooks.menu()
  }
  state(){
    return {
        identity:  this.identity
      , online:    this.online
      , sharing:   this.sharing && {connected: this.sharing.connected || 0, invited: this.sharing.invited || 0, given: this.sharing.given || null}
      , following: this.following && this.following.ready && {pseudo: this.following.pseudo, titre: this.following.titre, ownerPresent: this.following.ownerPresent !== false, control: !!this.following.control, controller: this.following.controller || null, asked: !!this.following.asked}
      , sender:    !!this.sender
      , requests:  this.sharing ? [...(this.sharing.requests || new Map()).values()] : []
      , invitations: [...this.invitations.values()]
    }
  }

  /* --- Connexion --- */

  connect(){
    if ( this.ws || !AppPrefs.get('partage_jeton') ) return
    let ws
    try {
      ws = new WebSocket(this.server.replace(/^http/, 'ws') + '/ws')
    } catch(err) { return this.scheduleReconnect() }
    this.ws = ws
    ws.addEventListener('open', () => {
      this.retry = RECONNECT_MIN
      ws.send(JSON.stringify({type: 'hello', jeton: AppPrefs.get('partage_jeton')}))
    })
    ws.addEventListener('message', (e) => {
      let msg
      try { msg = JSON.parse(e.data) } catch(err) { return }
      process.env.SA_PARTAGE_TRACE && console.log('[partage] ←', msg.type, msg.path || '')
      const fn = this['on_' + msg.type]
      try { fn && fn.call(this, msg) } catch(err) { console.error('[partage]', msg.type, err) }
    })
    ws.addEventListener('close', () => {
      this.ws = null
      const was = this.online
      this.online = false
      was && this.sendState()
      this.scheduleReconnect()
    })
    ws.addEventListener('error', () => {})
  }
  scheduleReconnect(){
    clearTimeout(this.reconnectTimer)
    if ( !AppPrefs.get('partage_jeton') ) return
    this.reconnectTimer = setTimeout(() => this.connect(), this.retry)
    this.retry = Math.min(RECONNECT_MAX, this.retry * 2)
  }
  emit(msg){
    if ( !this.ws || this.ws.readyState !== 1 ) return false
    this.ws.send(JSON.stringify(msg))
    return true
  }

  /* --- Identification --- */

  async post(route, data){
    let res
    try {
      res = await fetch(this.server + route, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(data)})
    } catch(err) {
      throw new Error(t('errors.partage.offline'))
    }
    const body = await res.json().catch(() => ({}))
    if ( !body.ok ) throw new Error(t(`errors.partage.${body.error || 'server'}`))
    return body
  }

  // Email de confirmation demandé
  async identify({email, pseudo}){
    const res = await this.post('/identifier', {email, pseudo})
    return {sent: res.sent}
  }

  // Code de la page du lien : l'application est identifiée
  async validate({email, code, pseudo}){
    const res = await this.post('/valider', {email, code, pseudo})
    AppPrefs.set({partage_jeton: res.jeton, partage_email: res.email, partage_pseudo: res.pseudo || pseudo || ''})
    this.ws && this.ws.close()
    this.retry = RECONNECT_MIN
    this.connect()
    this.sendState()
    return this.identity
  }

  setPseudo(pseudo){
    AppPrefs.set({partage_pseudo: pseudo})
    this.emit({type: 'pseudo', pseudo})
  }

  on_welcome({email, pseudo}){
    this.online = true
    if ( pseudo ) AppPrefs.set({partage_pseudo: pseudo})
    else if ( AppPrefs.get('partage_pseudo') ) this.emit({type: 'pseudo', pseudo: AppPrefs.get('partage_pseudo')})
    // Reprise après une coupure
    this.sharing && this.emit({type: 'resume', id: this.sharing.id})
    this.following && this.emit({type: 'accept', id: this.following.id})
    this.sendState()
  }

  on_error({code}){
    if ( code == 'jeton' ) {
      // Jeton refusé : nouvelle identification nécessaire
      AppPrefs.set({partage_jeton: null})
      this.sendState()
    } else if ( code == 'taille' ) {
      this.send('partage:message', {error: t('errors.partage.too_big')})
    }
  }

  /* --- Carnet d'adresses (analyste) --- */

  get book(){
    return {contacts: AppPrefs.get('partage_contacts') || [], groups: AppPrefs.get('partage_groupes') || {}}
  }
  saveBook({contacts, groups}){
    const clean = (list) => [...new Set((list || []).map(e => String(e).trim().toLowerCase()).filter(Boolean))].sort()
    const g = {}
    Object.entries(groups || {}).forEach(([name, list]) => { name.trim() && (g[name.trim()] = clean(list)) })
    AppPrefs.set({partage_contacts: clean(contacts), partage_groupes: g})
    return this.book
  }

  /* --- Analyste --- */

  start({invites}){
    const current = this.hooks.current()
    if ( !current ) throw new Error(t('errors.no_analyse_open'))
    if ( !this.online ) throw new Error(t('errors.partage.offline'))
    const contacts = new Set([...(AppPrefs.get('partage_contacts') || []), ...invites])
    AppPrefs.set({partage_contacts: [...contacts].sort()})
    if ( this.sharing && this.sharing.folder == current.path ) {
      // Partage en cours : nouvelles invitations seules
      this.emit({type: 'invite', id: this.sharing.id, invites})
      return
    }
    const titre = (current.infos && (current.infos.title || current.infos.titre)) || current.name
    this.pendingStart = {folder: current.path, titre}
    this.emit({type: 'start', titre, invites})
  }

  on_started({id}){
    if ( !this.pendingStart ) return
    this.sharing = Object.assign({id, sent: new Map(), connected: 0, invited: 0, given: null, requests: new Map(), changed: new Set()}, this.pendingStart)
    this.pendingStart = null
    this.sync()
    this.sendState()
  }

  on_resumed(){ this.sync() }

  on_count({connected, invited}){
    if ( !this.sharing ) return
    Object.assign(this.sharing, {connected, invited})
    this.sendState()
  }

  stop(){
    if ( !this.sharing ) return
    this.emit({type: 'stop', id: this.sharing.id})
    this.sharing = null
    this.sendState()
  }

  // Analyse courante changée : son partage s'arrête
  onCurrentChanged(folder){
    if ( this.sharing && this.sharing.folder != folder ) this.stop()
  }

  // Un fichier de l'analyse a été écrit
  changed(folder){
    const s = this.sender
    if ( !s || s.folder != folder ) return
    clearTimeout(this.syncTimer)
    this.syncTimer = setTimeout(() => this.sync(), SYNC_DELAY)
  }

  // Fichiers partagés : {rel: chemin complet}
  sharedFiles(folder){
    const files = {}
    SHARED_FILES.forEach(name => {
      const p = path.join(folder, name)
      fs.existsSync(p) && (files[name] = p)
    })
    SHARED_FOLDERS.forEach(sub => {
      const dir = path.join(folder, sub)
      if ( !fs.existsSync(dir) ) return
      fs.readdirSync(dir).filter(n => !n.startsWith('.')).forEach(n => {
        const p = path.join(dir, n)
        try { fs.statSync(p).isFile() && (files[`${sub}/${n}`] = p) } catch(err) {}
      })
    })
    return files
  }

  // Différences du dossier depuis le dernier envoi
  sync(){
    const s = this.sender
    if ( !s || !this.online ) return
    const files = this.sharedFiles(s.folder)
    let n = 0
    for ( const [rel, full] of Object.entries(files) ) {
      let st
      try { st = fs.statSync(full) } catch(err) { continue }
      const sig = `${st.size}:${st.mtimeMs}`
      if ( s.sent.get(rel) === sig ) continue
      this.emit({type: 'file', id: s.id, path: rel, data: fs.readFileSync(full).toString('base64')})
      s.sent.set(rel, sig) ; n++
    }
    for ( const rel of [...s.sent.keys()] ) {
      if ( files[rel] ) continue
      this.emit({type: 'remove', id: s.id, path: rel})
      s.sent.delete(rel) ; n++
    }
    n && this.emit({type: 'saved', id: s.id})
  }

  // Partie visible de la fenêtre de l'analyste (px de la page)
  view(v){
    const s = this.sender
    s && this.emit({type: 'view', id: s.id, view: v})
  }

  // Signatures des fichiers du dossier (rien à renvoyer, cf. sync)
  signatures(folder){
    const sent = new Map()
    Object.entries(this.sharedFiles(folder)).forEach(([rel, full]) => {
      try { const st = fs.statSync(full) ; sent.set(rel, `${st.size}:${st.mtimeMs}`) } catch(err) {}
    })
    return sent
  }

  /* --- La main (#221) --- */

  // Spectateur : « Demander la main… »
  ask(){
    const f = this.following
    if ( !f || !f.ready || f.control ) return
    f.asked = true
    this.emit({type: 'ask', id: f.id})
    this.sendState()
  }
  // Analyste : demande reçue
  on_request({id, email, pseudo}){
    const s = this.sharing
    if ( !s || s.id != id ) return
    s.requests.set(email, {email, pseudo})
    this.send('partage:request', {email, pseudo})
    this.sendState()
  }
  on_requestClosed({id, email}){
    const s = this.sharing
    if ( !s || s.id != id ) return
    s.requests.delete(email)
    this.sendState()
  }
  grant({email}){
    const s = this.sharing
    s && s.requests.has(email) && this.emit({type: 'grant', id: s.id, email})
  }
  deny({email}){
    const s = this.sharing
    if ( !s ) return
    s.requests.delete(email)
    this.emit({type: 'deny', id: s.id, email})
    this.sendState()
  }
  takeback(){
    const s = this.sharing
    s && s.given && this.emit({type: 'takeback', id: s.id})
  }
  on_denied({id}){
    if ( !this.following || this.following.id != id ) return
    this.following.asked = false
    this.send('partage:message', {notice: t('ui.partage.denied', {pseudo: this.following.pseudo})})
    this.sendState()
  }
  on_askClosed({id}){
    if ( !this.following || this.following.id != id ) return
    this.following.asked = false
    this.sendState()
  }
  // Main reçue (on) ou perdue : la page change de mode
  on_control({id, on, pseudo}){
    const s = this.sharing, f = this.following
    if ( s && s.id == id ) {
      s.given = on ? null : (pseudo || '?')
      // Main reprise : l'analyse reçue n'est pas renvoyée
      if ( on ) s.sent = this.signatures(s.folder)
      s.changed = new Set()
    } else if ( f && f.id == id ) {
      f.control = !!on
      f.asked = false
      if ( on ) f.sent = this.signatures(f.folder)
    } else return
    this.sendState()
    this.hooks.reload()
  }
  on_controller({id, pseudo}){
    if ( !this.following || this.following.id != id ) return
    this.following.controller = pseudo
    this.sendState()
  }

  /* --- Spectateur --- */

  on_invitation({id, pseudo, titre}){
    if ( this.following && this.following.id == id ) return
    this.invitations.set(id, {id, pseudo, titre})
    this.send('partage:invitation', {id, pseudo, titre})
    this.sendState()
  }
  on_withdrawn({id}){
    this.invitations.delete(id)
    this.sendState()
  }
  on_list({shares}){
    shares.forEach(s => this.invitations.set(s.id, s))
    this.listResolve && this.listResolve(shares)
    this.listResolve = null
  }
  list(){
    if ( !this.online ) throw new Error(t('errors.partage.offline'))
    return new Promise(resolve => {
      this.listResolve = resolve
      this.emit({type: 'list'})
      setTimeout(() => { this.listResolve && this.listResolve([]) ; this.listResolve = null }, 5000)
    })
  }

  accept({id}){
    if ( !this.online ) throw new Error(t('errors.partage.offline'))
    const inv = this.invitations.get(id) || {}
    this.invitations.delete(id)
    this.following = {id, pseudo: inv.pseudo, titre: inv.titre, ready: false, changed: new Set()}
    this.emit({type: 'accept', id})
    this.sendState()
  }
  refuse({id}){
    this.invitations.delete(id)
    this.sendState()
  }

  folderFor(id){ return path.join(app.getPath('userData'), 'partages', id) }

  on_begin({id, pseudo, titre}){
    if ( !this.following || this.following.id != id ) return
    const folder = this.folderFor(id)
    // Nouvel envoi complet : le dossier est refait (analyse actualisée)
    fs.rmSync(folder, {recursive: true, force: true})
    fs.mkdirSync(path.join(folder, 'systems'), {recursive: true})
    Object.assign(this.following, {pseudo, titre, folder, ownerPresent: true})
    this.cleanOldFolders(id)
  }

  // Chemin complet d'un fichier reçu, seulement parmi les fichiers
  // partagés (dossier de l'analyste compris, cf. #221)
  receivedPath(r, rel){
    const ok = SHARED_FILES.includes(rel) || SHARED_FOLDERS.some(sub => new RegExp(`^${sub}/[^/]+$`).test(rel))
    const full = path.resolve(r.folder, rel)
    return ok && full.startsWith(path.resolve(r.folder) + path.sep) ? full : null
  }

  on_file({id, path: rel, data}){
    const r = this.receiverFor(id)
    const full = r && this.receivedPath(r, rel)
    if ( !full ) return
    fs.mkdirSync(path.dirname(full), {recursive: true})
    fs.writeFileSync(full, Buffer.from(data, 'base64'))
    r.changed.add(rel)
  }
  on_remove({id, path: rel}){
    const r = this.receiverFor(id)
    const full = r && this.receivedPath(r, rel)
    if ( !full ) return
    fs.rmSync(full, {force: true})
    r.changed.add(rel)
  }

  on_ready({id}){
    const f = this.following
    if ( !f || f.id != id ) return
    f.ready = true
    f.changed.clear()
    this.hooks.openFolder(f.folder)
    this.sendState()
  }

  // Enregistrement de l'analyste : marques seules → actualisation dans
  // la page ; autre changement (systèmes…) → page rechargée
  on_saved({id}){
    const f = this.receiverFor(id)
    if ( !f || (f === this.following && !f.ready) ) return
    const changed = [...f.changed]
    f.changed.clear()
    if ( changed.every(rel => LIGHT_FILES.includes(rel)) ) this.send('partage:update')
    else this.hooks.reload()
  }

  on_view({id, view}){
    if ( !this.receiverFor(id) ) return
    this.lastView = view
    this.applyView()
  }
  // Même partie de l'analyse que l'analyste, à l'échelle de la fenêtre
  applyView(){
    const win = this.hooks.window()
    const v = this.lastView
    if ( !win || !v || !v.w || !this.spectator ) return
    const [contentW] = win.getContentSize()
    const zoom = Math.max(0.2, Math.min(4, contentW / v.w))
    win.webContents.setZoomFactor(zoom)
    this.send('partage:view', {x: v.x, y: v.y, zoom})
  }

  on_owner({id, present}){
    if ( !this.following || this.following.id != id ) return
    this.following.ownerPresent = present
    this.sendState()
  }

  // Fin du partage, « Quitter » : l'analyse devient celle du spectateur
  on_end({id, raison}){
    if ( !this.following || this.following.id != id ) return
    // Message affiché après le rechargement de la page (cf. takeEnded)
    this.ended = raison
    this.release()
  }
  // Fin de partage à annoncer (une seule fois)
  takeEnded(){
    const raison = this.ended
    this.ended = null
    return raison
  }
  on_gone({id}){
    if ( this.sharing && this.sharing.id == id ) { this.sharing = null ; this.sendState() }
    if ( this.following && this.following.id == id ) {
      if ( this.following.ready ) { this.ended = 'gone' ; this.release() }
      else { this.following = null ; this.send('partage:ended', {raison: 'gone'}) ; this.sendState() }
    }
  }
  leave(){
    if ( !this.following ) return
    this.emit({type: 'leave'})
    this.release()
  }
  release(){
    const ready = this.following && this.following.ready
    this.following = null
    this.lastView = null
    this.sendState()
    ready && this.hooks.reload()
  }

  // Dossiers d'anciens partages suivis (plus de 30 jours) effacés
  cleanOldFolders(keep){
    const root = path.join(app.getPath('userData'), 'partages')
    const limit = Date.now() - 30 * 24 * 3600 * 1000
    try {
      fs.readdirSync(root).forEach(n => {
        const p = path.join(root, n)
        n != keep && fs.statSync(p).mtimeMs < limit && fs.rmSync(p, {recursive: true, force: true})
      })
    } catch(err) {}
  }

  // Dossier d'un partage suivi (« Enregistrer l'analyse… ») ?
  isSharedFolder(folder){
    return !!folder && path.resolve(folder).startsWith(path.join(app.getPath('userData'), 'partages') + path.sep)
  }
}

export const Partage = new PartageClass()
