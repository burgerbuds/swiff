import { h, Component, Text } from 'ink'
import { exec } from 'child_process'
import ua from 'universal-analytics'
import resolveUsername from 'username'
import path from 'path'
import ssh2 from 'ssh2'
import chalk from 'chalk'
import {
    isEmpty,
    executeCommands,
    getMissingPaths,
    cmdPromise,
    doesFileExist,
    commaAmpersander,
    replaceRsyncOutput,
} from './utils'
import {
    pathBackups,
    pathConfig,
    configFileName,
    pathApp,
    pathMedia,
} from './paths'
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
    getSshPullCommands,
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
const visitor = ua('UA-131596357-2')

// Get the latest task status to check if running
const isTaskRunning = messages => {
    const currentMessage = messages && messages.slice(-1).pop()
    return currentMessage ? currentMessage.type === 'working' : false
}

// Check if the task can be run
const getValidatedTaskFromFlags = (flags, tasks) => {
    // Get a list of all provided flags
    const providedFlags = Object.entries(flags).filter(([k, v]) => v)
    // Get a list of all possible flags
    const taskIdList = Object.entries(tasks).map(([k, v]) => v.id)
    // Get a list of validated flags
    const allowedFlags = providedFlags.filter(([k, v]) =>
        taskIdList.includes(k)
    )
    // Get the first allowed flag
    const validatedTask = !isEmpty(allowedFlags.slice().shift())
        ? allowedFlags.shift()[0]
        : null
    return !isEmpty(validatedTask)
        ? validatedTask
        : new Error(`The provided flag isn’t recognized`)
}

class Swiff extends Component {
    constructor(props) {
        super(props)

        const isFlaggedStart =
            Object.entries(this.props.flags).filter(([k, v]) => v).length > 0

        this.state = {
            messages: [],
            localEnv: null, // The contents of the remote env file
            remoteEnv: null, // The contents of the remote env file
            config: null, // The contents of the config file
            isFlaggedStart: isFlaggedStart, // Whether the app was started with flags
            tasks: this.getTaskList(),
            currentTask: null,
            showMoreTasks: false,
            removeOptions: false,
        }
    }

    componentDidMount = async () => {
        // Start with a blank slate
        console.clear()
        const { flags, tasks, taskHelp } = this.props
        // Exit early and start interface if there's no flags set
        if (Object.entries(flags).every(([k, v]) => !v)) {
            // Listen for keypress
            process.stdin.on('keypress', this.handleKeyPress)
            return
        }
        // Check if the task can be run
        const validatedTask = getValidatedTaskFromFlags(flags, tasks)
        // Let the user know if their flag isn't correct
        if (validatedTask instanceof Error) {
            this.setError(`${colourAttention(validatedTask)}\n${taskHelp}`)
            return setTimeout(() => process.exit(), 250)
        }
        // Start the task
        if (!isEmpty(validatedTask)) {
            return this.startTaskId(validatedTask)
        }
    }

    handleKeyPress = (ch, key = {}) => {
        const isArrowKey = ['left', 'right'].includes(key.name)
        if (isArrowKey) this.toggleTaskPage()
        return
    }

    render(
        props,
        { messages, currentTask, tasks, isFlaggedStart, removeOptions }
    ) {
        const OptionsSelectProps = {
            items: tasks,
            onSelect: task =>
                task.id === 'toggle'
                    ? this.toggleTaskPage()
                    : !isTaskRunning(messages) && this.startTask(task),
            itemComponent: ({ emoji, title, description, isSelected }) => {
                const isActive =
                    currentTask &&
                    currentTask.title === title &&
                    isTaskRunning(messages)
                return (
                    <Text>
                        <Text
                            hex={
                                isSelected
                                    ? hexHighlight
                                    : emoji
                                    ? hexDefault
                                    : '#777'
                            }
                            bold={emoji}
                        >{`${
                            isActive ? '⌛  ' : emoji ? `${emoji}  ` : ''
                        }${title}`}</Text>
                        <Text hex={hexMuted}>
                            {description && `: ${description}`}
                        </Text>
                    </Text>
                )
            },
            indicatorComponent: () => {},
        }
        const showOptions = !isFlaggedStart && !removeOptions
        return (
            <Text>
                {showOptions ? (
                    <Text dim={isTaskRunning(messages)}>
                        <OptionsTemplate selectProps={OptionsSelectProps} />
                        <br/>
                    </Text>
                ) : null}
                {!isEmpty(messages) && (
                    <MessageTemplate
                        messages={messages}
                        isFlaggedStart={isFlaggedStart}
                    />
                )}
            </Text>
        )
    }

