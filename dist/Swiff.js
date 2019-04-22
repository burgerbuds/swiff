"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _ink = require("ink");

var _child_process = require("child_process");

var _universalAnalytics = _interopRequireDefault(require("universal-analytics"));

var _username = _interopRequireDefault(require("username"));

var _path = _interopRequireDefault(require("path"));

var _ssh = _interopRequireDefault(require("ssh2"));

var _chalk = _interopRequireDefault(require("chalk"));

var _utils = require("./utils");

var _paths = require("./paths");

var _env = require("./env");

var _database = require("./database");

var _templates = require("./templates");

var _ssh2 = require("./ssh");

var _config = require("./config");

var _palette = require("./palette");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// Start user analytics for error and usage information
const visitor = (0, _universalAnalytics.default)('UA-131596357-2'); // Get the latest task status to check if running

const isTaskRunning = messages => {
  const currentMessage = messages && messages.slice(-1).pop();
  return currentMessage ? currentMessage.type === 'working' : false;
}; // Check if the task can be run


const getValidatedTaskFromFlags = (flags, tasks) => {
  // Get a list of all provided flags
  const providedFlags = Object.entries(flags).filter(([k, v]) => v); // Get a list of all possible flags

  const taskIdList = Object.entries(tasks).map(([k, v]) => v.id); // Get a list of validated flags

  const allowedFlags = providedFlags.filter(([k, v]) => taskIdList.includes(k)); // Get the first allowed flag

  const validatedTask = !(0, _utils.isEmpty)(allowedFlags.slice().shift()) ? allowedFlags.shift()[0] : null;
  return !(0, _utils.isEmpty)(validatedTask) ? validatedTask : new Error(`Oops, I don't understand those flags`);
};

