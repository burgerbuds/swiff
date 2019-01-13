"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _ink = require("ink");

var _child_process = require("child_process");

var _universalAnalytics = _interopRequireDefault(require("universal-analytics"));

var _username = _interopRequireDefault(require("username"));

var _ssh = _interopRequireDefault(require("ssh2"));

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
const visitor = (0, _universalAnalytics.default)('UA-131596357-2', {
  uid: (0, _username.default)()
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
      console.clear(); // Tasks

      if (_this.props.push) _this.startTaskId('push');
      if (_this.props.database) _this.startTaskId('database');
      if (_this.props.pull) _this.startTaskId('pull'); // Tools

      if (_this.props.composer) _this.startToolId('composer');
      if (_this.props.backups) _this.startToolId('backups');
      if (_this.props.ssh) _this.startToolId('ssh'); // Deal with incorrect flags
      // TODO: Improve the test here

      const isFlaggedStart = _this.state.isFlaggedStart;

      if (isFlaggedStart && _this.props.push === false && _this.props.database === false && _this.props.pull === false && _this.props.composer === false && _this.props.backups === false && _this.props.ssh === false) {
        _this.setMessage(`The supplied flag(s) aren’t recognised\n\View a list of flags by running ${(0, _palette.colourAttention)('swiff --help')}`);

        return setTimeout(() => process.exit(), 250);
      }
    }));

    _defineProperty(this, "startTaskId", taskId => {
      const tasks = this.state.tasks; // Get the task information by its id

      const task = tasks.filter(({
        id
      }) => id === taskId).shift();
      return this.startTask(task);
    });

    _defineProperty(this, "startTask", taskData => {
      const {
        id,
        heading,
        handler
      } = taskData;
      const {
        messages,
        isFlaggedStart
      } = this.state; // Only play the sound when the cli is launched without flags (the sounds can be too much)

      !isFlaggedStart && (0, _child_process.exec)(`afplay ${_paths.pathMedia}/start.mp3`); // Reset messages then use the setState callback to start the new task

      this.setState({
        currentTask: id,
        messages: [{
          text: heading,
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
        }).send(); // Let the user know what's happening

        _this.setWorking('Performing pre-task checks'); // Start the setup process


        const isSetup = yield _this.handleSetup();
        if (isSetup !== true) return; // Start the chosen task

        yield handler(); // End the process after 500 ticks if started with flags

        if (!isTaskRunning(messages) && isFlaggedStart) // Wait a little to allow setState to finish
          setTimeout(() => process.exit(), 500);
      }));
    });

    _defineProperty(this, "startToolId", toolId => {
      const tools = this.state.tools; // Get the tool information by its id

      const tool = tools.filter(({
        id
      }) => id === toolId).shift();
      return this.startTool(tool);
    });

    _defineProperty(this, "startTool", toolData => {
      const {
        id,
        emoji,
        heading,
        needsSetup,
        handler,
        keepRunning
      } = toolData; // Set messages then use the setState callback to start the tool

      this.setState({
        messages: [{
          text: `${emoji}  ${heading}`,
          type: 'heading'
        }]
      },
      /*#__PURE__*/
      // Once the state is set proceed with the tool
      _asyncToGenerator(function* () {
        // Fire off the usage tracking
        visitor.pageview({
          dp: id,
          dt: heading
        }).send();

        if (needsSetup) {
          // Let the user know what's happening
          _this.setWorking('Performing pre-tool checks'); // Start the setup process


          const isSetup = yield _this.handleSetup();
          if (isSetup !== true) return;
        } // Start the chosen tool


        yield handler(); // End the process once finished
        // Wait a little to allow setState to finish

        if (!keepRunning) setTimeout(() => process.exit(), 500);
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
      // Check if the config exists
      const doesConfigExist = yield (0, _utils.doesFileExist)(_paths.pathConfig); // If no config, create it

      if (!doesConfigExist) yield (0, _config.createConfig)(); // Get the config

      const config = yield (0, _config.setupConfig)(!doesConfigExist); // If there's any missing config options then open the config file and show the error

      if (config instanceof Error) {
        // Open the config file after a few seconds
        // fail silently because it doesn't matter so much
        setTimeout(
        /*#__PURE__*/
        _asyncToGenerator(function* () {
          return yield (0, _utils.executeCommands)(`open '${_paths.pathConfig}'`);
        }), 2000);
        return _this.setMessage(config);
      } // Add the config to the global state


      _this.setState({
        config
      }); // Get the users env file


      const localEnv = yield (0, _env.setupLocalEnv)(_this.setMessage); // If there's anything wrong with the env then return an error

      if (localEnv instanceof Error) {
        // Open the env file after a few seconds
        // fail silently because it doesn't matter so much
        setTimeout(
        /*#__PURE__*/
        _asyncToGenerator(function* () {
          return yield (0, _utils.executeCommands)(`open '${_paths.pathLocalEnv}'`);
        }), 2000);
        return _this.setMessage(localEnv);
      } // Add the env to the global state


      _this.setState({
        localEnv
      }); // Get the users key we'll be using to connect with


      const user = yield (0, _username.default)(); // Check if the key file exists

      const sshKey = !(0, _utils.isEmpty)(localEnv.SWIFF_CUSTOM_KEY) ? localEnv.SWIFF_CUSTOM_KEY : `/Users/${user}/.ssh/id_rsa`;
      const doesSshKeyExist = yield (0, _utils.doesFileExist)(sshKey); // If the key isn't found then show a message

      if (!doesSshKeyExist) return _this.setMessage(`Your SSH key file wasn’t found\n\nEither create a new one at:\n${(0, _palette.colourNotice)(sshKey)}\n\nor add the path in your project .env, eg:\nSWIFF_CUSTOM_KEY="/Users/${user}/.ssh/id_rsa"`); // Check the users SSH key has been added to the server

      const checkSshSetup = yield (0, _utils.executeCommands)((0, _ssh2.getSshTestCommand)(config.server.user, config.server.host)); // If there's an issue with the connection then give some assistance

      if (checkSshSetup instanceof Error) {
        return _this.setMessage(`A SSH connection couldn’t be made with these details:\n\n${(0, _palette.colourNotice)(`Server host: ${config.server.host}\nServer user: ${config.server.user}\nSSH key: ${sshKey}`)}\n\n${(0, _ssh2.getSshCopyInstructions)(config)}\n\n${(0, _utils.isEmpty)(localEnv.SWIFF_CUSTOM_KEY) ? `Incorrect SSH key?\nAdd the path in your project .env\neg: SWIFF_CUSTOM_KEY="/Users/${user}/.ssh/id_rsa"` : ''}`);
      }

      return true;
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
      } = _this.state.localEnv;
      const pullCommands = (0, _ssh2.getSshPullCommands)({
        pullFolders: filteredPullFolders,
        user: user,
        host: host,
        appPath: appPath,
        // Set the custom identity if provided
        swiffSshKey: SWIFF_CUSTOM_KEY
      }); // Send the commands to the push task

      const pullStatus = yield (0, _utils.executeCommands)(pullCommands); // Set some variables for later

      const localEnv = _this.state.localEnv; // Get the remote env file via SSH

      const remoteEnv = yield (0, _env.getRemoteEnv)({
        localEnv,
        serverConfig: server
      }); // If there's any env issues then return the messages

      if (remoteEnv instanceof Error) return _this.setError(remoteEnv);
      const {
        ENVIRONMENT
      } = remoteEnv;

      if (pullStatus instanceof Error) {
        return _this.setError(`There was an issue downloading the files from ${(0, _palette.colourAttention)(ENVIRONMENT)} \n\n${(0, _palette.colourMuted)(String(pullStatus).replace(/No such file or directory/g, (0, _palette.colourDefault)('No such file or directory')))}`);
      }

      const output = (0, _utils.replaceRsyncOutput)(pullStatus, filteredPullFolders);
      return _this.setSuccess((0, _utils.isEmpty)(output) ? `Nothing required, ${(0, _palette.colourHighlight)(localEnv.DB_SERVER)} is already up-to-date!` : `The file pull from ${(0, _palette.colourHighlight)(ENVIRONMENT)} was successful\n${output}`);
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
      const pushCommands = (0, _ssh2.getSshPushCommands)({
        pushFolders: filteredPushFolders,
        user: user,
        host: host,
        workingDirectory: appPath,
        swiffSshKey: SWIFF_CUSTOM_KEY
      }); // Send the commands to the push task

      const pushStatus = yield (0, _utils.executeCommands)(pushCommands); // Return the result to the user

      if (pushStatus instanceof Error) {
        return _this.setError(`There was an issue uploading the files\n\n${pushStatus}`);
      }

      const output = (0, _utils.replaceRsyncOutput)(pushStatus, _this.state.config.pushFolders);
      return _this.setSuccess((0, _utils.isEmpty)(output) ? `Nothing required, ${(0, _palette.colourHighlight)(ENVIRONMENT)} is already up-to-date!` : `The file push from ${(0, _palette.colourHighlight)(ENVIRONMENT)} was successful\n${output}`);
    }));

    _defineProperty(this, "handleDatabase",
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

      const dbSsh = yield (0, _ssh2.getSshDatabase)({
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

    _defineProperty(this, "handleComposer",
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

      const ssh = yield (0, _ssh2.getSshInit)({
        host: serverConfig.host,
        user: serverConfig.user,
        swiffSshKey: SWIFF_CUSTOM_KEY
      }); // If there's connection issues then return the messages

      if (ssh instanceof Error) return _this.setError(ssh); // Share what's happening with the user

      _this.setWorking(`Fetching the files from the remote server at ${(0, _palette.colourHighlight)(serverConfig.host)}`); // Download composer.json from the remote server


      const sshDownload1 = yield (0, _ssh2.getSshFile)({
        connection: ssh,
        from: `${serverConfig.appPath}/composer.json`,
        to: `${_paths.pathApp}/composer.json`
      }); // If there's download issues then end the connection and return the messages

      if (sshDownload1 instanceof Error) {
        ssh.dispose();
        return _this.setMessage(`Error downloading composer.json\n\n${(0, _palette.colourNotice)(sshDownload1)}`);
      } // Download composer.lock from the remote server


      const sshDownload2 = yield (0, _ssh2.getSshFile)({
        connection: ssh,
        from: `${serverConfig.appPath}/composer.lock`,
        to: `${_paths.pathApp}/composer.lock`
      }); // If there's download issues then end the connection and return the messages

      if (sshDownload2 instanceof Error) {
        ssh.dispose();
        return _this.setMessage(`Error downloading composer.lock\n\n${(0, _palette.colourNotice)(sshDownload2)}`);
      } // Close the connection


      ssh.dispose(); // Show a success message

      return _this.setSuccess(`Your local ${(0, _palette.colourHighlight)('composer.json')} and ${(0, _palette.colourHighlight)('composer.lock')} were refreshed`);
    }));

    _defineProperty(this, "handleOpenBackups",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      const doOpen = yield (0, _utils.executeCommands)(`open '${_paths.pathBackups}'`);
      if (doOpen instanceof Error) return _this.setError(doOpen);
      return _this.setSuccess(`The backups folder was opened\n${(0, _palette.colourHighlight)(_paths.pathBackups)}`);
    }));

    _defineProperty(this, "handleSsh",
    /*#__PURE__*/
    _asyncToGenerator(function* () {
      // Clear the messages so they don't display in our interactive session
      _this.setState({
        messages: null
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

          const initialCommands = [`cd ${serverConfig.appPath}`, 'clear', 'll', `echo "\nYou're now connected with: ${serverConfig.user}@${serverConfig.host}\nWorking directory: ${serverConfig.appPath}\n"`].join(' && '); // Run the commands

          stream.write(`${initialCommands}\n`);
          stream.on('close', () => {
            console.log((0, _palette.colourHighlight)('\nYour SSH connection ended\n'));
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
        username: serverConfig.user
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
        id: 'pull',
        emoji: '📥',
        title: 'Pull',
        heading: 'Pull files',
        description: 'Download fresh files on the remote server from your pull folders',
        handler: this.handlePull
      }, {
        id: 'push',
        emoji: '🚀',
        title: 'Push',
        heading: 'Push files',
        description: `Upload and sync to the remote server from your push folders`,
        handler: this.handlePush
      }, {
        id: 'database',
        emoji: '💫',
        title: 'Database',
        heading: 'Database download',
        description: `Refresh your website database with a remote database`,
        handler: this.handleDatabase
      }],
      tools: [{
        id: 'composer',
        emoji: '🎩',
        heading: 'Composer sync',
        needsSetup: true,
        handler: this.handleComposer
      }, {
        id: 'backups',
        emoji: '🏬',
        heading: 'Open backups folder',
        needsSetup: false,
        handler: this.handleOpenBackups
      }, {
        id: 'ssh',
        emoji: '💻',
        heading: 'Remote SSH connecton',
        needsSetup: true,
        keepRunning: true,
        handler: this.handleSsh
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