    startTaskId = taskId => {
        const tasks = this.props.tasks
        // Get the task information by its id
        const task = tasks.filter(({ id }) => id === taskId).shift()
        return this.startTask(task)
    }

    startTask = taskData => {
        const { id, emoji, heading, handler, needsSetup, fullscreen } = taskData
        const { messages, isFlaggedStart } = this.state
        // Only play the sound when the cli is launched without flags (the sounds can be too much)
        !isFlaggedStart && exec(`afplay ${pathMedia}/start.mp3`)
        // Reset messages then use the setState callback to start the new task
        this.setState(
            {
                currentTask: taskData,
                messages: [
                    {
                        text: isFlaggedStart ? `${emoji}  ${heading}` : heading,
                        type: 'heading',
                    },
                ],
            },
            // Once the state is set proceed with the task
            async () => {
                // Fire off the usage tracking
                visitor.pageview({ dp: id, dt: heading }).send()
                if (needsSetup) {
                    // Let the user know what's happening
                    this.setWorking('Performing pre-task checks')
                    // Start the setup process
                    const isSetup = await this.handleSetup()
                    if (isSetup !== true) {
                        // End the process after 500 ticks if started with flags
                        return !isTaskRunning(messages) &&
                            isFlaggedStart &&
                            !fullscreen
                            ? setTimeout(() => process.exit(), 500)
                            : null
                    }
                }
                // Start the chosen task
                await this[handler]()
                // End the process after 500 ticks if started with flags
                if (!isTaskRunning(messages) && isFlaggedStart && !fullscreen)
                    // Wait a little to allow setState to finish
                    setTimeout(() => process.exit(), 500)
            }
        )
    }

    toggleTaskPage = () => {
        const { showMoreTasks } = this.state
        this.setState({
            tasks: this.getTaskList(!showMoreTasks),
            showMoreTasks: !showMoreTasks,
        })
    }

    getTaskList = showAll => {
        const tasks = this.props.tasks.slice()
        const newTasks = tasks.filter(task =>
            showAll ? !task.isListed : task.isListed
        )
        const hollowDot = '○'
        const solidDot = chalk.hex('#777')('●')
        newTasks.push({
            id: 'toggle',
            title: (
                showAll
                    ? `   ${hollowDot} ${solidDot}`
                    : `   ${solidDot} ${hollowDot}`
            ),
        })
        return newTasks
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
        // Check if the config exists
        const doesConfigExist = await doesFileExist(pathConfig)
        // If no config, create it
        if (!doesConfigExist) await createConfig()
        const isInteractive = !this.state.isFlaggedStart
        // Get the config
        // TODO: Convert to named parameters
        const config = await setupConfig(!doesConfigExist, isInteractive)
        // If there's any missing config options then open the config file and show the error
        if (config instanceof Error) return this.setMessage(config)
        // Add the config to the global state
        this.setState({ config })
        // Get the users env file
        const localEnv = await setupLocalEnv(isInteractive)
        // If there's anything wrong with the env then return an error
        if (localEnv instanceof Error) return this.setMessage(localEnv)
        // Add the env to the global state
        this.setState({ localEnv })
        // Get the users key we'll be using to connect with
        const user = await resolveUsername()
        // Check if the key file exists
        const sshKey = !isEmpty(localEnv.SWIFF_CUSTOM_KEY)
            ? localEnv.SWIFF_CUSTOM_KEY
            : `/Users/${user}/.ssh/id_rsa`
        const doesSshKeyExist = await doesFileExist(sshKey)
        // If the key isn't found then show a message
        if (!doesSshKeyExist)
            return this.setMessage(
                `Your${
                    !isEmpty(localEnv.SWIFF_CUSTOM_KEY) ? ' custom' : ''
                } SSH key file wasn’t found at:\n  ${colourNotice(
                    sshKey
                )}\n\nYou can either:\n\na) Create a SSH key with this command (leave passphrase empty):\n  ${colourNotice(
                    `ssh-keygen -m PEM -b 4096 -f ${sshKey}`
                )}\n\nb) Or add an existing key path in your .env with:\n  ${colourNotice(
                    `SWIFF_CUSTOM_KEY="/Users/${user}/.ssh/[your-key-name]"`
                )}${
                    isInteractive
                        ? `\n\nThen hit [ enter ↵ ] to rerun this task`
                        : ''
                }`
            )
        // Check the users SSH key has been added to the server
        const checkSshSetup = await executeCommands(
            getSshTestCommand(
                config.server.user,
                config.server.host,
                config.server.port,
                !isEmpty(localEnv.SWIFF_CUSTOM_KEY)
                    ? localEnv.SWIFF_CUSTOM_KEY
                    : null
            )
        )
        // If there's an issue with the connection then give some assistance
        if (checkSshSetup instanceof Error) {
            return this.setMessage(
                `A SSH connection couldn’t be made with these details:\n\nServer host: ${
                    config.server.host
                }\nServer user: ${config.server.user}\nPort: ${
                    config.server.port
                }\nSSH key: ${sshKey}\n\n${getSshCopyInstructions(
                    config,
                    sshKey
                )}\n\n${
                    isEmpty(localEnv.SWIFF_CUSTOM_KEY)
                        ? `${chalk.bold(
                              `Is the SSH key above incorrect?`
                          )}\nAdd the path to your project .env\neg: SWIFF_CUSTOM_KEY="/Users/${user}/.ssh/id_rsa"`
                        : ''
                }`
            )
        }
        return true
    }

