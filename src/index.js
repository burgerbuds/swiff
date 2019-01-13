#!/usr/bin/env node

import { h, render } from 'ink'
import meow from 'meow'
import fs from 'fs-extra'
import chalk from 'chalk'
import Swiff from './Swiff'
import { colourHighlight } from './palette'

// Notify when there's an update available
import updateNotifier from 'update-notifier'
import pkg from './../package.json'
updateNotifier({ pkg }).notify()

const cli = meow(
    // Set the help message shown when the user runs swiff --help
    `
    Run ${colourHighlight('swiff')} to start the task interface.

    Otherwise use these flags for quick task launches:

    🚀  Push: ${colourHighlight('swiff -u')}
    alias 'swiff -push'

    📥  Pull: ${colourHighlight('swiff -d')}
    alias 'swiff -pull'

    💫  Database: ${colourHighlight('swiff -db')}
    alias 'swiff -database'

    🎩  Composer: ${colourHighlight('swiff -c')}
    alias 'swiff -composer'

    Open the backups folder: ${colourHighlight('swiff -b')}
    alias 'swiff --backups'
`,
    {
        flags: {
            push: {
                type: 'boolean',
                default: false,
                alias: 'u',
            },
            pull: {
                type: 'boolean',
                default: false,
                alias: 'd',
            },
            database: {
                type: 'boolean',
                default: false,
                alias: 'db',
            },
            composer: {
                type: 'boolean',
                default: false,
                alias: 'c',
            },
            backups: {
                type: 'boolean',
                default: false,
                alias: 'b',
            },
        },
    }
)

// Catch unhandled rejections
process.on('unhandledRejection', reason => {
    process.exit()
})

// Catch uncaught exceptions
process.on('uncaughtException', error => {
    fs.writeSync(1, `${chalk.red(error)}\n\n`)
})

// End process on ctrl+c or ESC
process.stdin.on('data', key => {
    if (['\u0003', '\u001B'].includes(key)) {
        console.log(colourHighlight('\n👌  Your SSH connection was ended'))
        process.exit()
    }
})

render(<Swiff {...cli.flags} pkg={cli.pkg} />)
