# Swiff

Swiff performs these multi-environment tasks effortlessly:

- 🚀 **File pushing**<br>
Upload and sync specific folders with a remote server
- 📥 **File downloads**<br>
Download fresh remote files from specific folders
- 💫 **Local database updates**<br>
Refresh your website database with a remote database
- 🎩 **Local composer.json/lock updates**<br>
Refresh your composer files with the latest updates from the remote<br>
(helps with Craft CMS development)

## Getting started

1. Install swiff globally with npm:<br>
`npm install --global swiff`
2. Then run `swiff` within your projects

## Additional features

- Power dev shortcuts: Skip the app interactions by using flags. Run `swiff --help` for the list of flags.
- Custom SSH identity: Swiff will attempt to use your identity located at `/Users/[currentUser]/.ssh/id_rsa`. To use another identity open your project .env file and add `swiffSshKey: '[fullFilePath]'`.
- Trustable backups: Your local database and composer files are backed up before they are replaced.<br>
Run `swiff -b` to view the backups.

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