class Swiff extends _ink.Component {
  constructor(props) {
    var _this;

    super(props);
    _this = this;

    _defineProperty(this, "componentDidMount",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // Start with a blank slate
      console.clear();
      const {
        flags,
        tasks,
        taskHelp
      } = _this.props; // Exit early and start interface if there's no flags set

      if (Object.values(flags).every(v => !v)) {
        // Listen for keypress
        process.stdin.on('keypress', _this.handleKeyPress);
        return;
      }

      _this.changeTaskPage(); // Check if the task can be run


      const validatedTask = getValidatedTaskFromFlags(flags, tasks); // Let the user know if their flag isn't correct

      if (validatedTask instanceof Error) {
        _this.setError(`${(0, _palette.colourAttention)(validatedTask)}\n${taskHelp}`);

        return setTimeout(() => process.exit(), 250);
      } // Start the task


      if (!(0, _utils.isEmpty)(validatedTask)) {
        return _this.startTaskId(validatedTask);
      }
    }));

    _defineProperty(this, "handleKeyPress", (ch, key = {}) => {
      if ('left' === key.name) return this.changeTaskPage(false);
      if ('right' === key.name) return this.changeTaskPage();
      return;
    });

    _defineProperty(this, "startTaskId", taskId => {
      const tasks = this.props.tasks; // Get the task information by its id

      const task = tasks.filter(({
        id
      }) => id === taskId).shift();
      return this.startTask(task);
    });

    _defineProperty(this, "startTask", taskData => {
      const {
        id,
        emoji,
        heading,
        handler,
        needsSetup,
        fullscreen
      } = taskData;
      const {
        messages,
        isFlaggedStart
      } = this.state; // Only play the sound when the cli is launched without flags (the sounds can be too much)

      !isFlaggedStart && (0, _child_process.exec)(`afplay ${_paths.pathMedia}/start.mp3`); // Reset messages then use the setState callback to start the new task

      this.setState({
        currentTask: taskData,
        messages: [{
          text: isFlaggedStart ? `${emoji}  ${heading}` : heading,
          type: 'heading'
        }]
      },
      /*#__PURE__*/
      // Once the state is set proceed with the task
      _asyncToGenerator(function* () {
        // Fire off the usage tracking
        visitor.pageview({
          dp: id,
          dt: heading
        }).send();

        if (needsSetup) {
          // Let the user know what's happening
          _this.setWorking('Performing pre-task checks'); // Start the setup process


          const isSetup = yield _this.handleSetup();

          if (isSetup !== true) {
            // End the process after 500 ticks if started with flags
            return !isTaskRunning(messages) && isFlaggedStart && !fullscreen ? setTimeout(() => process.exit(), 500) : null;
          }
        } // Start the chosen task


        yield _this[handler](); // End the process after 500 ticks if started with flags

        if (!isTaskRunning(messages) && isFlaggedStart && !fullscreen) // Wait a little to allow setState to finish
          setTimeout(() => process.exit(), 500);
      }));
    });

    _defineProperty(this, "getTasksListed", () => this.props.tasks.slice().filter(task => task.isListed));

    _defineProperty(this, "getTasksPaginated", (allTasks, currentPage) => {
      const {
        startIndex,
        endIndex,
        pages
      } = (0, _utils.paginate)({
        totalItems: allTasks.length,
        currentPage: currentPage,
        pageSize: 3
      }); // Get the tasks for the next/prev page

      const tasks = allTasks.slice(startIndex, endIndex + 1); // Add the pagination dots

      const paginationDots = pages.map((page, index) => page === currentPage ? _chalk.default.hex('#777')('●') : index + 1 === currentPage + 1 || index + 1 === 1 && currentPage === pages.length ? '○' : _chalk.default.hex('#777')('○')).join(' '); // Add the dots to the task list

      const tasksWithPagination = pages.length > 1 ? tasks.slice().concat([{
        id: 'toggle',
        title: `   ${paginationDots}`
      }]) : tasks;
      return {
        newTasks: tasksWithPagination,
        newPages: pages
      };
    });

    _defineProperty(this, "getNewTaskPage", (currentPage, pageLength, isForwards) => isForwards ? currentPage >= pageLength ? 1 : currentPage + 1 : currentPage === 1 ? pageLength : currentPage - 1);

    _defineProperty(this, "changeTaskPage", (isForwards = true) => {
      const {
        currentPage,
        pages
      } = this.state;
      const newCurrentPage = this.getNewTaskPage(currentPage, pages.length, isForwards);
      const {
        newTasks,
        newPages
      } = this.getTasksPaginated(this.getTasksListed(), newCurrentPage);
      this.setState({
        tasks: newTasks,
        pages: newPages,
        currentPage: newCurrentPage
      });
    });

    _defineProperty(this, "setError", error => {
      // Play the error sound
      (0, _child_process.exec)(`afplay ${_paths.pathMedia}/error.wav`); // Remove any unneeded error text

      const errorFiltered = String(error).replace('Error: ', ''); // Add the message to the end of the current list

      this.setState({
        messages: this.state.messages.concat([{
          text: errorFiltered,
          type: 'error'
        }])
      }); // Send error to GA

      visitor.exception(`Error: ${errorFiltered}`).send();
    });

    _defineProperty(this, "setSuccess", success => {
      // Play the success sound
      (0, _child_process.exec)(`afplay ${_paths.pathMedia}/success.wav`); // Add the message to the end of the current list

      this.setState({
        messages: this.state.messages.concat([{
          text: success,
          type: 'success'
        }])
      });
    });

    _defineProperty(this, "setMessage", message => {
      // Play the message sound
      (0, _child_process.exec)(`afplay ${_paths.pathMedia}/message.wav`); // Remove any unneeded error text

      const messageFiltered = String(message).replace('Error: ', ''); // Add the message to the end of the current list

      this.setState({
        messages: this.state.messages.concat([{
          text: messageFiltered,
          type: 'message'
        }])
      });
    });

    _defineProperty(this, "setWorking", messages => {
      // Add the message to the end of the current list
      this.setState({
        messages: this.state.messages.concat([{
          text: messages,
          type: 'working'
        }])
      });
    });

    _defineProperty(this, "handleSetup",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // TODO: Check if package.json exists
      // If no package.json or .git folder, notify that you may be in the wrong directory
      // ...
      // Check if the config exists
      const doesConfigExist = yield (0, _utils.doesFileExist)(_paths.pathConfig); // If no config, create it

      if (!doesConfigExist) yield (0, _config.createConfig)();
      const isInteractive = !_this.state.isFlaggedStart; // Get the config
      // TODO: Convert to named parameters

      const config = yield (0, _config.setupConfig)(!doesConfigExist, isInteractive); // If there's any missing config options then open the config file and show the error

      if (config instanceof Error) return _this.setMessage(config); // Add the config to the global state

      _this.setState({
        config
      }); // Get the users env file


      const localEnv = yield (0, _env.setupLocalEnv)(isInteractive); // If there's anything wrong with the env then return an error

      if (localEnv instanceof Error) return _this.setMessage(localEnv); // Add the env to the global state

      _this.setState({
        localEnv
      }); // Get the users key we'll be using to connect with


      const user = yield (0, _username.default)(); // Check if the key file exists

      const sshKey = !(0, _utils.isEmpty)(localEnv.SWIFF_CUSTOM_KEY) ? localEnv.SWIFF_CUSTOM_KEY : `/Users/${user}/.ssh/id_rsa`;
      const doesSshKeyExist = yield (0, _utils.doesFileExist)(sshKey); // If the key isn't found then show a message

      if (!doesSshKeyExist) return _this.setMessage(`Your${!(0, _utils.isEmpty)(localEnv.SWIFF_CUSTOM_KEY) ? ' custom' : ''} SSH key file wasn’t found at:\n  ${(0, _palette.colourNotice)(sshKey)}\n\nYou can either:\n\na) Create a SSH key with this command (leave passphrase empty):\n  ${(0, _palette.colourNotice)(`ssh-keygen -m PEM -b 4096 -f ${sshKey}`)}\n\nb) Or add an existing key path in your .env with:\n  ${(0, _palette.colourNotice)(`SWIFF_CUSTOM_KEY="/Users/${user}/.ssh/[your-key-name]"`)}${isInteractive ? `\n\nThen hit [ enter ↵ ] to rerun this task` : ''}`); // Check the users SSH key has been added to the server

      const checkSshSetup = yield (0, _utils.executeCommands)((0, _ssh2.getSshTestCommand)(config.server.user, config.server.host, config.server.port, !(0, _utils.isEmpty)(localEnv.SWIFF_CUSTOM_KEY) ? localEnv.SWIFF_CUSTOM_KEY : null)); // If there's an issue with the connection then give some assistance

      if (checkSshSetup instanceof Error) {
        return _this.setMessage(`A SSH connection couldn’t be made with these details:\n\nServer host: ${config.server.host}\nServer user: ${config.server.user}\nPort: ${config.server.port}\nSSH key: ${sshKey}\n\n${(0, _ssh2.getSshCopyInstructions)(config, sshKey)}\n\n${(0, _utils.isEmpty)(localEnv.SWIFF_CUSTOM_KEY) ? `${_chalk.default.bold(`Is the 'SSH key' path above wrong?`)}\nAdd the correct path to your project .env like this:\nSWIFF_CUSTOM_KEY="/Users/${user}/.ssh/id_rsa"` : ''}`);
      }

      return true;
    }));

    _defineProperty(this, "handlePullFolders",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      const {
        pullFolders,
        server
      } = _this.state.config;
      const {
        user,
        host,
        appPath,
        port
      } = server;
      const localEnv = _this.state.localEnv;
      const {
        SWIFF_CUSTOM_KEY
      } = localEnv; // Check if the user has defined some pull folders

      if (!Array.isArray(pullFolders) || (0, _utils.isEmpty)(pullFolders.filter(i => i))) return _this.setMessage(`First specify some pull folders in your ${(0, _palette.colourNotice)(_paths.configFileName)}\n\nFor example:\n\n${(0, _palette.colourMuted)(`{\n  `)}pullFolders: [ '${(0, _palette.colourNotice)('public/assets/volumes')}' ]\n${(0, _palette.colourMuted)('}')}`); // Remove empty values from the array so the user can’t accidentally download the entire remote

      const filteredPullFolders = pullFolders.filter(i => i); // Share what's happening with the user

      _this.setWorking(`Pulling files from ${(0, _utils.commaAmpersander)(filteredPullFolders)}`); // Create the rsync commands required to pull the files


      const pullCommands = (0, _ssh2.getSshPullCommands)({
        pullFolders: filteredPullFolders,
        user: user,
        host: host,
        port: port,
        appPath: appPath,
        sshKeyPath: SWIFF_CUSTOM_KEY
      }); // Get the remote env file via SSH

      const remoteEnv = yield (0, _env.getRemoteEnv)({
        serverConfig: server,
        isInteractive: _this.state.isFlaggedStart,
        sshKeyPath: SWIFF_CUSTOM_KEY
      }); // If the env can't be found then show a message

      if (remoteEnv instanceof Error) {
        _this.setWorking((0, _palette.colourNotice)(`Consider adding an .env file on the remote server\n   at ${_path.default.join(appPath, '.env')}`));
      } // Set the name of the remote environment


      let remoteEnvironment = '';
      if (!(remoteEnv instanceof Error)) remoteEnvironment = remoteEnv.ENVIRONMENT; // Send the pull commands

      const pullStatus = yield (0, _utils.executeCommands)(pullCommands);

      if (pullStatus instanceof Error) {
        return _this.setError(`There was an issue downloading the files${!(0, _utils.isEmpty)(remoteEnvironment) ? ` from ${(0, _palette.colourAttention)(remoteEnvironment)}` : ''}\n\n${(0, _palette.colourMuted)(String(pullStatus).replace(/No such file or directory/g, (0, _palette.colourDefault)('No such file or directory')))}`);
      }

      const output = (0, _utils.replaceRsyncOutput)(pullStatus, filteredPullFolders);
      return _this.setSuccess((0, _utils.isEmpty)(output) ? `No pull required, ${(0, _palette.colourHighlight)(localEnv.DB_SERVER)} is already up-to-date!` : `Success! These are the local files that changed:\n${output}\n\nThe file pull${!(0, _utils.isEmpty)(remoteEnvironment) ? ` from ${(0, _palette.colourHighlight)(remoteEnvironment)}` : ''} was successful`);
    }));

    _defineProperty(this, "handlePushFolders",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // Set some variables for later
      const localEnv = _this.state.localEnv;
      const {
        SWIFF_CUSTOM_KEY
      } = localEnv;
      const {
        pushFolders
      } = _this.state.config;
      const serverConfig = _this.state.config.server;
      const {
        user,
        host,
        appPath,
        port
      } = serverConfig; // Get the remote env file via SSH

      const remoteEnv = yield (0, _env.getRemoteEnv)({
        serverConfig,
        isInteractive: _this.state.isFlaggedStart,
        sshKeyPath: SWIFF_CUSTOM_KEY
      }); // If the env can't be found then show a message

      if (remoteEnv instanceof Error) {
        _this.setWorking((0, _palette.colourNotice)(`Consider adding an .env file on the remote server\n   at ${_path.default.join(appPath, '.env')}`));
      } // Set the name of the remote environment


      let remoteEnvironment = '';
      if (!(remoteEnv instanceof Error)) remoteEnvironment = remoteEnv.ENVIRONMENT; // Shame the user if they are pushing to production

      if (!(0, _utils.isEmpty)(remoteEnvironment) && (remoteEnvironment === 'production' || remoteEnvironment === 'live')) _this.setWorking((0, _palette.colourNotice)(`You’re pushing files straight to production,\nplease consider a more reliable way to deploy changes in the future`)); // Create a list of paths to push

      if (pushFolders === undefined || !Array.isArray(pushFolders) || (0, _utils.isEmpty)(pushFolders.filter(i => i))) return _this.setMessage(`First specify some push folders in your ${(0, _palette.colourNotice)(_paths.configFileName)}\n\nFor example:\n\n${(0, _palette.colourMuted)(`{\n  `)}pushFolders: [ '${(0, _palette.colourNotice)('templates')}', '${(0, _palette.colourNotice)('config')}', '${(0, _palette.colourNotice)('public/assets/build')}' ]\n${(0, _palette.colourMuted)('}')}`); // Remove empty values from the array so users can’t accidentally upload the entire project

      const filteredPushFolders = pushFolders.filter(i => i); // Check if the defined local paths exist

      const hasMissingPaths = yield (0, _utils.getMissingPaths)(filteredPushFolders, 'pushFolders'); // If any local paths are missing then return the messages

      if (hasMissingPaths instanceof Error) return _this.setError(hasMissingPaths); // Share what's happening with the user

      _this.setWorking(`Pushing files in ${(0, _utils.commaAmpersander)(filteredPushFolders)}`); // Get the rsync push commands


      const pushCommands = (0, _ssh2.getSshPushCommands)({
        pushFolders: filteredPushFolders,
        user: user,
        host: host,
        port: port,
        workingDirectory: appPath,
        sshKeyPath: SWIFF_CUSTOM_KEY
      }); // Send the commands to the push task

      const pushStatus = yield (0, _utils.executeCommands)(pushCommands); // Return the result to the user

      if (pushStatus instanceof Error) {
        return _this.setError(`There was an issue uploading the files\n\n${pushStatus}`);
      }

      const output = (0, _utils.replaceRsyncOutput)(pushStatus, _this.state.config.pushFolders);
      return _this.setSuccess((0, _utils.isEmpty)(output) ? `No push required, ${!(0, _utils.isEmpty)(remoteEnvironment) ? `${(0, _palette.colourHighlight)(remoteEnvironment)}` : 'the remote'} is already up-to-date` : `Success! These are the remote files that changed:\n${output}\n\nThe file push${!(0, _utils.isEmpty)(remoteEnvironment) ? ` to ${(0, _palette.colourHighlight)(remoteEnvironment)}` : ''} was successful`);
    }));

    _defineProperty(this, "handlePullDatabase",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // Set some variables for later
      const localEnv = _this.state.localEnv;
      const serverConfig = _this.state.config.server;
      const {
        SWIFF_CUSTOM_KEY,
        DB_SERVER,
        DB_PORT,
        DB_DATABASE,
        DB_USER,
        DB_PASSWORD
      } = localEnv; // Get the remote env file via SSH

      const remoteEnv = yield (0, _env.getRemoteEnv)({
        serverConfig,
        isInteractive: _this.state.isFlaggedStart,
        sshKeyPath: SWIFF_CUSTOM_KEY
      }); // If the env can't be found then return a message

      if (remoteEnv instanceof Error) return _this.setMessage(remoteEnv); // Share what's happening with the user

      _this.setWorking(`Fetching ${(0, _palette.colourHighlight)(remoteEnv.DB_DATABASE)} from ${(0, _palette.colourHighlight)(remoteEnv.ENVIRONMENT)}`); // Set the remote database variables


      const remoteDbName = `${remoteEnv.DB_DATABASE}-remote.sql`;
      const remoteDbNameZipped = `${remoteDbName}.gz`;
      const importFile = `${_paths.pathBackups}/${remoteDbName}`; // Download and store the remote DB via SSH

      const dbSsh = yield (0, _ssh2.getSshDatabase)({
        remoteEnv: remoteEnv,
        host: serverConfig.host,
        user: serverConfig.user,
        port: serverConfig.port,
        sshAppPath: serverConfig.appPath,
        gzipFileName: remoteDbNameZipped,
        sshKeyPath: SWIFF_CUSTOM_KEY,
        unzip: true
      }); // If there's any env issues then return the messages

      if (dbSsh instanceof Error) return _this.setError(dbSsh); // Backup the existing local database

      const localBackupFilePath = `${_paths.pathBackups}/${DB_DATABASE}-local.sql.gz`;
      const localDbDump = yield (0, _database.doLocalDbDump)({
        host: DB_SERVER,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_DATABASE,
        gzipFilePath: localBackupFilePath
      }); // If there's any local db backup issues then return the messages

      if (localDbDump instanceof Error) return _this.setError(localDbDump); // Share what's happening with the user

      _this.setWorking(`Updating ${(0, _palette.colourHighlight)(DB_DATABASE)} on ${(0, _palette.colourHighlight)(DB_SERVER)}`); // Drop the tables from the local database


      const dropTables = yield (0, _database.doDropAllDbTables)({
        host: DB_SERVER,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_DATABASE
      }); // If there's any dropping issues then return the messages

      if (dropTables instanceof Error) return String(dropTables).includes('ER_BAD_DB_ERROR: Unknown database ') ? _this.setMessage(`First create a database named ${(0, _palette.colourNotice)(DB_DATABASE)} on ${(0, _palette.colourNotice)(DB_SERVER)} with these login details:\n\nUsername: ${DB_USER}\nPassword: ${DB_PASSWORD}`) : _this.setError(`There were issues connecting to your local ${(0, _palette.colourAttention)(DB_DATABASE)} database\n\nCheck these settings are correct in your local .env file:\n\n${(0, _palette.colourAttention)(`DB_SERVER="${DB_SERVER}"\nDB_PORT="${DB_PORT}"\nDB_USER="${DB_USER}"\nDB_PASSWORD="${DB_PASSWORD}"\nDB_DATABASE="${DB_DATABASE}"`)}\n\n${(0, _palette.colourMuted)(String(dropTables).replace('Error: ', ''))}`); // Import the remote .sql into the local database

      const importDatabase = yield (0, _database.doImportDb)({
        host: DB_SERVER,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_DATABASE,
        importFile: importFile
      }); // If there's any import issues then return the messages

      if (importDatabase instanceof Error) return _this.setError(`There were issues refreshing your local ${(0, _palette.colourAttention)(DB_DATABASE)} database\n\n${(0, _palette.colourMuted)(importDatabase)}`); // Remove remote .sql working file

      yield (0, _utils.cmdPromise)(`rm ${importFile}`).catch(_this.setError); // Show a success message

      _this.setSuccess(`Your ${(0, _palette.colourHighlight)(DB_DATABASE)} database was updated with the ${(0, _palette.colourHighlight)(remoteEnv.ENVIRONMENT)} database`);
    }));

    _defineProperty(this, "handlePushDatabase",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // Set some variables for later
      const localEnv = _this.state.localEnv;
      const serverConfig = _this.state.config.server;
      const {
        SWIFF_CUSTOM_KEY,
        DB_SERVER,
        DB_PORT,
        DB_DATABASE,
        DB_USER,
        DB_PASSWORD
      } = localEnv; // Get the remote env file via SSH

      const remoteEnv = yield (0, _env.getRemoteEnv)({
        serverConfig,
        isInteractive: _this.state.isFlaggedStart,
        sshKeyPath: SWIFF_CUSTOM_KEY
      }); // If the env can't be found then return a message

      if (remoteEnv instanceof Error) return _this.setMessage(remoteEnv); // Share what's happening with the user

      _this.setWorking(`Backing up the remote ${(0, _palette.colourHighlight)(remoteEnv.ENVIRONMENT)} database`); // If the env can't be found then return a message


      if (remoteEnv instanceof Error) return _this.setMessage(remoteEnv); // Set the remote database variables

      const remoteDbName = `${remoteEnv.DB_DATABASE}-remote.sql`;
      const remoteDbNameZipped = `${remoteDbName}.gz`; // Download and store the remote DB via SSH

      const dbSsh = yield (0, _ssh2.getSshDatabase)({
        remoteEnv: remoteEnv,
        host: serverConfig.host,
        user: serverConfig.user,
        port: serverConfig.port,
        sshAppPath: serverConfig.appPath,
        gzipFileName: remoteDbNameZipped,
        sshKeyPath: SWIFF_CUSTOM_KEY
      }); // If there's any env issues then return the messages

      if (dbSsh instanceof Error) return _this.setError(dbSsh); // Share what's happening with the user

      _this.setWorking(`Exporting and uploading your local ${(0, _palette.colourHighlight)(DB_DATABASE)} database`); // Backup the existing local database


      const localDbDumpFile = `swiff-${DB_DATABASE}-push.sql`;
      const localDbDumpFileZipped = `${localDbDumpFile}.gz`;
      const localDbDumpFilePath = `${_paths.pathBackups}/${localDbDumpFileZipped}`;
      const localDbDump = yield (0, _database.doLocalDbDump)({
        host: DB_SERVER,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_DATABASE,
        gzipFilePath: localDbDumpFilePath
      }); // If there's any local db backup issues then return the messages

      if (localDbDump instanceof Error) return _this.setError(localDbDump);
      const remoteDbDumpPath = serverConfig.appPath; // Upload local db to remote

      const pushDatabase = yield (0, _ssh2.pushSshDatabase)({
        host: serverConfig.host,
        user: serverConfig.user,
        port: serverConfig.port,
        dbName: DB_DATABASE,
        fromPath: localDbDumpFilePath,
        toPath: remoteDbDumpPath,
        sshKeyPath: SWIFF_CUSTOM_KEY
      }); // If there's any push issues then return the error message

      if (pushDatabase instanceof Error) return _this.setError(pushDatabase); // Create a SSH connection
      // TODO: Test swiff custom key

      const ssh = yield (0, _ssh2.sshConnect)({
        host: serverConfig.host,
        username: serverConfig.user,
        port: serverConfig.port,
        sshKeyPath: SWIFF_CUSTOM_KEY
      }); // If there’s any connection issues then return the messages

      if (ssh instanceof Error) return _this.setError(ssh); // Check the remote database dump exists

      const doCheckForDb = yield (0, _database.checkForDb)({
        dbFilePath: _path.default.join(remoteDbDumpPath, localDbDumpFileZipped),
        sshConn: ssh
      });
      if (doCheckForDb instanceof Error) return _this.setError(doCheckForDb); // Unzip the remote database to ready it for import

      const doUnzipDb = yield (0, _database.unzipDb)({
        dbFilePath: _path.default.join(remoteDbDumpPath, localDbDumpFileZipped),
        sshConn: ssh
      });
      if (doUnzipDb instanceof Error) return _this.setError(doUnzipDb); // Clear out the remote database ahead of import

      const doClearDb = yield (0, _database.clearDb)({
        remoteEnv: remoteEnv,
        sshConn: ssh
      });
      if (doClearDb instanceof Error) return _this.setError(doClearDb); // Share what's happening with the user

      _this.setWorking(`Updating remote database on ${(0, _palette.colourHighlight)(remoteEnv.ENVIRONMENT)}`); // Import the local database dump into the remote database


      const doImportDb = yield (0, _database.importDb)({
        remoteEnv: remoteEnv,
        dbFilePath: _path.default.join(remoteDbDumpPath, localDbDumpFile),
        sshConn: ssh
      });
      if (doImportDb instanceof Error) return _this.setError(doImportDb); // Remove the database dump file on remote

      const doRemoveDb = yield (0, _database.removeDb)({
        dbFilePath: _path.default.join(remoteDbDumpPath, localDbDumpFile),
        sshConn: ssh
      });
      if (doRemoveDb instanceof Error) return _this.setError(doRemoveDb); // Close the remote SSH connection

      ssh.dispose(); // Remove the database dump file on local

      yield (0, _utils.cmdPromise)(`rm ${localDbDumpFilePath}`).catch(_this.setError); // Show a success message

      _this.setSuccess(`The remote ${(0, _palette.colourHighlight)(remoteEnv.DB_DATABASE)} database was updated with your ${(0, _palette.colourHighlight)(DB_DATABASE)} database`);
    }));

    _defineProperty(this, "handlePullComposer",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // Set some variables for later
      const serverConfig = _this.state.config.server;
      const {
        DB_DATABASE,
        SWIFF_CUSTOM_KEY
      } = _this.state.localEnv; // Share what's happening with the user

      _this.setWorking(`Backing up your local composer files`); // Backup the local composer files
      // I'm letting this command fail silently if the user doesn’t have composer files locally just yet


      yield (0, _utils.executeCommands)(`cp composer.json ${_paths.pathBackups}/${DB_DATABASE}-local-composer.json && cp composer.lock ${_paths.pathBackups}/${DB_DATABASE}-local-composer.lock`); // Connect to the remote server

      const ssh = yield (0, _ssh2.getSshInit)({
        host: serverConfig.host,
        user: serverConfig.user,
        sshKeyPath: SWIFF_CUSTOM_KEY
      }); // If there's connection issues then return the messages

      if (ssh instanceof Error) return _this.setError(ssh); // Share what's happening with the user

      _this.setWorking(`Fetching the composer files from the remote server at ${(0, _palette.colourHighlight)(serverConfig.host)}`); // Download composer.json from the remote server


      const sshDownload1 = yield (0, _ssh2.getSshFile)({
        connection: ssh,
        from: _path.default.join(serverConfig.appPath, 'composer.json'),
        to: _path.default.join(_paths.pathApp, 'composer.json')
      }); // If there's download issues then end the connection and return the messages

      if (sshDownload1 instanceof Error) {
        ssh.dispose();
        return _this.setMessage(`Error downloading composer.json\n\n${(0, _palette.colourNotice)(sshDownload1)}`);
      } // Download composer.lock from the remote server


      const sshDownload2 = yield (0, _ssh2.getSshFile)({
        connection: ssh,
        from: _path.default.join(serverConfig.appPath, 'composer.lock'),
        to: _path.default.join(_paths.pathApp, 'composer.lock')
      }); // If there's download issues then end the connection and return the messages

      if (sshDownload2 instanceof Error) {
        ssh.dispose();
        return _this.setMessage(`Error downloading composer.lock\n\n${(0, _palette.colourNotice)(sshDownload2)}`);
      } // Close the connection


      ssh.dispose(); // Show a success message

      return _this.setSuccess(`Your composer files were updated from ${(0, _palette.colourHighlight)(serverConfig.host)}`);
    }));

    _defineProperty(this, "handlePushComposer",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // Set some variables for later
      const serverConfig = _this.state.config.server;
      const {
        DB_DATABASE,
        SWIFF_CUSTOM_KEY
      } = _this.state.localEnv; // Share what's happening with the user

      _this.setWorking(`Backing up the remote composer files on ${(0, _palette.colourHighlight)(serverConfig.host)}`); // Connect to the remote server


      const ssh = yield (0, _ssh2.getSshInit)({
        host: serverConfig.host,
        user: serverConfig.user,
        sshKeyPath: SWIFF_CUSTOM_KEY
      }); // Download composer.json from the remote server

      const sshDownload1 = yield (0, _ssh2.getSshFile)({
        connection: ssh,
        from: _path.default.join(serverConfig.appPath, 'composer.json'),
        to: _path.default.join(_paths.pathBackups, `${DB_DATABASE}-remote-composer.json`)
      }); // Download composer.lock from the remote server

      const sshDownload2 = yield (0, _ssh2.getSshFile)({
        connection: ssh,
        from: _path.default.join(serverConfig.appPath, 'composer.lock'),
        to: _path.default.join(_paths.pathBackups, `${DB_DATABASE}-remote-composer.lock`)
      }); // TODO: Test the responses of sshDownload1/sshDownload2 and provide error feedback
      // Close the connection

      ssh.dispose(); // Share what's happening with the user

      _this.setWorking(`Pushing your composer files to the remote server`); //
      // https://download.samba.org/pub/rsync/rsync.html


      const flags = [// '--dry-run',
      // Preserve permissions
      '--archive', // Compress file data during the transfer
      // '--compress',
      // Connect via a port number
      // Set the custom identity if provided
      `-e "ssh -p ${serverConfig.port}${!(0, _utils.isEmpty)(SWIFF_CUSTOM_KEY) ? ` -i '${SWIFF_CUSTOM_KEY}'` : ''}"`].join(' ');
      yield (0, _utils.executeCommands)(`(rsync ${flags} ${_path.default.join(_paths.pathApp, `composer.json`)} ${serverConfig.user}@${serverConfig.host}:${serverConfig.appPath})
            (rsync ${flags} ${_path.default.join(_paths.pathApp, `composer.lock`)} ${serverConfig.user}@${serverConfig.host}:${serverConfig.appPath})
            `); // Show a success message

      return _this.setSuccess(`Your composer files were pushed to ${(0, _palette.colourHighlight)(serverConfig.host)}`);
    }));

    _defineProperty(this, "handleOpenBackups",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      const doOpen = yield (0, _utils.executeCommands)(`open '${_paths.pathBackups}'`);
      if (doOpen instanceof Error) return _this.setError(doOpen);

      _this.setWorking(`Opening the backups folder`);

      setTimeout(() => _this.setSuccess(`The backups folder was opened\n  ${_paths.pathBackups}`), 500);
      return;
    }));

    _defineProperty(this, "handleSsh",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // Clear the messages so they don't display in our interactive session
      _this.setState({
        messages: null,
        removeOptions: true
      }); // Set some variables for later


      const serverConfig = _this.state.config.server;
      const {
        SWIFF_CUSTOM_KEY
      } = _this.state.localEnv; // Get the users key we'll be using to connect with

      const user = yield (0, _username.default)(); // Check if the key file exists

      const privateKey = !(0, _utils.isEmpty)(SWIFF_CUSTOM_KEY) ? SWIFF_CUSTOM_KEY : `/Users/${user}/.ssh/id_rsa`; // Create an interactive shell session
      // https://github.com/mscdex/ssh2#start-an-interactive-shell-session

      let gs = null;
      const conn = new _ssh.default();
      conn.on('ready', () => {
        conn.shell((err, stream) => {
          if (err) throw err; // Build the commands to run once we're logged in

          const initialCommands = [`cd ${serverConfig.appPath}`, 'clear', 'll', `echo "\n💁  You're now connected with: ${serverConfig.user}@${serverConfig.host}\nWorking directory: ${serverConfig.appPath}\n"`].join(' && '); // Run the commands

          stream.write(`${initialCommands}\n`);
          stream.on('close', () => {
            console.log((0, _palette.colourHighlight)('\n💁  Your SSH connection ended, bye!\n'));
            conn.end();
            process.exit();
          }).on('data', data => {
            // Push the server output to our console
            if (!gs) gs = stream;
            if (gs._writableState.sync == false) process.stdout.write('' + data);
          }).stderr.on('data', data => {
            console.log('STDERR: ' + data);
            process.exit(1);
          });
        });
      }).connect({
        host: serverConfig.host,
        privateKey: require('fs').readFileSync(privateKey),
        username: serverConfig.user,
        port: serverConfig.port
      }); // Push our input to the server input
      // http://stackoverflow.com/questions/5006821/nodejs-how-to-read-keystrokes-from-stdin

      const stdin = process.stdin; // Without this, we would only get streams once enter is pressed

      stdin.setRawMode(true); // Resume stdin in the parent process (node app won't quit all by itself unless an error or process.exit() happens)

      stdin.resume(); // No binary

      stdin.setEncoding('utf8'); // On any data into stdin

      stdin.on('data', key => {
        // Write the key to stdout
        if (gs) gs.write('' + key);
      });
    }));

    const _isFlaggedStart = Object.values(this.props.flags).filter(v => v).length > 0;

    const _tasks = this.getTasksListed();

    const {
      newTasks: _newTasks,
      newPages: _newPages
    } = this.getTasksPaginated(_tasks, 1);
    this.state = {
      messages: [],
      localEnv: null,
      // The contents of the remote env file
      remoteEnv: null,
      // The contents of the remote env file
      config: null,
      // The contents of the config file
      isFlaggedStart: _isFlaggedStart,
      // Whether the app was started with flags
      tasks: _newTasks,
      currentPage: 1,
      pages: _newPages,
      currentTask: null,
      removeOptions: false
    };
  }

  render(props, {
    messages,
    currentTask,
    tasks,
    isFlaggedStart,
    removeOptions,
    currentPage
  }) {
    const OptionsSelectProps = {
      items: tasks,
      onSelect: task => task.id === 'toggle' ? this.changeTaskPage() : !isTaskRunning(messages) && this.startTask(task),
      itemComponent: ({
        emoji,
        title,
        description,
        isSelected
      }) => {
        const isActive = currentTask && currentTask.title === title && isTaskRunning(messages);
        return (0, _ink.h)(_ink.Text, null, (0, _ink.h)(_ink.Text, {
          hex: isSelected ? _palette.hexHighlight : emoji ? _palette.hexDefault : '#777',
          bold: emoji
        }, `${isActive ? '⌛  ' : emoji ? `${emoji}  ` : ''}${title}`), (0, _ink.h)(_ink.Text, {
          hex: _palette.hexMuted
        }, description && `: ${description}`));
      },
      indicatorComponent: () => {}
    };
    const showOptions = !isFlaggedStart && !removeOptions;
    return (0, _ink.h)(_ink.Text, null, showOptions ? (0, _ink.h)(_ink.Text, {
      dim: isTaskRunning(messages)
    }, (0, _ink.h)(_templates.OptionsTemplate, {
      selectProps: OptionsSelectProps
    }), (0, _ink.h)("br", null)) : null, !(0, _utils.isEmpty)(messages) && (0, _ink.h)(_templates.MessageTemplate, {
      messages: messages,
      isFlaggedStart: isFlaggedStart
    }));
  }

}

var _default = Swiff;
exports.default = _default;