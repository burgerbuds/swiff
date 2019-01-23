# Swiff

Swiff saves you time with common SSH tasks during the development of websites/apps:

🚀 **File uploads**<br>
Upload and sync files to remote folders via SSH

📥 **File downloads**<br>
Download fresh files from remote folders via SSH

💫 **Local database updates**<br>
Quick replacement of your project database with the remote

💻 **Remote terminal connection**<br>
Launch a SSH session directly into the remote site/app folder

🎩 **Local composer.json/lock updates**<br>
Refresh your composer files with the latest updates from the remote

## Getting started

1. Install Swiff globally with NPM:<br>
`npm install --global swiff`

2. Type `swiff` within a project folder to start the task interface

Type `swiff --help` for a list of flags for your 'once off' tasks.

## Additional features

- Custom SSH identity: Swiff will attempt to use your identity located at `/Users/[currentUser]/.ssh/id_rsa`.<br>
Add a custom identity in your .env file with `swiffSshKey: '[fullFilePath]'`.

- Trustable backups: Your local database and composer files are backed up before they are replaced.<br>
Run `swiff --backups` to open the backups folder.

- Single task shortcuts: Run a task without interactions using flags. Run `swiff --help` for the list of flags.

## Requirements

Swiff requires MySQL to use the database update feature.<br>
You can download MySQL at [dev.mysql.com](https://dev.mysql.com/downloads/mysql/).

Running Windows or Linux? Swiff has been tested on MacOS so there's probably some issues on other operating systems.

## Technology

- [Node.js](https://nodejs.org/en/) - A JavaScript runtime built on Chrome's V8 JavaScript engine
- [Ink](https://github.com/vadimdemedes/ink) - React for interactive command-line apps
- Babel - For JavaScript transpiling
- [Prettier](https://github.com/prettier/prettier) - Code cleaning

## Credits

Sounds by [Emoji Sounds](https://icons8.com/sounds)<br>
Created by [@benrogerson](https://twitter.com/benrogerson) and Sam Stevens