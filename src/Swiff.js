import { h, Component, Text } from 'ink'
import { exec } from 'child_process'
import ua from 'universal-analytics'
import resolveUsername from 'username'
import {
    isEmpty,
    executeCommands,
    getMissingPaths,
    cmdPromise,
    doesFileExist,
    commaAmpersander,
} from './utils'
import { pathBackups, pathLocalEnv, pathConfig, configFileName, pathApp, pathMedia } from './paths'
import { getRemoteEnv, setupLocalEnv } from './env'
import { doDropAllDbTables, doImportDb, doLocalDbDump } from './database'
import { OptionsTemplate, MessageTemplate } from './templates'
import {
    getSshInit,
    getSshFile,
    getSshDatabase,
    getSshTestCommand,
    getSshCopyInstructions,
    getSshPushCommands,
} from './ssh'
import { setupConfig, createConfig } from './config'
import {
    hexHighlight,
    hexMuted,
    hexDefault,
    colourNotice,
    colourAttention,
    colourHighlight,
    colourMuted,
    colourDefault,
} from './palette'

// Start user analytics for error and usage information
const visitor = ua('UA-131596357-2', { uid: resolveUsername })

// Get the latest task status to check if running
const isTaskRunning = messages => {
    const currentMessage = messages.slice(-1).pop()
    return currentMessage && currentMessage.type === 'working'
}

class Swiff extends Component {
    constructor(props) {
        super(props)

        this.state = {
            messages: [],
            localEnv: null, // The contents of the remote env file
            remoteEnv: null, // The contents of the remote env file
            config: null, // The contents of the config file
            isFlaggedStart:
                Object.entries(this.props).filter(([k, v]) => v === true)
                    .length > 0, // Whether the app was started with flags
            currentTask: null,
            tasks: [
                {
                    taskId: 'push',
                    emoji: '🚀',
                    title: 'Push',
                    heading: 'Push files',
                    description: `Upload and sync to the remote server from your push folders`,
                },
                {
                    taskId: 'pull',
                    emoji: '📥',
                    title: 'Pull',
                    heading: 'Pull files',
                    description:
                        'Download fresh files on the remote server from your pull folders ',
                },
                {
                    taskId: 'database',
                    emoji: '💫',
                    title: 'Database',
                    heading: 'Database download',
                    description: `Refresh your website database with a remote database`,
                },
                {
                    taskId: 'composer',
                    emoji: '🎩',
                    title: 'Composer',
                    heading: 'Composer download',
                    description:
                        'Refresh your composer files with the remote files',
                },
            ],
        }
    }

    componentDidMount = async () => {
        console.clear()

        // Handle flags - make them run in sync if multiple args used
        if (this.props.push) this.startTaskId('push')
        if (this.props.database) this.startTaskId('database')
        if (this.props.pull) this.startTaskId('pull')
        if (this.props.composer) this.startTaskId('composer')
        if (this.props.backups) this.handleBackupOpen()

        // Deal with incorrect flags
        // TODO: Improve the test here
        const isFlaggedStart = this.state.isFlaggedStart
        if (isFlaggedStart && this.props.push === false && this.props.database === false && this.props.pull === false && this.props.composer === false && this.props.backups === false) {
            this.setMessage(`A supplied flag isn’t recognised\n\nSee a list of flags at:\n${colourAttention('swiff --help')}`)
            return setTimeout(() => process.exit(), 250)
        }
    }

    render(props, { messages, currentTask, tasks, isFlaggedStart }) {
        const OptionsSelectProps = {
            items: tasks,
            onSelect: task => !isTaskRunning(messages) && this.startTask(task),
            itemComponent: ({ emoji, title, description, isSelected }) => {
                const isRunning =
                    currentTask &&
                    currentTask.title === title &&
                    isTaskRunning(messages)
                return (
                    <Text>
                        <Text
                            hex={isSelected ? hexHighlight : hexDefault}
                            bold
                        >{`${isRunning ? '⌛' : emoji}  ${title}`}</Text>
                        <Text hex={hexMuted}>
                            {': '}
                            {description}
                        </Text>
                    </Text>
                )
            },
            indicatorComponent: () => {},
        }

        return (
            <Text>
                {!isFlaggedStart && (
                    <Text dim={isTaskRunning(messages)}>
                        <OptionsTemplate selectProps={OptionsSelectProps} />
                    </Text>
                )}
                {!isEmpty(messages) && (
                    <Text>
                        <MessageTemplate messages={messages} />
                    </Text>
                )}
            </Text>
        )
    }

