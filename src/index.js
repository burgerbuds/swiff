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

const tasks = [
    {
        id: 'pull',
        emoji: '📥',
        title: 'Pull',
        heading: 'Pull files',
        description:
            'Download fresh files on the remote server from your pull folders',
        isListed: true,
        needsSetup: true,
        handler: 'handlePull',
        flags: ['pull', 'd'],
    },
    {
        id: 'push-dry-run',
        emoji: '🔮',
        title: 'Push - dry run',
        heading: 'Push files - dry run',
        description:
            'Try dry run push based on the current config and show the outcome without actually running it',
        isListed: true,
        needsSetup: true,
        handler: 'handlePushDryRun',
        flags: ['push-dry-run'],
    },
    {
        id: 'push',
        emoji: '🚀',
        title: 'Push',
        heading: 'Push files',
        description:
            'Upload and sync to the remote server from your push folders',
        isListed: true,
        needsSetup: true,
        handler: 'handlePush',
        flags: ['push', 'u'],
    },
    {
        id: 'database',
        emoji: '💫',
        title: 'Database',
        heading: 'Database download',
        description: 'Refresh your website database with a remote database',
        isListed: true,
        needsSetup: true,
        handler: 'handleDatabase',
        flags: ['database', 't'],
    },
    {
        id: 'composer',
        emoji: '🎩',
        title: 'Composer',
        heading: 'Composer sync',
        description: 'Refresh your composer files from the remote server',
        isListed: false,
        needsSetup: true,
        handler: 'handleComposer',
        flags: ['composer', 'c'],
    },
    {
        id: 'backups',
        emoji: '🏬',
        title: 'Backups',
        heading: 'Open backups folder',
        description:
            'Open the backups folder containing database and composer files',
        isListed: false,
        needsSetup: false,
        handler: 'handleOpenBackups',
        flags: ['backups', 'b'],
    },
    {
        id: 'ssh',
        emoji: '💻',
        title: 'Terminal',
        heading: 'Remote terminal connection',
        description:
            'Launch a remote terminal session into the remote app folder',
        isListed: false,
        needsSetup: true,
        fullscreen: true,
        handler: 'handleSsh',
        flags: ['ssh', 's'],
    },
]

const taskInstructions = tasks =>
    tasks
        .map(
            task =>
                `${task.emoji}  ${task.description}\n  ${task.flags
                    .map(
                        flag =>
                            `${colourHighlight(
                                `swiff ${flag.length === 1 ? '-' : '--'}${flag}`
                            )}`
                    )
                    .join(' / ')}`
        )
        .join('\n\n')

const taskHelp = `
Run ${colourHighlight(
    'swiff'
)} within your project folder root to start the task interface.\nOtherwise use the following commands to quickly run a task:\n\n${taskInstructions(
    tasks
)}`

const taskFlags = tasks.map(task => ({
    [task.flags.shift()]: {
        type: 'boolean',
        alias: task.flags.toString(),
    },
}))

const cli = meow(
    // Set the help message shown when the user runs swiff --help
    taskHelp,
    {
        description: false,
        flags: Object.assign(...taskFlags),
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

render(
    <Swiff flags={cli.flags} pkg={cli.pkg} tasks={tasks} taskHelp={taskHelp} />
)
