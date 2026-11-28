// Segments : hauteur réglable (poignée du bas) pour toutes les
// dispositions, largeur aussi (#289). Vrais évènements, page défilée.
const { AObjet } = await T.imp('AObjet')
const { AnalyseSaver } = await T.imp('AnalyseSaver')

for ( const sub of ['h-up', 'h-down', 'v-left', 'v-right'] ) {
  T.test(`segment ${sub} : hauteur augmentée par la poignée du bas (#289)`, async () => {
    window.scrollTo({top: 1000, behavior: 'instant'})
    const m = await T.mark({type: 'seg', subtype: sub, content: 's', top: 1300, left: 600})
    try {
      const h = m.obj.querySelector(':scope > .ui-resizable-s')
      T.ok(h, 'poignée du bas')
      T.ok(m.obj.querySelector(':scope > .ui-resizable-e'), 'poignée de droite')
      const before = m.obj.offsetHeight
      const r = h.getBoundingClientRect()
      await T.invoke('test:realDrag', {x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), dx: 0, dy: 60})
      T.ok(m.obj.offsetHeight >= before + 50, `hauteur augmentée (${before} → ${m.obj.offsetHeight})`)
      T.ok(m.height >= before + 40, `hauteur enregistrée dans la marque (${m.height})`)
      await AnalyseSaver.save()
      const tags = await T.readFile('analyse_tags.yaml')
      T.ok(new RegExp(`height: ${m.height}\\b`).test(tags), 'hauteur dans les données')
    } finally { AObjet.remove(m) }
  })
}
