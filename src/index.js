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
        id: 'pull-folders',
        emoji: '📥',
        title: 'Pull folders',
        heading: 'Pull folders',
        description:
            'Download fresh files on the remote server from your pull folders',
        isListed: true,
        needsSetup: true,
        handler: 'handlePull',
        flags: ['pull-folders', 'pullfolders', 'pullf', 'folderpull', 'df'],
        // flags: ['pull', 'd'], // TODO: deprecate display
    },
    {
        id: 'push-folders',
        emoji: '🚀',
        title: 'Push folders',
        heading: 'Push folders',
        description:
            'Upload and sync to the remote server from your push folders',
        isListed: true,
        needsSetup: true,
        handler: 'handlePush',
        flags: ['push-folders', 'pushfolders', 'pushf', 'folderpush', 'uf'],
        // flags: ['push', 'u'], // TODO: deprecate display
    },
    {
        id: 'pull-database',
        emoji: '💫',
        title: 'Pull database',
        heading: 'Pull database',
        description: 'Overwrite your local with the remote database',
        isListed: true,
        needsSetup: true,
        handler: 'handleDatabase',
        flags: ['pull-database', 'pulldb', 'dbpull', 'pulld', 'ddb'],
        // flags: ['database', 't'], // TODO: deprecate display
    },
    {
        id: 'push-database',
        emoji: '💫',
        title: 'Push database',
        heading: 'Push database',
        description:
            'Overwrite the remote with your local database',
        isListed: false,
        needsSetup: true,
        fullscreen: true,
        handler: 'handlePushDatabase',
        flags: ['push-database', 'pushdb', 'dbpush', 'pushd', 'udb', 'updb', 'uploaddb'],
    },
    {
        id: 'pull-composer',
        emoji: '🎩',
        title: 'Pull composer',
        heading: 'Pull composer',
        description: 'Update your local composer files from the remote',
        isListed: false,
        needsSetup: true,
        handler: 'handleComposer',
        flags: ['pull-composer', 'pullcomposer', 'pullcomp', 'pullc'],
        // flags: ['composer', 'c'], // TODO: deprecate display
    },
    {
        id: 'backups',
        emoji: '🏬',
        title: 'View backups',
        heading: 'Open backups folder',
        description:
            'View gzipped database and composer backups',
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

const taskInstructions = (tasks, isVerbose) =>
    tasks
        .map(
            task =>
                `${task.emoji}  ${chalk.bold(task.title)}: ${colourHighlight(`swiff ${task.flags[0].length === 1 ? '-' : '--'}${task.flags[0]}`)}${isVerbose ? `\n  ${task.description}` : ''}\n  Aliases: ${
                    task.flags.slice(1)
                    .map(flag => `${flag.length === 1 ? '-' : '--'}${flag}`)
                    .join(', ')}`
        )
        .join('\n\n')

const taskHelp = (isVerbose = false) => `
${isVerbose ? `💁  Run ${colourHighlight(
    'swiff'
)} within your project root for an interactive interface.\nOtherwise use the following commands to quickly run a task:` : `Try one of the following flags:`}\n\n${taskInstructions(tasks, isVerbose)}`

const taskFlags = tasks.map(task => ({
    [task.flags.slice().shift()]: {
        type: 'boolean',
        alias: task.flags.toString(),
    },
}))

const cli = meow(
    // Set the help message shown when the user runs swiff --help
    taskHelp(true),
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
    <Swiff flags={cli.flags} pkg={cli.pkg} tasks={tasks} taskHelp={taskHelp()} />
)
