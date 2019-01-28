import { h } from 'ink'
import fs from 'fs-extra'
import dotenv from 'dotenv'
import { isEmpty } from './utils'
import { colourNotice } from './palette'
import { pathLocalEnv, pathLocalEnvTemplate } from './paths'
import { getSshEnv } from './ssh'

const createEnv = (fromPath = pathLocalEnvTemplate, toPath = pathLocalEnv) =>
    fs.copy(fromPath, toPath)

const setupLocalEnv = async isInteractive => {
    // Get the local env file
    const localEnv = getParsedEnv(pathLocalEnv)
    const isEnvMissing = localEnv instanceof Error
    // If env isn't available then create one
    if (isEnvMissing) {
        await createEnv()
        return setupLocalEnv(isInteractive)
    }
    // Get a summary of any env issues
    const localEnvIssues = getEnvIssues(
        localEnv,
        isEnvMissing,
        false,
        isInteractive,
    )
    // Return the missing settings error or the env contents
    return localEnvIssues ? new Error(localEnvIssues) : localEnv
}

const getParsedEnv = path => {
    const envFile = dotenv.config({ path: path }).parsed
    return envFile ? envFile : new Error(`Missing .env`)
}

// Check all of the required env settings exist
// TODO: Convert to named parameters
const getEnvIssues = (
    env,
    isEnvMissing,
    isRemoteEnv,
    isInteractive = false,
    appPath = '',
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
        setting =>
            !(setting in env) ||
            // Make sure there's an environment defined
            (setting === 'ENVIRONMENT' && isEmpty(env[setting])) ||
            // Make sure there's a server defined
            (setting === 'DB_SERVER' && isEmpty(env[setting])) ||
            // Make sure there's a user defined
            (setting === 'DB_USER' && isEmpty(env[setting])) ||
            // Make sure there's a database defined
            (setting === 'DB_DATABASE' && isEmpty(env[setting]))
    )
    // Return the error if any
    return !isEmpty(missingSettings)
        ? `${
              isEnvMissing
                  ? `Please add an ${colourNotice('.env')} file in ${isRemoteEnv ? 'the remote' : 'your local'} folder:\n${colourNotice(appPath)}\n\nWithin the env please add`
                  : `${
                        isRemoteEnv ? 'The remote' : 'Your local'
                    } ${colourNotice('.env')} needs`
          } ${
              missingSettings.length > 1
                  ? 'values for these settings'
                  : 'a value for this setting'
          }:\n\n${missingSettings
              .map(s => `${s}="${colourNotice(`value`)}"`)
              .join('\n')}${
              isEnvMissing && isInteractive
                  ? `\n\nOnce you've finished, rerun this task by pressing enter...`
                  : ''
          }`
        : null
}

const getRemoteEnv = async ({ sshKeyPath, serverConfig, isInteractive }) => {
    // Get the remote env file
    const sshConfig = {
        host: serverConfig.host,
        username: serverConfig.user,
        appPath: serverConfig.appPath,
        port: serverConfig.port,
        sshKeyPath: sshKeyPath,
    }
    // Connect via SSH to get the contents of the remote .env
    const remoteEnv = await getSshEnv(sshConfig)
    // Validate the remote env
    const remoteEnvIssues = getEnvIssues(remoteEnv, (remoteEnv instanceof Error), true, isInteractive, serverConfig.appPath)
    // Return the missing settings error or the env contents
    return remoteEnvIssues ? new Error(remoteEnvIssues) : remoteEnv
}

export { getRemoteEnv, setupLocalEnv, getParsedEnv, getEnvIssues }
