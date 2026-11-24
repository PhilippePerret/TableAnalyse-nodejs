/*
 * Harnais des tests de l'application (joué dans le renderer, avant le
 * fichier de test, cf. tests/run.mjs). Le fichier de test déclare ses
 * tests avec T.test(nom, async () => {...}) et ses vérifications avec
 * T.eq, T.ok… ; tout le code de l'application est accessible par
 * await T.imp('AMark') (= import('./js/AMark.js')).
 */
const T = (() => {
  const tests = []
  let current = null
  const fmt = v => { try { return JSON.stringify(v) } catch(e) { return String(v) } }
  const fail = (msg) => current.failures.push(msg)

  const T = {
    test(name, fn){ tests.push({name, fn}) },
    imp(name){ return import(`./js/${name}.js`) },
    // Vérifications : un échec est consigné, le test continue
    eq(got, exp, label = ''){
      if ( fmt(got) !== fmt(exp) ) fail(`${label} : obtenu ${fmt(got)}, attendu ${fmt(exp)}`)
      else current.checks++
    },
    ok(cond, label = ''){ cond ? current.checks++ : fail(`${label} : faux`) },
    no(cond, label = ''){ !cond ? current.checks++ : fail(`${label} : vrai`) },
    includes(str, sub, label = ''){
      String(str).includes(sub) ? current.checks++ : fail(`${label} : ${fmt(sub)} absent de ${fmt(String(str).slice(0, 300))}`)
    },
    wait(ms){ return new Promise(r => setTimeout(r, ms)) },
    async until(fn, label = 'condition', timeout = 5000){
      const end = Date.now() + timeout
      while ( Date.now() < end ) { try { if ( await fn() ) return true } catch(e) {} ; await T.wait(50) }
      fail(`${label} : non atteinte en ${timeout} ms`)
      return false
    },
    // Appel au processus principal ({ok, data} → data, sinon exception)
    async invoke(channel, data){
      const res = await window.api.invoke(channel, data)
      if ( !res.ok ) throw new Error(res.error)
      return res.data
    },
    readFile(rel){ return T.invoke('test:readFile', {rel}) },
    listFiles(rel){ return T.invoke('test:listFiles', {rel}) },
    // Évènements souris/clavier simulés
    mouse(target, type, opts = {}){
      target.dispatchEvent(new MouseEvent(type, Object.assign({bubbles: true, cancelable: true, button: 0}, opts)))
    },
    key(target, key, opts = {}){
      target.dispatchEvent(new KeyboardEvent('keydown', Object.assign({bubbles: true, cancelable: true, key}, opts)))
    },
  }

  // Analyse chargée et systèmes affichés
  async function ready(){
    const { Current } = await T.imp('Current')
    const { Systeme } = await T.imp('Systeme')
    const end = Date.now() + 15000
    while ( Date.now() < end ) {
      const imgs = [...document.querySelectorAll('img.systeme')]
      if ( Current.analyse && Systeme.all.length && imgs.length && imgs.every(i => i.complete) ) break
      await T.wait(100)
    }
    await T.wait(500)
  }

  T.run = async () => {
    const results = []
    // Erreurs non attrapées pendant un test : échec de ce test
    window.addEventListener('error', e => current && fail(`erreur : ${e.message}`))
    window.addEventListener('unhandledrejection', e => current && fail(`promesse rejetée : ${e.reason && e.reason.message || e.reason}`))
    try { await ready() } catch(e) { results.push({name: '(chargement)', checks: 0, failures: [e.stack]}) }
    for ( const t of tests ) {
      current = {name: t.name, checks: 0, failures: []}
      try { await t.fn() } catch(e) { fail(`exception : ${e.stack || e}`) }
      results.push(current)
    }
    current = null
    await window.api.invoke('test:done', {results})
  }
  return T
})()
