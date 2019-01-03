import path from 'path'
import { resolveApp } from './utils'

const backupsFolder = 'backups'
const configFileName = 'swiff.config.js'

module.exports = {
    configFileName,
    pathApp: resolveApp(''),
    pathConfig: resolveApp(configFileName),
    pathLocalEnv: resolveApp('.env'),
    pathConfigTemplate: path.resolve(__dirname, `../src/${configFileName}`),
    pathBackups: path.resolve(__dirname, `../${backupsFolder}`),
}
