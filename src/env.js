import { h } from 'ink'
import fs from 'fs-extra'
import dotenv from 'dotenv'
import { isEmpty } from './utils'
import { colourNotice } from './palette'
import { pathLocalEnv, pathLocalEnvTemplate } from './paths'
import { getSshEnv } from './ssh'


const createEnv = (fromPath = pathLocalEnvTemplate, toPath = pathLocalEnv) =>
    fs.copy(fromPath, toPath)

const setupLocalEnv = async () => {
    // Get the local env file
    const localEnv = getParsedEnv(pathLocalEnv)
    const isEnvMissing = localEnv instanceof Error
    // If env isn't available then create one
    if (isEnvMissing) {
        await createEnv()
        return setupLocalEnv()
    }
    // Get a summary of any env issues
    const localEnvIssues = getEnvIssues(localEnv, isEnvMissing, false)
    // Return the missing settings error or the env contents
    return localEnvIssues ? new Error(localEnvIssues) : localEnv
}

const getParsedEnv = path => {
    const envFile = dotenv.config({ path: path }).parsed
    return envFile ? envFile : new Error(`Missing .env`)
}

// Check all of the required env settings exist
const getEnvIssues = (
    env,
    isEnvMissing,
    isRemoteEnv,
    requiredSettings = [
        'ENVIRONMENT',
        'DB_SERVER',
        'DB_USER',
        'DB_PASSWORD',
        'DB_DATABASE',
    ]
) => {
    // Loop over the array and match against the keys in the users env
    const missingSettings = requiredSettings.filter(
        setting => !(setting in env)
        // Make sure there's an environment defined
        || (setting === 'ENVIRONMENT' && isEmpty(env[setting]))
        // Make sure there's a server defined
        || (setting === 'DB_SERVER' && isEmpty(env[setting]))
        // Make sure there's a user defined
        || (setting === 'DB_USER' && isEmpty(env[setting]))
        // Make sure there's a database defined
        || (setting === 'DB_DATABASE' && isEmpty(env[setting]))
    )
    // Return the error if any
    return !isEmpty(missingSettings)
        ? `${
              isEnvMissing
                  ? `Please add an ${colourNotice(
                        '.env'
                    )} file in your ${isRemoteEnv ? 'remote' : 'local' } project root and add`
                  : `${isRemoteEnv ? 'The remote' : 'Your local' } ${colourNotice('.env')} needs`
          } ${
              missingSettings.length > 1 ? 'values for these settings' : 'a value for this setting'
          }:\n\n${missingSettings
              .map(s => `${s}="${colourNotice(`value`)}"`)
              .join('\n')}${
              isEnvMissing
                  ? `\n\nOnce you've finished, rerun this task by pressing enter...`
                  : ''
          }`
        : null
}

const getRemoteEnv = async ({ localEnv, serverConfig }) => {
    // Get the remote env file
    const sshConfig = {
        host: serverConfig.host,
        username: serverConfig.user,
        appPath: serverConfig.appPath,
    }
    // Get the custom key if it's set and merge it with the config
    const swiffSshKeyPath = !isEmpty(localEnv.SWIFF_CUSTOM_KEY)
        ? { swiffSshKeyPath: localEnv.SWIFF_CUSTOM_KEY }
        : null
    // Connect via SSH to get the contents of the remote .env
    const remoteEnv = await getSshEnv({
        ...sshConfig,
        ...swiffSshKeyPath,
    })
    // Return the errors instead of attempting validation
    if (remoteEnv instanceof Error) return remoteEnv
    // Validate the remote env
    const remoteEnvIssues = getEnvIssues(remoteEnv, false, true)
    // Return the missing settings error or the env contents
    return remoteEnvIssues ? new Error(remoteEnvIssues) : remoteEnv
}

export { getRemoteEnv, setupLocalEnv, getParsedEnv, getEnvIssues }
