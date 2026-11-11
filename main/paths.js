import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const APP_FOLDER      = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
export const RENDERER_FOLDER = path.join(APP_FOLDER, 'renderer')
export const ASSETS_FOLDER   = path.join(APP_FOLDER, 'assets')