    handlePull = async () => {
        const { pullFolders, server } = this.state.config
        const { user, host, appPath, port } = server
        const localEnv = this.state.localEnv
        const { SWIFF_CUSTOM_KEY } = localEnv
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
        const pullCommands = getSshPullCommands({
            pullFolders: filteredPullFolders,
            user: user,
            host: host,
            port: port,
            appPath: appPath,
            sshKeyPath: SWIFF_CUSTOM_KEY,
        })
        // Get the remote env file via SSH
        const remoteEnv = await getRemoteEnv({
            serverConfig: server,
            isInteractive: this.state.isFlaggedStart,
            sshKeyPath: SWIFF_CUSTOM_KEY,
        })
        // If the env can't be found then show a message
        if (remoteEnv instanceof Error) {
            this.setWorking(
                colourNotice(
                    `Consider adding an .env file on the remote server\n   at ${path.join(appPath, '.env')}`
                )
            )
        }
        // Set the name of the remote environment
        let remoteEnvironment = ''
        if (!(remoteEnv instanceof Error))
            remoteEnvironment = remoteEnv.ENVIRONMENT
        // Send the pull commands
        const pullStatus = await executeCommands(pullCommands)
        if (pullStatus instanceof Error) {
            return this.setError(
                `There was an issue downloading the files${
                    !isEmpty(remoteEnvironment)
                        ? ` from ${colourAttention(remoteEnvironment)}`
                        : ''
                }\n\n${colourMuted(
                    String(pullStatus).replace(
                        /No such file or directory/g,
                        colourDefault('No such file or directory')
                    )
                )}`
            )
        }
        const output = replaceRsyncOutput(pullStatus, filteredPullFolders)
        return this.setSuccess(
            isEmpty(output)
                ? `No pull required, ${colourHighlight(
                      localEnv.DB_SERVER
                  )} is already up-to-date!`
                : `Success! These are the local files that changed:\n${output}\n\nThe file pull${
                      !isEmpty(remoteEnvironment)
                          ? ` from ${colourHighlight(remoteEnvironment)}`
                          : ''
                  } was successful`
        )
    }

