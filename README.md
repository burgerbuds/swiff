# Swiff

Swiff simplifies common staging server tasks when developing an app or website.

📥 **File downloading**<br>
Download fresh remote files from specific folders

🚀 **File pushing**<br>
Upload and sync specific folders with a remote server

💫 **Local database updates**<br>
Refresh your website database with a remote database

💻 **Quick remote terminal**<br>
Launch a remote terminal session into the remote app folder.<br>
Start the remote session with: `swiff --ssh`

🎩 **Local composer.json/lock updates**<br>
Refresh your composer files with the latest updates from the remote<br>
(helps with Craft CMS development)<br>
Download the remote composer files with: `swiff --composer`

## Getting started

1. Install swiff globally with npm:<br>
`npm install --global swiff`

2. Then type `swiff` within a project folder to start the task interface

Type `swiff --help` to see a complete list of flags you can pass to Swiff.

## Additional features

- Custom SSH identity: Swiff will attempt to use your identity located at `/Users/[currentUser]/.ssh/id_rsa`.<br>
Add a custom identity in your .env file with `swiffSshKey: '[fullFilePath]'`.

- Trustable backups: Your local database and composer files are backed up before they are replaced.<br>
Run `swiff --backups` to open the backups folder.

- Single task shortcuts: Run a task without interactions using flags. Run `swiff --help` for the list of flags.

## Requirements

Swiff requires mySQL to import the remote database.<br>
You can download mySQL at [dev.mysql.com](https://dev.mysql.com/downloads/mysql/).

Running Windows or Linux? So far, Swiff has only been tested macOS so there's probably some issues on other operating systems.

## Technology used

- [Node.js](https://nodejs.org/en/) - A JavaScript runtime built on Chrome's V8 JavaScript engine
- [Ink](https://github.com/vadimdemedes/ink) - React for interactive command-line apps
- Babel - For JavaScript transpiling
- [Nodemon](https://github.com/remy/nodemon) - Dev code watcher
- [Prettier](https://github.com/prettier/prettier) - Code cleaning

## Credits

Interface sounds from [Emoji Sounds](https://icons8.com/sounds)<br>
Created by [@benrogerson](https://twitter.com/benrogerson) and Sam Stevens

Crafted at [Simple](https://simple.com.au/)