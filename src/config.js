import fs from 'fs-extra'
import get from 'lodash/get'
import { pathConfig, pathConfigTemplate } from './paths'
import { isEmpty } from './utils'
import { colourNotice } from './palette'
import { configFileName } from './paths'

const createConfig = (fromPath = pathConfigTemplate, toPath = pathConfig) =>
    fs.copy(fromPath, toPath)

const setupConfig = async (hasNewConfig, isInteractive) => {
    // Get config contents
    const config = await getConfig()
    // Build a list of any missing config options
    const missingConfigSettings = getConfigIssues(
        config,
        hasNewConfig,
        isInteractive
    )
    // Return the missing settings or the whole env
    return missingConfigSettings ? new Error(missingConfigSettings) : config
}

const getConfig = async () => {
    // Make sure we pull a config freshie if user happens to update the options
    delete require.cache[require.resolve(pathConfig)]
    // Load the user config and extract data
    const config = await new Promise(resolve => resolve(require(pathConfig)))
    return config
}

// Check that the required config settings exist
const getConfigIssues = (config, hasNewConfig, isInteractive = false) => {
    const requiredSettings = [
        'server.user',
        'server.host',
        'server.appPath',
        'server.port',
    ]
    // Loop over the array and match against the keys in the users config
    const missingSettings = requiredSettings.filter(
        setting =>
            get(config, setting) === undefined ||
            get(config, setting).length === 0
    )
    // Return the error if any
    return !isEmpty(missingSettings)
        ? `Add the following ${
              missingSettings.length > 1 ? 'values' : 'value'
          } to your ${
              hasNewConfig
                  ? `new config:\n${colourNotice(pathConfig)}`
                  : `${colourNotice(configFileName)}:`
          }\n\n${missingSettings
              .map((s, i) => `${colourNotice(`— `)} ${s}`)
              .join('\n')}\n\n${
              isInteractive ? `Then hit [ enter ↵ ] to rerun this task` : ``
          }
        `
        : null
}

export { setupConfig, getConfig, createConfig }