    handlePush = async () => {
        // Set some variables for later
        const localEnv = this.state.localEnv
        const { SWIFF_CUSTOM_KEY } = localEnv
        const { pushFolders } = this.state.config
        const serverConfig = this.state.config.server
        const { user, host, appPath, port } = serverConfig
        // Get the remote env file via SSH
        const remoteEnv = await getRemoteEnv({
            serverConfig,
            isInteractive: this.state.isFlaggedStart,
            sshKeyPath: SWIFF_CUSTOM_KEY,
        })
        // If the env can't be found then show a message
        if (remoteEnv instanceof Error) {
            this.setWorking(
                colourNotice(
                    `Consider adding an .env file on the remote server\n   at ${path.join(appPath, '.env')}`
                )
            )
        }
        // Set the name of the remote environment
        let remoteEnvironment = ''
        if (!(remoteEnv instanceof Error))
            remoteEnvironment = remoteEnv.ENVIRONMENT
        // Shame the user if they are pushing to production
        if (
            !isEmpty(remoteEnvironment) &&
            (remoteEnvironment === 'production' || remoteEnvironment === 'live')
        )
            this.setWorking(
                colourNotice(
                    `You’re pushing files straight to production,\nplease consider a more reliable way to deploy changes in the future`
                )
            )
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
        const hasMissingPaths = await getMissingPaths(
            filteredPushFolders,
            'pushFolders'
        )
        // If any local paths are missing then return the messages
        if (hasMissingPaths instanceof Error)
            return this.setError(hasMissingPaths)
        // Share what's happening with the user
        this.setWorking(
            `Pushing files in ${commaAmpersander(filteredPushFolders)}`
        )
        // Get the rsync push commands
        const pushCommands = getSshPushCommands({
            pushFolders: filteredPushFolders,
            user: user,
            host: host,
            port: port,
            workingDirectory: appPath,
            sshKeyPath: SWIFF_CUSTOM_KEY,
        })
        // Send the commands to the push task
        const pushStatus = await executeCommands(pushCommands)
        // Return the result to the user
        if (pushStatus instanceof Error) {
            return this.setError(
                `There was an issue uploading the files\n\n${pushStatus}`
            )
        }
        const output = replaceRsyncOutput(
            pushStatus,
            this.state.config.pushFolders
        )
        return this.setSuccess(
            isEmpty(output)
                ? `No push required, ${
                      !isEmpty(remoteEnvironment)
                          ? `${colourHighlight(remoteEnvironment)}`
                          : 'the remote'
                  } is already up-to-date`
                : `Success! These are the remote files that changed:\n${output}\n\nThe file push${
                      !isEmpty(remoteEnvironment)
                          ? ` from ${colourHighlight(remoteEnvironment)}`
                          : ''
                  } was successful`
        )
    }

