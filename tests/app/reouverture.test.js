// Enregistrement puis réouverture (deux lancements sur la même analyse,
// cf. T.phase) : marques de tous types et leurs réglages, préférences,
// infos, positions des systèmes, retrouvées à l'identique
const { Current } = await T.imp('Current')
const { AObjet } = await T.imp('AObjet')
const { Systeme } = await T.imp('Systeme')
const { Preferences } = await T.imp('Preferences')
const { AnalyseSaver } = await T.imp('AnalyseSaver')
const { Groups } = await T.imp('Groups')
const { Liaison } = await T.imp('Liaison')
const { History } = await T.imp('History')

// Données de toutes les marques (comme l'historique), sans les clés
// propres à l'affichage
const marksData = () => History.snapshot().marks
const PREFS = {marque_accords_size: 30, color_accords: '123456', notation_display: 'it', notation_input: 'it', form_position: 'before', animation_tempo: 90, autosave: false}

if ( T.phase == 1 ) {
  T.test('préparation : marques, réglages, préférences, infos, systèmes', async () => {
    const sys = Systeme.all[1]
    const at = (dx, dy) => ({top: sys.top + dy, left: 300 + dx})
    const acc  = await T.mark(Object.assign({type: 'acc', content: 'Fm75-'}, at(0, -100)))
    acc.setValue('Fm75- --')
    await T.mark(Object.assign({type: 'har', content: 'II**'}, at(0, 60)))
    await T.mark(Object.assign({type: 'mod', content: 'G'}, at(200, -150)))
    await T.mark(Object.assign({type: 'emp', content: 'D'}, at(400, -150)))
    await T.mark(Object.assign({type: 'cad', subtype: 'par', content: 'I'}, at(600, 60)))
    await T.mark(Object.assign({type: 'not', subtype: 'ap', content: 'AP'}, at(700, 100)))
    const cel = await T.mark(Object.assign({type: 'bbx', subtype: 'cel', content: 'C1'}, at(100, 20)))
    await T.mark(Object.assign({type: 'txt', subtype: 'size2', content: 'Le 1^er^ thème'}, at(0, -220)))
    const t1 = await T.mark(Object.assign({type: 'txt', subtype: 'size3', content: 'a'}, at(800, -220)))
    const t2 = await T.mark(Object.assign({type: 'txt', subtype: 'size3', content: 'b'}, at(1000, -220)))
    const mot = await T.mark(Object.assign({type: 'mot', content: 'Thème'}, at(300, 100)))
    mot.setVariable('theme')
    const cir = await T.mark(Object.assign({type: 'cir'}, at(900, 0)))
    cir.previewBorder({width: 7}) ; cir.confirmBorder()
    const lock = await T.mark(Object.assign({type: 'acc', content: 'C'}, at(1100, -100)))
    lock.lock()
    await T.mark(Object.assign({type: 'frm', subtype: 'fpar', content: 'Exposition'}, at(0, -180)))
    await T.mark(Object.assign({type: 'lay', subtype: 'tit', content: 'Titre', level: 2}, at(0, -300)))
    await T.mark(Object.assign({type: 'img', content: 'exemple.png'}, at(1200, 0)))
    Groups.group([t1, t2])
    Liaison.link([t1, cel])
    for ( const [k, v] of Object.entries(PREFS) ) { Preferences.saveData(k, v) ; Preferences.set(k, v) }
    Current.analyse.infos.piece_title = 'Sonate « réouverture »'
    Current.analyse.infos.composer = 'Beethoven'
    Systeme.all[3].positionne(Systeme.all[3].top + 37, true)
    // Attendu, enregistré dans les infos pour la seconde phase
    Current.analyse.infos.test_attendu = JSON.stringify({marks: marksData(), sys3: Systeme.all[3].top, count: AObjet.items.filter(o => !o.isSystem).length})
    T.eq(await AnalyseSaver.save(), true, 'enregistrement')
  })
} else {
  T.test('réouverture : tout est retrouvé à l’identique', async () => {
    const attendu = JSON.parse(Current.analyse.infos.test_attendu || '{}')
    T.ok(attendu.marks, 'données attendues')
    if ( !attendu.marks ) return
    T.eq(AObjet.items.filter(o => !o.isSystem).length, attendu.count, 'nombre de marques')
    const now = marksData()
    for ( const [id, data] of Object.entries(attendu.marks) ) {
      T.eq(now[id], data, `marque ${id} (${data.type}/${data.subtype || ''})`)
    }
    for ( const [k, v] of Object.entries(PREFS) ) T.eq(Preferences.get(k), v, `préférence ${k}`)
    T.eq([Current.analyse.infos.piece_title, Current.analyse.infos.composer], ['Sonate « réouverture »', 'Beethoven'], 'infos')
    T.eq(Systeme.all[3].top, attendu.sys3, 'position du système déplacé')
    // Réglages visibles
    const by = (type, content) => AObjet.items.find(o => o.type == type && (content === undefined || o.content == content))
    T.ok(by('acc', 'Fm75- ').hasProlongLine, 'ligne de prolongation')
    T.ok(by('acc', 'C') && by('acc', 'C').isLocked && by('acc', 'C').obj.classList.contains('locked'), 'marque verrouillée')
    T.eq(getComputedStyle(by('acc', 'Fm75- ').obj.querySelector('span.content')).fontFamily, 'PhilNoteIt', 'écriture italienne')
    T.ok(Liaison.all.length == 1, 'liaison')
    T.includes(document.querySelector('#window-title').textContent, 'Sonate « réouverture »', 'bande de titre')
    const cir = by('cir')
    T.eq(parseFloat(getComputedStyle(cir.obj).borderTopWidth), 7, 'bord du cercle')
    T.includes(by('txt', 'Le 1^er^ thème').obj.innerHTML, '<sup>er</sup>', 'exposant')
  })
}
