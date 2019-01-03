import { h } from 'ink'
import nodeSsh from 'node-ssh'
import resolveUsername from 'username'
import path from 'path'
import { executeCommands, cmdPromise, isEmpty } from './utils'
import { getParsedEnv } from './env'
import { getDbDumpZipCommands } from './database'
import { pathBackups, pathApp } from './paths'
import { colourAttention } from './palette'

const getSshInit = async ({ host, user, swiffSshKey }) => {
    // Connect to the remote server via SSH
    // Get the remote env file
    const config = {
        host: host,
        username: user,
    }
    // Get the custom privateKey if it's set
    const swiffSshKeyPath = !isEmpty(swiffSshKey)
        ? { swiffSshKeyPath: swiffSshKey }
        : null
    const connection = await sshConnect({ ...config, ...swiffSshKeyPath })
    return connection
}

const getSshFile = async ({ connection, from, to }) => {
    let errorMessage
    // Download the composer file from the remote server
    await connection
        .getFile(
            to, // To local
            from // From remote
        )
        .catch(e => (errorMessage = `${e}\n${from}`))
    // If there’s download issues then return the messages
    if (errorMessage) return new Error(errorMessage)
    return
}

// Connect to the remote server via SSH
const sshConnect = async ({ host, username, swiffSshKeyPath }) => {
    let errorMessage
    // Get the local username so we can get the default key below (macOS path)
    const user = await resolveUsername()
    // Create a SSH connection
    const ssh = new nodeSsh()
    await ssh
        .connect({
            host: host,
            username: username,
            privateKey: !isEmpty(swiffSshKeyPath)
                ? swiffSshKeyPath
                : `/Users/${user}/.ssh/id_rsa`,
        })
        .catch(error => (errorMessage = error))
    if (errorMessage)
        return new Error(
            String(errorMessage).includes('config.privateKey does not exist at')
                ? `Your custom SSH identity file isn’t found at ${colourAttention(
                      swiffSshKeyPath
                  )}\n\nCheck the ${colourAttention(
                      `SWIFF_CUSTOM_KEY`
                  )} value is correct in your local .env\n\nmacOS path example:\n${colourAttention(
                      `SWIFF_CUSTOM_KEY="/Users/${user}/.ssh/id_rsa"`
                  )}`
                : errorMessage
        )
    return ssh
}

const getSshEnv = async ({ host, username, appPath, swiffSshKeyPath }) => {
    let errorMessage
    // Create a SSH connection
    const ssh = await sshConnect({ host, username, swiffSshKeyPath })
    // If there’s any connection issues then return the messages
    if (ssh instanceof Error) return ssh
    // Set where we’ll be downloading the temporary remote .env file
    const backupPath = `${pathBackups}/.env`
    // Download the remote .env file
    // We can’t read the env contents with this package so we have to download
    // then read it
    await ssh
        .getFile(backupPath, path.join(appPath, '.env'))
        .catch(error => (errorMessage = error))
    // If there’s any .env download issues then return the messages
    if (errorMessage) return new Error(errorMessage)
    // Return the contents of the .env file
    const remoteEnv = getParsedEnv(backupPath)
    if (remoteEnv) {
        // Remove the temporary remote .env file
        await cmdPromise(`rm ${backupPath}`).catch(
            error => (errorMessage = error)
        )
        // If there’s any .env removal issues then return the messages
        if (errorMessage) return new Error(errorMessage)
    }
    // Close the SSH connection
    ssh.dispose()
    // Return the contents of the env
    return remoteEnv
}

const getSshCopyInstructions = ({ server }) =>
    `Haven’t added your key to the server?\nUse ssh-copy-id to quickly add your key\neg: ssh-copy-id ${server.user}@${server.host}`

// Build a string of commands to send to child_process.exec
const getSshPushCommands = ({
    pushFolders,
    user,
    host,
    workingDirectory,
    swiffSshKey,
}) => {
    // Set the custom identity if provided
    const customKey = !isEmpty(swiffSshKey) ? `-e "ssh -i ${swiffSshKey}"` : ''
    const flags = `-avz --delete ${customKey} --exclude '.env'`
    // Build the final commands from a list of paths.
    const commandsArray = pushFolders.map(
        path =>
            `(rsync ${flags} ${pathApp}/${path}/ ${user}@${host}:${workingDirectory}/${path}/)`
    )
    // Return the commands as a string
    return commandsArray.join('\n')
}

// Build command to test ssh connection
const getSshTestCommand = (user, host) =>
    `ssh -o BatchMode=yes -o ConnectTimeout=5 ${user}@${host} echo 'SSH access is setup' 2>&1`

// Download a database over SSH to a local folder
const getSshDatabase = async ({
    remoteEnv,
    host,
    user,
    sshAppPath,
    gzipFileName,
    swiffSshKey,
}) => {
    let errorMessage
    const ssh = await getSshInit({
        host: host,
        user: user,
        swiffSshKey: swiffSshKey,
    })
    // If there’s connection issues then return the messages
    if (ssh instanceof Error) return ssh
    // Dump the database and gzip on the remote server
    await ssh
        .execCommand(
            getDbDumpZipCommands({
                database: remoteEnv.DB_DATABASE,
                user: remoteEnv.DB_USER,
                password: remoteEnv.DB_PASSWORD,
                gzipFilePath: gzipFileName,
            }),
            {
                cwd: sshAppPath,
            }
        )
        .catch(e => (errorMessage = e))
    // If there’s db dump/gzip issues then return the messages
    if (errorMessage) return new Error(errorMessage)
    // Download the file from the remote server
    const downloadTo = `${pathBackups}/${gzipFileName}`
    const sshFile = await getSshFile({
        connection: ssh,
        from: `${sshAppPath}/${gzipFileName}`,
        to: downloadTo,
    })
    if (sshFile instanceof Error)
        return (
            ssh.dispose() &&
            new Error(
                `${
                    String(errorMessage).includes('No such file')
                        ? `There was an issue downloading the remote ${colourAttention(
                              remoteEnv.DB_DATABASE
                          )} database\n\nMaybe there’s incorrect database settings in the ${colourAttention(
                              'remote .env'
                          )}? \n\n${colourAttention(
                              JSON.stringify(remoteEnv, null, 2)
                          )}`
                        : errorMessage
                }`
            )
        )
    // Cleanup the database dump on the server
    await ssh
        .execCommand(`rm ${gzipFileName}`, { cwd: sshAppPath })
        .catch(e => (errorMessage = e))
    // If there’s removal issues then close the connection and return the messages
    if (errorMessage) return ssh.dispose() && new Error(errorMessage)
    // Close the connection
    ssh.dispose()
    // Unzip the database
    // -d : decompress / -f : force overwrite any existing file
    await executeCommands(`gzip -df '${downloadTo}'`)
    return
}

export {
    getSshInit,
    getSshFile,
    getSshEnv,
    getSshDatabase,
    getSshTestCommand,
    getSshCopyInstructions,
    getSshPushCommands,
}
