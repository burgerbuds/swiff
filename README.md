# Swiff

[![npm version](https://badge.fury.io/js/swiff.svg)](https://www.npmjs.com/package/swiff)

Swiff saves you time with common SSH tasks during the development of websites/apps

[![interface example demo](https://raw.githubusercontent.com/simple-integrated-marketing/swiff/master/resources/demo.gif)](https://raw.githubusercontent.com/simple-integrated-marketing/swiff/master/resources/demo.gif)

🚀 **Folder push and pull**<br>
Keep folders in sync between servers

💫 **Database push and pull**<br>
Manage the database between servers

🎩 **Composer file push and pull**<br>
Move composer files between servers

💻 **Remote terminal connection**<br>
Launch a SSH session directly into the remote site/app folder

## Getting started

1. Install Swiff globally with npm:<br>
`npm install --global swiff`

2. Run `swiff` within a project folder to start the task interface

Run `swiff --help` for a list of flags that run a specific task

## Additional features

- Custom SSH identity: Swiff will attempt to use your identity located at: `/Users/[currentUser]/.ssh/id_rsa`<br>
You can specify a custom SSH key path in your .env file with:<br>
`SWIFF_CUSTOM_KEY="/Users/[your-user]/.ssh/[key-filename]"`
- Gzipped backups: Your files and database get backed up and gzipped whenever they change

## Requirements

Swiff requires MySQL to use the database features.
We recommend using MariaDB, an enhanced, drop-in replacement for MySQL.
`brew install mariadb@10.2` (latest as of April 2019)

For the Database & Composer tasks, a PEM format SSH key is required<br>
Read about [how to create and add a new SSH key](https://github.com/simple-integrated-marketing/swiff/wiki/Creating-and-adding-a-new-SSH-key)

Running Windows or Linux? Swiff has been tested on macOS so issues are likely on other operating systems

## Technology

- [Node.js](https://nodejs.org/en/) - A JavaScript runtime built on Chrome's V8 JavaScript engine
- [Ink](https://github.com/vadimdemedes/ink) - React for interactive command-line apps
- [Babel](https://babeljs.io/) - JavaScript transpiling
- [Prettier](https://github.com/prettier/prettier) - Code cleaning

## Credits

Sounds by [Emoji Sounds](https://icons8.com/sounds)<br>
Created by [@benrogerson](https://twitter.com/benrogerson) and Sam Stevens

Swiff has been agency battletested by [Simple](https://simple.com.au) who specialise in Craft CMS websites
