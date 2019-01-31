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

Swiff is agency "battletested" by [Simple](https://simple.com.au) - an agency who specialises in Craft CMS located in Adelaide, Australia.

## Getting started

1. Install Swiff globally with NPM:<br>
`npm install --global swiff`

2. Type `swiff` within a project root to start the task interface

Type `swiff --help` for a list of flags for your 'once off' tasks.

## Additional features

- Custom SSH identity: Swiff will attempt to use your identity located at: `/Users/[currentUser]/.ssh/id_rsa`<br>
You can specify a custom SSH key path in your .env file with:<br>
`SWIFF_CUSTOM_KEY="/Users/[your-user]/.ssh/[key-filename]"`

- Trustable backups: Your local database and composer files are backed up before they are replaced.<br>
Run `swiff --backups` to open the backups folder

- Single task shortcuts: Run a task without interactions using flags. Run `swiff --help` for the list of flags

## Requirements

Swiff requires MySQL to use the database features.
We recommend using MariaDB, an enhanced, drop-in replacement for MySQL.
`brew install mariadb@10.2` (latest version as of 25.01.19)

For the Database & Composer tasks, a PEM format SSH key is required<br>
Read about [how to create and add a new SSH key](https://github.com/simple-integrated-marketing/swiff/wiki/Creating-and-adding-a-new-SSH-key)

Running Windows or Linux? Swiff has been tested on MacOS so there's probably some issues on other operating systems

## Technology

- [Node.js](https://nodejs.org/en/) - A JavaScript runtime built on Chrome's V8 JavaScript engine
- [Ink](https://github.com/vadimdemedes/ink) - React for interactive command-line apps
- Babel - For JavaScript transpiling
- [Prettier](https://github.com/prettier/prettier) - Code cleaning

## Credits

Sounds by [Emoji Sounds](https://icons8.com/sounds)<br>
Created by [@benrogerson](https://twitter.com/benrogerson) and Sam Stevens