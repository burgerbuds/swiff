"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _ink = require("ink");

var _child_process = require("child_process");

var _universalAnalytics = _interopRequireDefault(require("universal-analytics"));

var _username = _interopRequireDefault(require("username"));

var _utils = require("./utils");

var _paths = require("./paths");

var _env = require("./env");

var _database = require("./database");

var _templates = require("./templates");

var _ssh = require("./ssh");

var _config = require("./config");

var _palette = require("./palette");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// Start user analytics for error and usage information
const visitor = (0, _universalAnalytics.default)('UA-131596357-2', {
  uid: _username.default
}); // Get the latest task status to check if running

const isTaskRunning = messages => {
  const currentMessage = messages.slice(-1).pop();
  return currentMessage && currentMessage.type === 'working';
};

class Swiff extends _ink.Component {
  constructor(props) {
    var _this;

    super(props);
    _this = this;

    _defineProperty(this, "componentDidMount",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      console.clear(); // Handle flags - make them run in sync if multiple args used

      if (_this.props.push) _this.startTaskId('push');
      if (_this.props.database) _this.startTaskId('database');
      if (_this.props.pull) _this.startTaskId('pull');
      if (_this.props.composer) _this.startTaskId('composer');
      if (_this.props.backups) _this.handleBackupOpen(); // Deal with incorrect flags
      // TODO: Improve the test here

      const isFlaggedStart = _this.state.isFlaggedStart;

      if (isFlaggedStart && _this.props.push === false && _this.props.database === false && _this.props.pull === false && _this.props.composer === false && _this.props.backups === false) {
        _this.setMessage(`A supplied flag isn’t recognised\n\nSee a list of flags at:\n${(0, _palette.colourAttention)('swiff --help')}`);

        return setTimeout(() => process.exit(), 250);
      }
    }));

    _defineProperty(this, "startTaskId", id => {
      const tasks = this.state.tasks; // Get the task information by its id

      const task = tasks.filter(({
        taskId
      }) => taskId === id).shift();
      return this.startTask(task);
    });

    _defineProperty(this, "startTask", task => {
      // Define some variables for later
      const {
        taskId,
        heading
      } = task;
      const {
        messages,
        isFlaggedStart
      } = this.state; // Only play the sound when the cli is launched without flags (the sounds are a little too much)

      !isFlaggedStart && (0, _child_process.exec)(`afplay ${_paths.pathMedia}/start.mp3`); // Reset messages then use the setState callback to start the new task

      this.setState({
        currentTask: task,
        messages: [{
          text: heading,
          type: 'heading'
        }]
      },
      /*#__PURE__*/
      // Once the state is set use the setState callback to proceed with the task
      _asyncToGenerator(function* () {
        // Fire off the usage tracking
        visitor.pageview({
          dp: taskId,
          dt: heading
        }).send(); // Let the user know what's happening

        _this.setWorking('Performing pre-task checks'); // Start the setup process


        const isSetup = yield _this.handleSetup();
        if (isSetup !== true) return; // Start the chosen task

        if (taskId === 'push') yield _this.handlePush();
        if (taskId === 'database') yield _this.handleDatabaseSync();
        if (taskId === 'pull') yield _this.handlePull();
        if (taskId === 'composer') yield _this.handleComposerSync(); // End the process after 500 ticks if started with flags

        if (!isTaskRunning(messages) && isFlaggedStart) setTimeout(() => process.exit(), 500);
      }));
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
      // Check for the swiff config
      const doesConfigExist = yield (0, _utils.doesFileExist)(_paths.pathConfig); // If no config, create it

      if (!doesConfigExist) yield (0, _config.createConfig)(); // Get the config

      const config = yield (0, _config.setupConfig)(!doesConfigExist); // If there's any missing config options then return an error

      if (config instanceof Error) return _this.setMessage(config); // Add the config to the global state

      _this.setState({
        config
      }); // Get the users env file


      const localEnv = yield (0, _env.setupLocalEnv)(_this.setMessage); // If there's anything wrong with the env then return an error

      if (localEnv instanceof Error) return _this.setMessage(localEnv); // Add the env to the global state

      _this.setState({
        localEnv
      }); // Check if the key file exists
      // Get the users key we'll be using to connect with


      const user = yield (0, _username.default)();
      const sshKey = !(0, _utils.isEmpty)(localEnv.SWIFF_CUSTOM_KEY) ? localEnv.SWIFF_CUSTOM_KEY : `/Users/${user}/.ssh/id_rsa`;
      const doesSshKeyExist = yield (0, _utils.doesFileExist)(sshKey); // If the key isn't found then show a message

      if (!doesSshKeyExist) return _this.setMessage(`Your SSH key file wasn’t found\n\nEither create a new one at:\n${(0, _palette.colourNotice)(sshKey)}\n\nor add the path in your project .env, eg:\nSWIFF_CUSTOM_KEY="/Users/${user}/.ssh/id_rsa"`); // Check the users SSH key has been added to the server

      const checkSshSetup = yield (0, _utils.executeCommands)((0, _ssh.getSshTestCommand)(config.server.user, config.server.host)); // If there's an issue with the connection then give some assistance

      if (checkSshSetup instanceof Error) {
        return _this.setMessage(`A SSH connection couldn’t be made with these details:\n\n${(0, _palette.colourNotice)(`Server host: ${config.server.host}\nServer user: ${config.server.user}\nSSH key: ${sshKey}`)}\n\n${(0, _ssh.getSshCopyInstructions)(config)}\n\n${(0, _utils.isEmpty)(localEnv.SWIFF_CUSTOM_KEY) ? `Incorrect SSH key?\nAdd the path in your project .env\neg: SWIFF_CUSTOM_KEY="/Users/${user}/.ssh/id_rsa"` : ''}`);
      }

      return true;
    }));

    _defineProperty(this, "handlePush",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // Set some variables for later
      const localEnv = _this.state.localEnv;
      const serverConfig = _this.state.config.server;
      const pushFolders = _this.state.config.pushFolders; // Get the remote env file via SSH

      const remoteEnv = yield (0, _env.getRemoteEnv)({
        localEnv,
        serverConfig
      }); // If there's any env issues then return the messages

      if (remoteEnv instanceof Error) return _this.setError(remoteEnv);
      const {
        ENVIRONMENT
      } = remoteEnv; // Shame the user if they are pushing to production

      if (!(0, _utils.isEmpty)(ENVIRONMENT) && (ENVIRONMENT === 'production' || ENVIRONMENT === 'live')) _this.setMessage(`Bad practice: You’re pushing files straight to production,\nconsider a more reliable way to deploy changes in the future`); // Create a list of paths to push

      if (pushFolders === undefined || !Array.isArray(pushFolders) || (0, _utils.isEmpty)(pushFolders.filter(i => i))) return _this.setMessage(`First specify some push folders in your ${(0, _palette.colourNotice)(_paths.configFileName)}\n\nFor example:\n\n${(0, _palette.colourMuted)(`{\n  `)}pushFolders: [ '${(0, _palette.colourNotice)('templates')}', '${(0, _palette.colourNotice)('config')}', '${(0, _palette.colourNotice)('public/assets/build')}' ]\n${(0, _palette.colourMuted)('}')}`); // Remove empty values from the array so users can’t accidentally upload the entire project

      const filteredPushFolders = pushFolders.filter(i => i); // Check if the defined local paths exist

      const hasMissingPaths = yield (0, _utils.getMissingPaths)(filteredPushFolders, 'pushFolders'); // If any local paths are missing then return the messages

      if (hasMissingPaths instanceof Error) return _this.setError(hasMissingPaths); // Share what's happening with the user

      _this.setWorking(`Pushing files in ${(0, _utils.commaAmpersander)(filteredPushFolders)}`); // Get the rsync push commands


      const {
        user,
        host,
        appPath
      } = _this.state.config.server;
      const {
        SWIFF_CUSTOM_KEY
      } = _this.state.localEnv;
      const pushCommands = (0, _ssh.getSshPushCommands)({
        pushFolders: filteredPushFolders,
        user: user,
        host: host,
        workingDirectory: appPath,
        swiffSshKey: SWIFF_CUSTOM_KEY
      }); // Send the commands to the push task

      const pushStatus = yield (0, _utils.executeCommands)(pushCommands); // Return the result to the user
      // Filter out the second confirmation message

      return pushStatus instanceof Error ? _this.setError(`There was an issue uploading the files\n\n${pushStatus}`) : _this.setSuccess(`Your file push to ${(0, _palette.colourHighlight)(ENVIRONMENT)} was successful\n\n${(0, _palette.colourMuted)(pushStatus // Remove repeated text
      .replace('building file list ... done\n\n', '').replace('building file list ... done\n', ''))}`);
    }));

    _defineProperty(this, "handlePull",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      const {
        pullFolders,
        server
      } = _this.state.config;
      const {
        user,
        host,
        appPath
      } = server; // Check if the user has defined some pull folders

      if (!Array.isArray(pullFolders) || (0, _utils.isEmpty)(pullFolders.filter(i => i))) return _this.setMessage(`First specify some pull folders in your ${(0, _palette.colourNotice)(_paths.configFileName)}\n\nFor example:\n\n${(0, _palette.colourMuted)(`{\n  `)}pullFolders: [ '${(0, _palette.colourNotice)('public/assets/volumes')}' ]\n${(0, _palette.colourMuted)('}')}`); // Remove empty values from the array so the user can’t accidentally download the entire remote

      const filteredPullFolders = pullFolders.filter(i => i); // Share what's happening with the user

      _this.setWorking(`Pulling files from ${(0, _utils.commaAmpersander)(filteredPullFolders)}`); // Create the rsync commands required to pull the files


      const {
        SWIFF_CUSTOM_KEY
      } = _this.state.localEnv; // Set the custom identity if provided

      const customKey = !(0, _utils.isEmpty)(SWIFF_CUSTOM_KEY) ? `-e "ssh -i ${SWIFF_CUSTOM_KEY}"` : '';
      const flags = `-avzh ${customKey}`;
      const rsyncCommands = filteredPullFolders.map(path => {
        const rSyncFrom = `${appPath}/${path}/*`;
        const rSyncTo = `./${path}/`;
        return `rsync ${flags} ${user}@${host}:${rSyncFrom} ${rSyncTo}`;
      }); // Execute the rsync pull commands

      const pullStatus = yield (0, _utils.executeCommands)(rsyncCommands.join(';')); // Set some variables for later

      const localEnv = _this.state.localEnv;
      const serverConfig = _this.state.config.server; // Get the remote env file via SSH

      const remoteEnv = yield (0, _env.getRemoteEnv)({
        localEnv,
        serverConfig
      }); // If there's any env issues then return the messages

      if (remoteEnv instanceof Error) return _this.setError(remoteEnv);
      const {
        ENVIRONMENT
      } = remoteEnv;
      return pullStatus instanceof Error ? _this.setError(`There was an issue downloading the files from ${(0, _palette.colourAttention)(ENVIRONMENT)} \n\n${(0, _palette.colourMuted)(String(pullStatus).replace(/No such file or directory/g, (0, _palette.colourDefault)('No such file or directory')))}`) : _this.setSuccess(`The file pull from ${(0, _palette.colourHighlight)(ENVIRONMENT)} was successful\n\n${(0, _palette.colourMuted)(pullStatus.replace('receiving file list ... done\n\n', '').replace('receiving file list ... done\n', ''))}`);
    }));

    _defineProperty(this, "handleDatabaseSync",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // Set some variables for later
      const localEnv = _this.state.localEnv;
      const serverConfig = _this.state.config.server; // Get the remote env file via SSH

      const remoteEnv = yield (0, _env.getRemoteEnv)({
        localEnv,
        serverConfig
      }); // If there's any env issues then return the messages

      if (remoteEnv instanceof Error) return _this.setError(remoteEnv); // Share what's happening with the user

      _this.setWorking(`Fetching ${(0, _palette.colourHighlight)(remoteEnv.DB_DATABASE)} from ${(0, _palette.colourHighlight)(remoteEnv.ENVIRONMENT)}`); // Set the remote database variables


      const remoteDbName = `${remoteEnv.DB_DATABASE}-remote.sql`;
      const remoteDbNameZipped = `${remoteDbName}.gz`;
      const importFile = `${_paths.pathBackups}/${remoteDbName}`; // Download the remote DB via SSH

      const dbSsh = yield (0, _ssh.getSshDatabase)({
        remoteEnv: remoteEnv,
        host: serverConfig.host,
        user: serverConfig.user,
        sshAppPath: serverConfig.appPath,
        gzipFileName: remoteDbNameZipped,
        swiffSshKey: localEnv.SWIFF_CUSTOM_KEY
      }); // If there's any env issues then return the messages

      if (dbSsh instanceof Error) return _this.setError(dbSsh); // Backup the existing local database

      const localBackupFilePath = `${_paths.pathBackups}/${localEnv.DB_DATABASE}-local.sql.gz`;
      const localDbDump = (0, _database.doLocalDbDump)({
        database: localEnv.DB_DATABASE,
        user: localEnv.DB_USER,
        password: localEnv.DB_PASSWORD,
        gzipFilePath: localBackupFilePath
      }); // If there's any local db backup issues then return the messages

      if (localDbDump instanceof Error) return _this.setError(localDbDump); // Share what's happening with the user

      _this.setWorking(`Updating ${(0, _palette.colourHighlight)(localEnv.DB_DATABASE)} on ${(0, _palette.colourHighlight)(localEnv.DB_SERVER)}`); // Drop the tables from the local database


      const dropTables = yield (0, _database.doDropAllDbTables)({
        host: localEnv.DB_SERVER,
        user: localEnv.DB_USER,
        password: localEnv.DB_PASSWORD,
        database: localEnv.DB_DATABASE
      }); // If there's any dropping issues then return the messages

      if (dropTables instanceof Error) return String(dropTables).includes('ER_BAD_DB_ERROR: Unknown database ') ? _this.setMessage(`First create a database named ${(0, _palette.colourNotice)(localEnv.DB_DATABASE)} with these login details:\n\nUsername: ${localEnv.DB_USER}\nPassword: ${localEnv.DB_PASSWORD}`) : _this.setError(`There were issues connecting to your local ${(0, _palette.colourAttention)(localEnv.DB_DATABASE)} database\n\n${(0, _palette.colourMuted)(String(dropTables).replace('Error: ', ''))}`); // Import the remote .sql into the local database

      const importDatabase = yield (0, _database.doImportDb)({
        user: localEnv.DB_USER,
        password: localEnv.DB_PASSWORD,
        database: localEnv.DB_DATABASE,
        importFile: importFile
      }); // If there's any import issues then return the messages

      if (importDatabase instanceof Error) return _this.setError(`There were issues refreshing your local ${(0, _palette.colourAttention)(localEnv.DB_DATABASE)} database\n\n${(0, _palette.colourMuted)(importDatabase)}`); // Remove remote .sql working file

      yield (0, _utils.cmdPromise)(`rm ${importFile}`).catch(_this.setError); // Show a success message

      _this.setSuccess(`Your ${(0, _palette.colourHighlight)(localEnv.DB_DATABASE)} database was refreshed with the ${(0, _palette.colourHighlight)(remoteEnv.ENVIRONMENT)} database from ${(0, _palette.colourHighlight)(serverConfig.host)}`);
    }));

    _defineProperty(this, "handleComposerSync",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // Set some variables for later
      const serverConfig = _this.state.config.server;
      const {
        DB_DATABASE,
        SWIFF_CUSTOM_KEY
      } = _this.state.localEnv; // Backup the local composer files
      // I'm letting this command fail silently if the user doesn’t have composer files locally just yet

      yield (0, _utils.executeCommands)(`cp composer.json ${_paths.pathBackups}/${DB_DATABASE}-local-composer.json && cp composer.lock ${_paths.pathBackups}/${DB_DATABASE}-local-composer.lock`); // Connect to the remote server

      const ssh = yield (0, _ssh.getSshInit)({
        host: serverConfig.host,
        user: serverConfig.user,
        swiffSshKey: SWIFF_CUSTOM_KEY
      }); // If there's connection issues then return the messages

      if (ssh instanceof Error) return _this.setError(ssh); // Share what's happening with the user

      _this.setWorking(`Fetching the files from the remote server at ${(0, _palette.colourHighlight)(serverConfig.host)}`); // Download composer.json from the remote server


      const sshDownload1 = yield (0, _ssh.getSshFile)({
        connection: ssh,
        from: `${serverConfig.appPath}/composer.json`,
        to: `${_paths.pathApp}/composer.json`
      }); // If there's download issues then end the connection and return the messages

      if (sshDownload1 instanceof Error) {
        ssh.dispose();
        return _this.setMessage(`Error downloading composer.json\n\n${(0, _palette.colourNotice)(sshDownload1)}`);
      } // Download composer.lock from the remote server


      const sshDownload2 = yield (0, _ssh.getSshFile)({
        connection: ssh,
        from: `${serverConfig.appPath}/composer.lock`,
        to: `${_paths.pathApp}/composer.lock`
      }); // If there's download issues then end the connection and return the messages

      if (sshDownload2 instanceof Error) {
        ssh.dispose();
        return _this.setMessage(`Error downloading composer.lock\n\n${(0, _palette.colourNotice)(sshDownload2)}`);
      } // Close the connection


      ssh.dispose(); // Show a success message

      _this.setSuccess(`Your local ${(0, _palette.colourHighlight)('composer.json')} and ${(0, _palette.colourHighlight)('composer.lock')} were refreshed`);
    }));

    _defineProperty(this, "handleBackupOpen",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // Open the backups folder
      const doOpen = yield (0, _utils.executeCommands)(`open '${_paths.pathBackups}'`);
      if (doOpen instanceof Error) return _this.setError(doOpen);

      _this.setSuccess(`Opening the backups folder:\n${(0, _palette.colourHighlight)(_paths.pathBackups)}`);

      return setTimeout(() => process.exit(), 250);
    }));

    this.state = {
      messages: [],
      localEnv: null,
      // The contents of the remote env file
      remoteEnv: null,
      // The contents of the remote env file
      config: null,
      // The contents of the config file
      isFlaggedStart: Object.entries(this.props).filter(([k, v]) => v === true).length > 0,
      // Whether the app was started with flags
      currentTask: null,
      tasks: [{
        taskId: 'push',
        emoji: '🚀',
        title: 'Push',
        heading: 'Push files',
        description: `Upload and sync to the remote server from your push folders`
      }, {
        taskId: 'pull',
        emoji: '📥',
        title: 'Pull',
        heading: 'Pull files',
        description: 'Download fresh files on the remote server from your pull folders '
      }, {
        taskId: 'database',
        emoji: '💫',
        title: 'Database',
        heading: 'Database download',
        description: `Refresh your website database with a remote database`
      }, {
        taskId: 'composer',
        emoji: '🎩',
        title: 'Composer',
        heading: 'Composer download',
        description: 'Refresh your composer files with the remote files'
      }]
    };
  }

  render(props, {
    messages,
    currentTask,
    tasks,
    isFlaggedStart
  }) {
    const OptionsSelectProps = {
      items: tasks,
      onSelect: task => !isTaskRunning(messages) && this.startTask(task),
      itemComponent: ({
        emoji,
        title,
        description,
        isSelected
      }) => {
        const isRunning = currentTask && currentTask.title === title && isTaskRunning(messages);
        return (0, _ink.h)(_ink.Text, null, (0, _ink.h)(_ink.Text, {
          hex: isSelected ? _palette.hexHighlight : _palette.hexDefault,
          bold: true
        }, `${isRunning ? '⌛' : emoji}  ${title}`), (0, _ink.h)(_ink.Text, {
          hex: _palette.hexMuted
        }, ': ', description));
      },
      indicatorComponent: () => {}
    };
    return (0, _ink.h)(_ink.Text, null, !isFlaggedStart && (0, _ink.h)(_ink.Text, {
      dim: isTaskRunning(messages)
    }, (0, _ink.h)(_templates.OptionsTemplate, {
      selectProps: OptionsSelectProps
    })), !(0, _utils.isEmpty)(messages) && (0, _ink.h)(_ink.Text, null, (0, _ink.h)(_templates.MessageTemplate, {
      messages: messages
    })));
  }

}

var _default = Swiff;
exports.default = _default;