    startTaskId = id => {
        const tasks = this.state.tasks
        // Get the task information by its id
        const task = tasks.filter(({ taskId }) => taskId === id).shift()
        return this.startTask(task)
    }

    startTask = task => {
        // Define some variables for later
        const { taskId, heading } = task
        const { messages, isFlaggedStart } = this.state
        // Only play the sound when the cli is launched without flags (the sounds are a little too much)
        !isFlaggedStart && exec(`afplay ${pathMedia}/start.mp3`)
        // Reset messages then use the setState callback to start the new task
        this.setState(
            {
                currentTask: task,
                messages: [{ text: heading, type: 'heading' }],
            },
            // Once the state is set use the setState callback to proceed with the task
            async () => {
                // Fire off the usage tracking
                visitor.pageview({ dp: taskId, dt: heading }).send()
                // Let the user know what's happening
                this.setWorking('Performing pre-task checks')
                // Start the setup process
                const isSetup = await this.handleSetup()
                if (isSetup !== true) return
                // Start the chosen task
                if (taskId === 'push') await this.handlePush()
                if (taskId === 'database') await this.handleDatabaseSync()
                if (taskId === 'pull') await this.handlePull()
                if (taskId === 'composer') await this.handleComposerSync()
                // End the process after 500 ticks if started with flags
                if (!isTaskRunning(messages) && isFlaggedStart)
                    setTimeout(() => process.exit(), 500)
            }
        )
    }

    setError = error => {
        // Play the error sound
        exec(`afplay ${pathMedia}/error.wav`)
        // Remove any unneeded error text
        const errorFiltered = String(error).replace('Error: ', '')
        // Add the message to the end of the current list
        this.setState({
            messages: this.state.messages.concat([
                { text: errorFiltered, type: 'error' },
            ]),
        })
        // Send error to GA
        visitor.exception(`Error: ${errorFiltered}`).send()
    }

    setSuccess = success => {
        // Play the success sound
        exec(`afplay ${pathMedia}/success.wav`)
        // Add the message to the end of the current list
        this.setState({
            messages: this.state.messages.concat([
                { text: success, type: 'success' },
            ]),
        })
    }

    setMessage = message => {
        // Play the message sound
        exec(`afplay ${pathMedia}/message.wav`)
        // Remove any unneeded error text
        const messageFiltered = String(message).replace('Error: ', '')
        // Add the message to the end of the current list
        this.setState({
            messages: this.state.messages.concat([
                { text: messageFiltered, type: 'message' },
            ]),
        })
    }

    setWorking = messages => {
        // Add the message to the end of the current list
        this.setState({
            messages: this.state.messages.concat([
                { text: messages, type: 'working' },
            ]),
        })
    }

    handleSetup = async () => {
        // Check for the swiff config
        const doesConfigExist = await doesFileExist(pathConfig)
        // If no config, create it
        if (!doesConfigExist) await createConfig()
        // Get the config
        const config = await setupConfig(!doesConfigExist)
        // If there's any missing config options then open the config file and show the error
        if (config instanceof Error) {
            // Open the config file after a few seconds
            // fail silently because it doesn't matter so much
            setTimeout(async () => await executeCommands(`open '${pathConfig}'`), 2000)
            return this.setMessage(config)
        }
        // Add the config to the global state
        this.setState({ config })
        // Get the users env file
        const localEnv = await setupLocalEnv(this.setMessage)
        // If there's anything wrong with the env then return an error
        if (localEnv instanceof Error) {
            // Open the env file after a few seconds
            // fail silently because it doesn't matter so much
            setTimeout(async () => await executeCommands(`open '${pathLocalEnv}'`), 2000)
            return this.setMessage(localEnv)
        }
        // Add the env to the global state
        this.setState({ localEnv })
        // Check if the key file exists
        // Get the users key we'll be using to connect with
        const user = await resolveUsername()
        const sshKey = !isEmpty(localEnv.SWIFF_CUSTOM_KEY) ? localEnv.SWIFF_CUSTOM_KEY : `/Users/${user}/.ssh/id_rsa`
        const doesSshKeyExist = await doesFileExist(sshKey)
        // If the key isn't found then show a message
        if (!doesSshKeyExist) return this.setMessage(`Your SSH key file wasn’t found\n\nEither create a new one at:\n${colourNotice(sshKey)}\n\nor add the path in your project .env, eg:\nSWIFF_CUSTOM_KEY="/Users/${user}/.ssh/id_rsa"`)
        // Check the users SSH key has been added to the server
        const checkSshSetup = await executeCommands(
            getSshTestCommand(config.server.user, config.server.host)
        )
        // If there's an issue with the connection then give some assistance
        if (checkSshSetup instanceof Error) {
            return this.setMessage(
                `A SSH connection couldn’t be made with these details:\n\n${colourNotice(
                `Server host: ${config.server.host}\nServer user: ${config.server.user}\nSSH key: ${sshKey}`)}\n\n${getSshCopyInstructions(config)}\n\n${isEmpty(localEnv.SWIFF_CUSTOM_KEY) ? `Incorrect SSH key?\nAdd the path in your project .env\neg: SWIFF_CUSTOM_KEY="/Users/${user}/.ssh/id_rsa"` : ''}`
            )
        }
        return true
    }

