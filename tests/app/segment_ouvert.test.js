// Segments horizontaux : « Ouvrir à droite / à gauche », « Fermer… »
// (menu contextuel) ; rien pour les verticaux (#291)
const { AObjet } = await T.imp('AObjet')
const { AnalyseSaver } = await T.imp('AnalyseSaver')
const { Stage } = await T.imp('Exporter')

const labels = m => m.contextMenuItems.map(i => i.label).filter(Boolean)
const bw = (m, side) => parseFloat(getComputedStyle(m.obj).getPropertyValue(`border-${side}-width`))

T.test('ouvrir, fermer à droite et à gauche (#291)', async () => {
  const m = await T.mark({type: 'seg', subtype: 'h-up', content: 'segouvert', top: 400, left: 300})
  const v = await T.mark({type: 'seg', subtype: 'v-left', content: 'v', top: 1400, left: 300})
  try {
    AObjet.deselectAll()
    T.ok(labels(m).includes('Ouvrir à droite') && labels(m).includes('Ouvrir à gauche'), 'menus « Ouvrir… »')
    T.no(labels(v).some(l => /Ouvrir à|Fermer à/.test(l)), 'segment vertical : rien')
    T.ok(bw(m, 'right') > 0 && bw(m, 'left') > 0, 'fermé des deux côtés au départ')
    m.onContextChoice('toggleOpenRight')
    T.eq(bw(m, 'right'), 0, 'ouvert à droite')
    T.ok(bw(m, 'left') > 0, 'gauche toujours fermée')
    T.ok(labels(m).includes('Fermer à droite'), 'menu devenu « Fermer à droite »')
    m.onContextChoice('toggleOpenLeft')
    T.eq(bw(m, 'left'), 0, 'ouvert à gauche')
    T.ok(labels(m).includes('Fermer à gauche'), 'menu devenu « Fermer à gauche »')
    await AnalyseSaver.save()
    const tags = await T.readFile('analyse_tags.yaml')
    T.ok(/open_right: true/.test(tags) && /open_left: true/.test(tags), 'enregistré')
    // Export : côtés ouverts
    const opts = {mode: 'book', width: 210, height: 297, margin: 10, gap: 20}
    const stage = new Stage()
    await stage.build() ; stage.respace(opts)
    const clone = [...document.querySelectorAll('div.amark.seg')].find(e => e !== m.obj && e.textContent.includes('segouvert'))
    T.ok(clone && parseFloat(getComputedStyle(clone).borderRightWidth) == 0 && parseFloat(getComputedStyle(clone).borderLeftWidth) == 0, 'export : ouvert des deux côtés')
    stage.remove()
    m.onContextChoice('toggleOpenRight')
    T.ok(bw(m, 'right') > 0, 'refermé à droite')
    // Passé en vertical : plus d'ouverture
    m.onContextChoice('toggleOpenRight')
    m.subtype = 'v-right'
    T.no(m.obj.classList.contains('open-right') || m.obj.classList.contains('open-left'), 'vertical : classes retirées')
  } finally { AObjet.remove(m) ; AObjet.remove(v) }
})
