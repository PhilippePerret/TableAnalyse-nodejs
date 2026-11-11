/**
 * Point d'entrée du renderer (module chargé par index.html)
 */
import { Message } from './lib/Message.js'
import { UI } from './UI.js'
import { App } from './App.js'

Message.init()
UI.setInterface()
App.observe()
App.load_analyse_if_exist()