    handlePush = async () => {
        // Set some variables for later
        const localEnv = this.state.localEnv
        const serverConfig = this.state.config.server
        const pushFolders = this.state.config.pushFolders
        // Get the remote env file via SSH
        const remoteEnv = await getRemoteEnv({ localEnv, serverConfig })
        // If there's any env issues then return the messages
        if (remoteEnv instanceof Error) return this.setError(remoteEnv)
        const { ENVIRONMENT } = remoteEnv
        // Shame the user if they are pushing to production
        if (!isEmpty(ENVIRONMENT) && (ENVIRONMENT === 'production' || ENVIRONMENT === 'live')) this.setMessage(`Bad practice: You’re pushing files straight to production,\nconsider a more reliable way to deploy changes in the future`)
        // Create a list of paths to push
        if (
            pushFolders === undefined ||
            !Array.isArray(pushFolders) ||
            isEmpty(pushFolders.filter(i => i))
        )
            return this.setMessage(
                `First specify some push folders in your ${colourNotice(
                    configFileName
                )}\n\nFor example:\n\n${colourMuted(
                    `{\n  `
                )}pushFolders: [ '${colourNotice(
                    'templates'
                )}', '${colourNotice('config')}', '${colourNotice(
                    'public/assets/build'
                )}' ]\n${colourMuted('}')}`
            )
        // Remove empty values from the array so users can’t accidentally upload the entire project
        const filteredPushFolders = pushFolders.filter(i => i)
        // Check if the defined local paths exist
        const hasMissingPaths = await getMissingPaths(filteredPushFolders, 'pushFolders')
        // If any local paths are missing then return the messages
        if (hasMissingPaths instanceof Error)
            return this.setError(hasMissingPaths)
        // Share what's happening with the user
        this.setWorking(
            `Pushing files in ${commaAmpersander(filteredPushFolders)}`
        )
        // Get the rsync push commands
        const { user, host, appPath } = this.state.config.server
        const { SWIFF_CUSTOM_KEY } = this.state.localEnv
        const pushCommands = getSshPushCommands({
            pushFolders: filteredPushFolders,
            user: user,
            host: host,
            workingDirectory: appPath,
            swiffSshKey: SWIFF_CUSTOM_KEY,
        })
        // Send the commands to the push task
        const pushStatus = await executeCommands(pushCommands)
        // Return the result to the user
        // Filter out the second confirmation message
        return pushStatus instanceof Error
            ? this.setError(
                  `There was an issue uploading the files\n\n${pushStatus}`
              )
            : this.setSuccess(
                  `Your file push to ${colourHighlight(ENVIRONMENT)} was successful\n\n${colourMuted(
                      pushStatus
                          // Remove repeated text
                          .replace('building file list ... done\n\n', '')
                          .replace('building file list ... done\n', '')
                  )}`
              )
    }

    handlePull = async () => {
        const { pullFolders, server } = this.state.config
        const { user, host, appPath } = server
        // Check if the user has defined some pull folders
        if (!Array.isArray(pullFolders) || isEmpty(pullFolders.filter(i => i)))
            return this.setMessage(
                `First specify some pull folders in your ${colourNotice(
                    configFileName
                )}\n\nFor example:\n\n${colourMuted(
                    `{\n  `
                )}pullFolders: [ '${colourNotice(
                    'public/assets/volumes'
                )}' ]\n${colourMuted('}')}`
            )
        // Remove empty values from the array so the user can’t accidentally download the entire remote
        const filteredPullFolders = pullFolders.filter(i => i)
        // Share what's happening with the user
        this.setWorking(
            `Pulling files from ${commaAmpersander(filteredPullFolders)}`
        )
        // Create the rsync commands required to pull the files
        const { SWIFF_CUSTOM_KEY } = this.state.localEnv
        // Set the custom identity if provided
        const customKey = !isEmpty(SWIFF_CUSTOM_KEY)
            ? `-e "ssh -i ${SWIFF_CUSTOM_KEY}"`
            : ''
        const flags = `-avzh ${customKey}`
        const rsyncCommands = filteredPullFolders.map(path => {
            const rSyncFrom = `${appPath}/${path}/*`
            const rSyncTo = `./${path}/`
            return `rsync ${flags} ${user}@${host}:${rSyncFrom} ${rSyncTo}`
        })
        // Execute the rsync pull commands
        const pullStatus = await executeCommands(rsyncCommands.join(';'))
        // Set some variables for later
        const localEnv = this.state.localEnv
        const serverConfig = this.state.config.server
        // Get the remote env file via SSH
        const remoteEnv = await getRemoteEnv({ localEnv, serverConfig })
        // If there's any env issues then return the messages
        if (remoteEnv instanceof Error) return this.setError(remoteEnv)
        const { ENVIRONMENT } = remoteEnv
        return pullStatus instanceof Error
            ? this.setError(
                  `There was an issue downloading the files from ${colourAttention(ENVIRONMENT)} \n\n${colourMuted(
                      String(pullStatus).replace(
                          /No such file or directory/g,
                          colourDefault('No such file or directory')
                      )
                  )}`
              )
            : this.setSuccess(
                  `The file pull from ${colourHighlight(ENVIRONMENT)} was successful\n\n${colourMuted(
                      pullStatus
                          .replace('receiving file list ... done\n\n', '')
                          .replace('receiving file list ... done\n', '')
                  )}`
              )
    }

    handleDatabaseSync = async () => {
        // Set some variables for later
        const localEnv = this.state.localEnv
        const serverConfig = this.state.config.server
        // Get the remote env file via SSH
        const remoteEnv = await getRemoteEnv({ localEnv, serverConfig })
        // If there's any env issues then return the messages
        if (remoteEnv instanceof Error) return this.setError(remoteEnv)
        // Share what's happening with the user
        this.setWorking(
            `Fetching ${colourHighlight(
                remoteEnv.DB_DATABASE
            )} from ${colourHighlight(remoteEnv.ENVIRONMENT)}`
        )
        // Set the remote database variables
        const remoteDbName = `${remoteEnv.DB_DATABASE}-remote.sql`
        const remoteDbNameZipped = `${remoteDbName}.gz`
        const importFile = `${pathBackups}/${remoteDbName}`
        // Download the remote DB via SSH
        const dbSsh = await getSshDatabase({
            remoteEnv: remoteEnv,
            host: serverConfig.host,
            user: serverConfig.user,
            sshAppPath: serverConfig.appPath,
            gzipFileName: remoteDbNameZipped,
            swiffSshKey: localEnv.SWIFF_CUSTOM_KEY,
        })
        // If there's any env issues then return the messages
        if (dbSsh instanceof Error) return this.setError(dbSsh)
        // Backup the existing local database
        const localBackupFilePath = `${pathBackups}/${
            localEnv.DB_DATABASE
        }-local.sql.gz`
        const localDbDump = doLocalDbDump({
            database: localEnv.DB_DATABASE,
            user: localEnv.DB_USER,
            password: localEnv.DB_PASSWORD,
            gzipFilePath: localBackupFilePath,
        })
        // If there's any local db backup issues then return the messages
        if (localDbDump instanceof Error) return this.setError(localDbDump)
        // Share what's happening with the user
        this.setWorking(
            `Updating ${colourHighlight(
                localEnv.DB_DATABASE
            )} on ${colourHighlight(localEnv.DB_SERVER)}`
        )
        // Drop the tables from the local database
        const dropTables = await doDropAllDbTables({
            host: localEnv.DB_SERVER,
            user: localEnv.DB_USER,
            password: localEnv.DB_PASSWORD,
            database: localEnv.DB_DATABASE,
        })
        // If there's any dropping issues then return the messages
        if (dropTables instanceof Error)
            return String(dropTables).includes('ER_BAD_DB_ERROR: Unknown database ')
                ? this.setMessage(`First create a database named ${colourNotice(
                    localEnv.DB_DATABASE
                )} with these login details:\n\nUsername: ${localEnv.DB_USER}\nPassword: ${localEnv.DB_PASSWORD}`)
                : this.setError(`There were issues connecting to your local ${colourAttention(
                    localEnv.DB_DATABASE
                )} database\n\n${colourMuted(String(dropTables).replace('Error: ', ''))}`
            )
        // Import the remote .sql into the local database
        const importDatabase = await doImportDb({
            user: localEnv.DB_USER,
            password: localEnv.DB_PASSWORD,
            database: localEnv.DB_DATABASE,
            importFile: importFile,
        })
        // If there's any import issues then return the messages
        if (importDatabase instanceof Error)
            return this.setError(
                `There were issues refreshing your local ${colourAttention(
                    localEnv.DB_DATABASE
                )} database\n\n${colourMuted(importDatabase)}`
            )
        // Remove remote .sql working file
        await cmdPromise(`rm ${importFile}`).catch(this.setError)
        // Show a success message
        this.setSuccess(
            `Your ${colourHighlight(
                localEnv.DB_DATABASE
            )} database was refreshed with the ${colourHighlight(
                remoteEnv.ENVIRONMENT
            )} database from ${colourHighlight(serverConfig.host)}`
        )
    }

    handleComposerSync = async () => {
        // Set some variables for later
        const serverConfig = this.state.config.server
        const { DB_DATABASE, SWIFF_CUSTOM_KEY } = this.state.localEnv
        // Backup the local composer files
        // I'm letting this command fail silently if the user doesn’t have composer files locally just yet
        await executeCommands(
            `cp composer.json ${pathBackups}/${DB_DATABASE}-local-composer.json && cp composer.lock ${pathBackups}/${DB_DATABASE}-local-composer.lock`
        )
        // Connect to the remote server
        const ssh = await getSshInit({
            host: serverConfig.host,
            user: serverConfig.user,
            swiffSshKey: SWIFF_CUSTOM_KEY,
        })
        // If there's connection issues then return the messages
        if (ssh instanceof Error) return this.setError(ssh)
        // Share what's happening with the user
        this.setWorking(
            `Fetching the files from the remote server at ${colourHighlight(
                serverConfig.host
            )}`
        )
        // Download composer.json from the remote server
        const sshDownload1 = await getSshFile({
            connection: ssh,
            from: `${serverConfig.appPath}/composer.json`,
            to: `${pathApp}/composer.json`,
        })
        // If there's download issues then end the connection and return the messages
        if (sshDownload1 instanceof Error) {
            ssh.dispose()
            return this.setMessage(`Error downloading composer.json\n\n${colourNotice(sshDownload1)}`)
        }
        // Download composer.lock from the remote server
        const sshDownload2 = await getSshFile({
            connection: ssh,
            from: `${serverConfig.appPath}/composer.lock`,
            to: `${pathApp}/composer.lock`,
        })
        // If there's download issues then end the connection and return the messages
        if (sshDownload2 instanceof Error) {
            ssh.dispose()
            return this.setMessage(`Error downloading composer.lock\n\n${colourNotice(sshDownload2)}`)
        }
        // Close the connection
        ssh.dispose()
        // Show a success message
        this.setSuccess(
            `Your local ${colourHighlight(
                'composer.json'
            )} and ${colourHighlight('composer.lock')} were refreshed`
        )
    }

    handleBackupOpen = async () => {
        // Open the backups folder
        const doOpen = await executeCommands(`open '${pathBackups}'`)
        if (doOpen instanceof Error) return this.setError(doOpen)
        this.setSuccess(
            `Opening the backups folder:\n${colourHighlight(pathBackups)}`
        )
        return setTimeout(() => process.exit(), 250)
    }
}

export default Swiff
