import path from 'path'
import { resolveApp } from './utils'

const configFileName = 'swiff.config.js'

module.exports = {
    configFileName,
    pathApp: resolveApp(''),
    pathConfig: resolveApp(configFileName),
    pathLocalEnv: resolveApp('.env'),
    pathConfigTemplate: path.resolve(
        __dirname,
        `../resources/${configFileName}`
    ),
    pathLocalEnvTemplate: path.resolve(__dirname, '../resources/.env'),
    pathBackups: path.resolve(__dirname, '../backups'),
    pathMedia: path.resolve(__dirname, '../resources'),
}
