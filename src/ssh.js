import nodeSsh from 'node-ssh'
import resolveUsername from 'username'
import path from 'path'
import { executeCommands, cmdPromise, isEmpty, isFunction } from './utils'
import { getParsedEnv } from './env'
import { getDbDumpZipCommands } from './database'
import { pathBackups, pathApp } from './paths'
import {
    colourAttention,
    colourHighlight,
    hexHighlight,
    colourNotice,
} from './palette'
import chalk from 'chalk'
import readlineSync from 'readline-sync'

const getSshInit = async ({ host, user, port, sshKeyPath }) => {
    // Connect to the remote server via SSH
    // Get the remote env file
    const config = {
        host: host,
        username: user,
        port: port,
    }
    // Get the custom privateKey if it's set
    sshKeyPath = !isEmpty(sshKeyPath) ? { sshKeyPath: sshKeyPath } : null
    const connection = await sshConnect({ ...config, ...sshKeyPath })
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
const sshConnect = async ({ host, username, port, sshKeyPath }) => {
    let errorMessage, passphrase
    // Get the local username so we can get the default key below (macOS path)
    const user = await resolveUsername()
    const sshKeyResolvedPath = !isEmpty(sshKeyPath)
        ? sshKeyPath
        : `/Users/${user}/.ssh/id_rsa`
    // Create a SSH connection
    const ssh = new nodeSsh()
    const tryToConnect = async () => {
        errorMessage = null
        await ssh
            .connect({
                host: host,
                username: username,
                port: port,
                privateKey: sshKeyResolvedPath,
                passphrase: passphrase,
            })
            .catch(error => (errorMessage = error))
        if (
            String(errorMessage).includes(
                'Encrypted OpenSSH private key detected, but no passphrase given'
            ) ||
            String(errorMessage).includes(
                'Malformed OpenSSH private key. Bad passphrase?'
            )
        ) {
            passphrase = readlineSync.question(
                String(errorMessage).includes('Malformed')
                    ? `${colourAttention(
                          [
                              'Passphrase incorrect',
                              "That's not right",
                              'That looks wrong',
                          ].sort((el1, el2) => Math.random() - Math.random())[0]
                      )}, please try again: `
                    : `Enter the passphrase for ${colourNotice(
                          sshKeyResolvedPath
                      )}: `,
                {
                    hideEchoBack: true,
                    mask: chalk('\u2665'),
                }
            )
            await tryToConnect()
        }
    }
    await tryToConnect()
    if (errorMessage)
        return new Error(
            String(errorMessage).includes(
                'Error: Cannot parse privateKey: Unsupported key format'
            )
                ? `Your SSH key isn't in a format Swiff can work with\n  (${sshKeyResolvedPath})\n\n1. Generate a new one with:\n  ${colourNotice(
                      `ssh-keygen -m PEM -b 4096 -f /Users/${user}/.ssh/swiff`
                  )}\n\n2. Then add the key to the server:\n  ${colourNotice(
                      `ssh-copy-id -i /Users/${user}/.ssh/swiff ${
                          port !== 22 ? `-p ${port} ` : ''
                      }${username}@${host}`
                  )}`
                : String(errorMessage).includes(
                      'config.privateKey does not exist at'
                  )
                ? `Your SSH key isn’t found at ${colourAttention(
                      sshKeyResolvedPath
                  )}\n\nCheck the ${colourAttention(
                      `SWIFF_CUSTOM_KEY`
                  )} value is correct in your local .env\n\nmacOS path example:\n${colourAttention(
                      `SWIFF_CUSTOM_KEY="/Users/${user}/.ssh/[key-filename]"`
                  )}`
                : errorMessage
        )
    return ssh
}

const getSshEnv = async ({ host, username, port, appPath, sshKeyPath }) => {
    let errorMessage
    // Create a SSH connection
    const ssh = await sshConnect({ host, username, port, sshKeyPath })
    // If there’s any connection issues then return the messages
    if (ssh instanceof Error) return ssh
    // Set where we’ll be downloading the temporary remote .env file
    const tempBackupPath = path.join(pathBackups, '.env')
    // Download the remote .env file
    // We can’t read the env contents with this package so we have to download
    // then read it
    await ssh
        .getFile(tempBackupPath, path.join(appPath, '.env'))
        .catch(error => (errorMessage = error))
    // If there’s any .env download issues then return the messages
    if (errorMessage) {
        // If dispose is a function call it
        if (
            ssh.dispose() &&
            {}.toString.call(ssh.dispose()) === '[object Function]'
        )
            ssh.dispose()
        return new Error(errorMessage)
    }
    // Return the contents of the .env file
    const remoteEnv = getParsedEnv(tempBackupPath)
    if (remoteEnv) {
        // Remove the temporary remote .env file
        await cmdPromise(`rm ${tempBackupPath}`).catch(
            error => (errorMessage = error)
        )
        // If there’s any .env removal issues then return the messages
        if (errorMessage) {
            if (
                ssh.dispose() &&
                {}.toString.call(ssh.dispose()) === '[object Function]'
            )
                ssh.dispose()
            return new Error(errorMessage)
        }
    }
    // Close the SSH connection
    ssh.dispose()
    // Return the contents of the env
    return remoteEnv
}

const getSshCopyInstructions = ({ server }, sshKeyPath) =>
    `${chalk.bold(
        `Haven’t added your key to the server?`
    )}\nYou can quickly add it with ssh-copy-id:\n${colourNotice(
        `ssh-copy-id ${!isEmpty(sshKeyPath) ? `-i ${sshKeyPath} ` : ''}${
            server.port !== 22 ? `-p ${server.port} ` : ''
        }${server.user}@${server.host}`
    )}`

const getSshPushCommands = ({
    pushFolders,
    user,
    host,
    port,
    workingDirectory,
    sshKeyPath,
}) => {
    // https://download.samba.org/pub/rsync/rsync.html
    const flags = [
        // '--dry-run',
        // Preserve permissions
        '--archive',
        // Compress file data during the transfer
        '--compress',
        // Output a change-summary for all updates
        '--itemize-changes',
        // Delete extraneous files from dest dirs
        '--delete',
        // Ignore misc files
        '--exclude ".git"',
        '--exclude ".env"',
        '--exclude ".DS_Store"',
        // Connect via a port number
        // Set the custom identity if provided
        `-e "ssh -p ${port}${
            !isEmpty(sshKeyPath) ? ` -i '${sshKeyPath}'` : ''
        }"`,
    ].join(' ')
    // Build the final command string from an array of folders
    const rsyncCommands = pushFolders
        .map(item => {
            const rSyncFrom = `${path.join(pathApp, item)}/`
            const rSyncTo = `${path.join(workingDirectory, item)}/`
            // Folders aren't created by rsync natively
            // https://stackoverflow.com/questions/1636889/rsync-how-can-i-configure-it-to-create-target-directory-on-server
            const createFolderCmd = `--rsync-path="mkdir -p ${rSyncTo} && rsync"`
            return [
                `echo '!${item}'`,
                `(rsync ${createFolderCmd} ${flags} ${rSyncFrom} ${user}@${host}:${rSyncTo})`,
            ].join(' && ')
        })
        .join(' && ')
    // Use grep to filter the rsync output
    const greppage = `grep -E '^(!|>|<|\\*)'`
    return `(${rsyncCommands}) | ${greppage}`
}

const getPushDatabaseCommands = ({
    host,
    user,
    port,
    fromPath,
    toPath,
    sshKeyPath,
}) => {
    // https://download.samba.org/pub/rsync/rsync.html
    const flags = [
        // '--dry-run',
        // Preserve permissions
        '--archive',
        // Compress file data during the transfer
        '--compress',
        // Connect via a port number
        // Set the custom identity if provided
        `-e "ssh -p ${port}${
            !isEmpty(sshKeyPath) ? ` -i '${sshKeyPath}'` : ''
        }"`,
    ].join(' ')
    // Build the command string
    return `rsync ${flags} ${fromPath} ${user}@${host}:${toPath}`
}

const getSshPullCommands = ({
    pullFolders,
    user,
    host,
    port,
    appPath,
    sshKeyPath,
}) => {
    // https://download.samba.org/pub/rsync/rsync.html
    const flags = [
        // '--dry-run',
        // Preserve permissions
        '--archive',
        // Compress file data during the transfer
        '--compress',
        // Output a change-summary for all updates
        '--itemize-changes',
        // Ignore misc files
        '--exclude ".git"',
        '--exclude ".env"',
        '--exclude ".DS_Store"',
        // Connect via a port number
        // Set the custom identity if provided
        `-e "ssh -p ${port}${
            !isEmpty(sshKeyPath) ? ` -i '${sshKeyPath}'` : ''
        }"`,
    ].join(' ')
    // Build the final command string from an array of folders
    const rsyncCommands = pullFolders
        .map(item => {
            const rSyncFrom = `${path.join(appPath, item)}/`
            const rSyncTo = `./${item}/`
            // Folders aren't created by rsync natively
            const createFolderCmd = `mkdir -p ${rSyncTo}`
            return [
                `echo '!${item}'`,
                createFolderCmd,
                `rsync ${flags} ${user}@${host}:${rSyncFrom} ${rSyncTo}`,
            ].join(' && ')
        })
        .join(';')
    // Use grep to filter the rsync output
    const greppage = `grep -E '^(!|>|<|\\*)'`
    return `(${rsyncCommands}) | ${greppage}`
}

// Build command to test the SSH connection is setup
const getSshTestCommand = (user, host, port, sshKeyPath) => {
    // Set the custom identity if provided
    const sshKeyString = !isEmpty(sshKeyPath) ? `-i "${sshKeyPath}"` : ''
    return `ssh -p ${port} ${sshKeyString} -o BatchMode=yes -o ConnectTimeout=5 ${user}@${host} echo 'SSH access is setup' 2>&1`
}

// Upload a database over SSH to a remote folder
const pushSshDatabase = async config => {
    const pushDatabaseStatus = await executeCommands(
        getPushDatabaseCommands(config)
    )
    if (pushDatabaseStatus instanceof Error)
        return new Error(
            `There was an issue uploading your local ${colourAttention(
                config.dbName
            )} database\n\n${pushDatabaseStatus}`
        )
    return
}

// Download a database over SSH to a local folder
const getSshDatabase = async ({
    remoteEnv,
    host,
    user,
    port,
    sshAppPath,
    gzipFileName,
    sshKeyPath,
    unzip = false,
}) => {
    const ssh = await getSshInit({
        host: host,
        user: user,
        port: port,
        sshKeyPath: sshKeyPath,
    })
    // If there’s connection issues then return the messages
    if (ssh instanceof Error) return ssh
    // Dump the database and gzip on the remote server
    const zipCommandConfig = {
        host: remoteEnv.DB_SERVER,
        port: remoteEnv.DB_PORT,
        user: remoteEnv.DB_USER,
        password: remoteEnv.DB_PASSWORD,
        database: remoteEnv.DB_DATABASE,
        gzipFilePath: gzipFileName,
    }
    let errorMessage
    await ssh
        .execCommand(getDbDumpZipCommands(zipCommandConfig), {
            cwd: sshAppPath,
        })
        .then(result => {
            const errorOutput = String(result.stderr)
            // There's an error found (mysql makes this check tedious)
            if (errorOutput.toLowerCase().includes('error')) {
                // Close the connection
                ssh.dispose()
                // Format the remote env settings for display
                const remoteSettings = `${colourAttention(
                    `DB_SERVER="${remoteEnv.DB_SERVER}"\nDB_PORT="${remoteEnv.DB_PORT}"\nDB_USER="${zipCommandConfig.user}"\nDB_PASSWORD="${zipCommandConfig.password}"\nDB_DATABASE="${zipCommandConfig.database}"`
                )}\n\n${path.join(sshAppPath, '.env')}`
                // Set the error message
                errorMessage = errorOutput.includes('Unknown MySQL server host')
                    ? `There were issues connecting to the remote database server ${colourAttention(
                          remoteEnv.DB_SERVER
                      )}\nVerify the settings in the remote env are correct:\n\n${remoteSettings}`
                    : errorOutput.includes('Access denied')
                    ? `Couldn’t connect with the remote .env database settings:\n\n${remoteSettings}`
                    : errorOutput
            }
        })
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
    unzip && (await executeCommands(`gzip -df '${downloadTo}'`))
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
    getSshPullCommands,
    pushSshDatabase,
    sshConnect,
}