    handleDatabase = async () => {
        // Set some variables for later
        const localEnv = this.state.localEnv
        const serverConfig = this.state.config.server
        const {
            SWIFF_CUSTOM_KEY,
            DB_SERVER,
            DB_PORT,
            DB_DATABASE,
            DB_USER,
            DB_PASSWORD,
        } = localEnv
        // Get the remote env file via SSH
        const remoteEnv = await getRemoteEnv({
            serverConfig,
            isInteractive: this.state.isFlaggedStart,
            sshKeyPath: SWIFF_CUSTOM_KEY,
        })
        // If the env can't be found then return a message
        if (remoteEnv instanceof Error) return this.setMessage(remoteEnv)
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
            port: serverConfig.port,
            sshAppPath: serverConfig.appPath,
            gzipFileName: remoteDbNameZipped,
            sshKeyPath: SWIFF_CUSTOM_KEY,
        })
        // If there's any env issues then return the messages
        if (dbSsh instanceof Error) return this.setError(dbSsh)
        // Backup the existing local database
        const localBackupFilePath = `${pathBackups}/${DB_DATABASE}-local.sql.gz`
        const localDbDump = await doLocalDbDump({
            host: DB_SERVER,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_DATABASE,
            gzipFilePath: localBackupFilePath,
        })
        // If there's any local db backup issues then return the messages
        if (localDbDump instanceof Error) return this.setError(localDbDump)
        // Share what's happening with the user
        this.setWorking(
            `Updating ${colourHighlight(DB_DATABASE)} on ${colourHighlight(
                DB_SERVER
            )}`
        )
        // Drop the tables from the local database
        const dropTables = await doDropAllDbTables({
            host: DB_SERVER,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_DATABASE,
        })
        // If there's any dropping issues then return the messages
        if (dropTables instanceof Error)
            return String(dropTables).includes(
                'ER_BAD_DB_ERROR: Unknown database '
            )
                ? this.setMessage(
                      `First create a database named ${colourNotice(DB_DATABASE)} on ${colourNotice(DB_SERVER)} with these login details:\n\nUsername: ${DB_USER}\nPassword: ${DB_PASSWORD}`
                  )
                : this.setError(
                      `There were issues connecting to your local ${colourAttention(
                          DB_DATABASE
                      )} database\n\nCheck these settings are correct in your local .env file:\n\n${colourAttention(`DB_SERVER="${DB_SERVER}"\nDB_PORT="${DB_PORT}"\nDB_USER="${DB_USER}"\nDB_PASSWORD="${DB_PASSWORD}"\nDB_DATABASE="${DB_DATABASE}"`)}\n\n${colourMuted(
                          String(dropTables).replace('Error: ', '')
                      )}`
                  )
        // Import the remote .sql into the local database
        const importDatabase = await doImportDb({
            host: DB_SERVER,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_DATABASE,
            importFile: importFile,
        })
        // If there's any import issues then return the messages
        if (importDatabase instanceof Error)
            return this.setError(
                `There were issues refreshing your local ${colourAttention(
                    DB_DATABASE
                )} database\n\n${colourMuted(importDatabase)}`
            )
        // Remove remote .sql working file
        await cmdPromise(`rm ${importFile}`).catch(this.setError)
        // Show a success message
        this.setSuccess(
            `Your ${colourHighlight(
                DB_DATABASE
            )} database was refreshed with the ${colourHighlight(
                remoteEnv.ENVIRONMENT
            )} database from ${colourHighlight(serverConfig.host)}`
        )
    }

    handleComposer = async () => {
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
            sshKeyPath: SWIFF_CUSTOM_KEY,
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
            from: path.join(serverConfig.appPath, 'composer.json'),
            to: path.join(pathApp, 'composer.json'),
        })
        // If there's download issues then end the connection and return the messages
        if (sshDownload1 instanceof Error) {
            ssh.dispose()
            return this.setMessage(
                `Error downloading composer.json\n\n${colourNotice(
                    sshDownload1
                )}`
            )
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
            return this.setMessage(
                `Error downloading composer.lock\n\n${colourNotice(
                    sshDownload2
                )}`
            )
        }
        // Close the connection
        ssh.dispose()
        // Show a success message
        return this.setSuccess(
            `Your local ${colourHighlight(
                'composer.json'
            )} and ${colourHighlight('composer.lock')} were refreshed`
        )
    }

    // Open the backups folder
    handleOpenBackups = async () => {
        const doOpen = await executeCommands(`open '${pathBackups}'`)
        if (doOpen instanceof Error) return this.setError(doOpen)
        this.setWorking(`Opening the backups folder`)
        setTimeout(
            () =>
                this.setSuccess(
                    `The backups folder was opened\n  ${pathBackups}`
                ),
            500
        )
        return
    }

    // Connect to the server via SSH
    handleSsh = async () => {
        // Clear the messages so they don't display in our interactive session
        this.setState({ messages: null, removeOptions: true })
        // Set some variables for later
        const serverConfig = this.state.config.server
        const { SWIFF_CUSTOM_KEY } = this.state.localEnv
        // Get the users key we'll be using to connect with
        const user = await resolveUsername()
        // Check if the key file exists
        const privateKey = !isEmpty(SWIFF_CUSTOM_KEY)
            ? SWIFF_CUSTOM_KEY
            : `/Users/${user}/.ssh/id_rsa`
        // Create an interactive shell session
        // https://github.com/mscdex/ssh2#start-an-interactive-shell-session
        let gs = null
        const conn = new ssh2()
        conn.on('ready', () => {
            conn.shell((err, stream) => {
                if (err) throw err
                // Build the commands to run once we're logged in
                const initialCommands = [
                    `cd ${serverConfig.appPath}`,
                    'clear',
                    'll',
                    `echo "\n💁  You're now connected with: ${
                        serverConfig.user
                    }@${serverConfig.host}\nWorking directory: ${
                        serverConfig.appPath
                    }\n"`,
                ].join(' && ')
                // Run the commands
                stream.write(`${initialCommands}\n`)
                stream
                    .on('close', () => {
                        console.log(
                            colourHighlight(
                                '\n💁  Your SSH connection ended, bye!\n'
                            )
                        )
                        conn.end()
                        process.exit()
                    })
                    .on('data', data => {
                        // Push the server output to our console
                        if (!gs) gs = stream
                        if (gs._writableState.sync == false)
                            process.stdout.write('' + data)
                    })
                    .stderr.on('data', data => {
                        console.log('STDERR: ' + data)
                        process.exit(1)
                    })
            })
        }).connect({
            host: serverConfig.host,
            privateKey: require('fs').readFileSync(privateKey),
            username: serverConfig.user,
            port: serverConfig.port,
        })
        // Push our input to the server input
        // http://stackoverflow.com/questions/5006821/nodejs-how-to-read-keystrokes-from-stdin
        const stdin = process.stdin
        // Without this, we would only get streams once enter is pressed
        stdin.setRawMode(true)
        // Resume stdin in the parent process (node app won't quit all by itself unless an error or process.exit() happens)
        stdin.resume()
        // No binary
        stdin.setEncoding('utf8')
        // On any data into stdin
        stdin.on('data', key => {
            // Write the key to stdout
            if (gs) gs.write('' + key)
        })
    }
}

export default Swiff
