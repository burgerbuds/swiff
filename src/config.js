import { h } from 'ink'
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
// TODO: Convert to named parameters
const getConfigIssues = (config, hasNewConfig, isInteractive = false) => {
    const requiredSettings = ['server.user', 'server.host', 'server.appPath']
    // Loop over the array and match against the keys in the users config
    const missingSettings = requiredSettings.filter(
        setting =>
            get(config, setting) === undefined ||
            get(config, setting).length === 0
    )
    // Return the error if any
    return !isEmpty(missingSettings)
        ? `${
              hasNewConfig
                  ? `Your new Swiff config was created at:\n${colourNotice(
                        pathConfig
                    )}\n\nThe config`
                  : `Your ${colourNotice(configFileName)}`
          } needs values for ${
              missingSettings.length > 1 ? 'these settings' : 'this setting'
          }:${hasNewConfig ? '\n' : '\n\n'}${missingSettings
              .map(s => `- ${colourNotice(s)}`)
              .join('\n')}${
              hasNewConfig && isInteractive
                  ? `\n\nOnce you've finished, rerun this task by pressing enter...`
                  : ''
          }`
        : null
}

export { setupConfig, getConfig, createConfig }
