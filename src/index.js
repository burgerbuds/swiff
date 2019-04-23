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
        title: 'Folder pull',
        heading: 'Folder pull',
        description:
            'Update your folders with the remote pull folders',
        isListed: true,
        needsSetup: true,
        handler: 'handlePullFolders',
        flags: ['pull-folders', 'pullfolders', 'pullf', 'folderpull', 'df', 'downf'],
    },
    {
        id: 'pull-database',
        emoji: '💫',
        title: 'Database pull',
        heading: 'Database pull',
        description: 'Replace your database with the remote database',
        isListed: true,
        needsSetup: true,
        handler: 'handlePullDatabase',
        flags: ['pull-database', 'pulldb', 'dbpull', 'pulld', 'ddb'],
    },
    {
        id: 'pull-composer',
        emoji: '🎩',
        title: 'Composer pull',
        heading: 'Composer pull',
        description: 'Update your project with the remote composer files',
        isListed: true,
        needsSetup: true,
        handler: 'handlePullComposer',
        flags: ['pull-composer', 'pullcomposer', 'pullcomp', 'pullc'],
    },
    {
        id: 'push-folders',
        emoji: '🚀',
        title: 'Folder push',
        heading: 'Folder push',
        description:
            'Update the remote folders with your push folders',
        isListed: true,
        needsSetup: true,
        handler: 'handlePushFolders',
        flags: ['push-folders', 'pushfolders', 'pushf', 'folderpush', 'uf', 'upf'],
    },
    {
        id: 'push-database',
        emoji: '💫',
        title: 'Database push',
        heading: 'Database push',
        description:
            'Replace the remote database with your local database',
        isListed: true,
        needsSetup: true,
        fullscreen: true,
        handler: 'handlePushDatabase',
        flags: ['push-database', 'pushdb', 'dbpush', 'pushd', 'udb', 'updb', 'uploaddb'],
    },
    {
        id: 'push-composer',
        emoji: '🎩',
        title: 'Composer push',
        heading: 'Composer push',
        description: 'Update the remote with your local composer files',
        isListed: true,
        needsSetup: true,
        handler: 'handlePushComposer',
        flags: ['push-composer', 'pushcomposer', 'pushcomp', 'pushc'],
    },
    {
        id: 'backups',
        emoji: '🏬',
        title: 'View backups',
        heading: 'Open backups folder',
        description:
            'View your gzipped database and composer backups',
        isListed: true,
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
        isListed: true,
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
                `${task.emoji}  ${chalk.bold(task.title)}: ${colourHighlight(`swiff ${task.flags[0].length === 1 ? '-' : '--'}${task.flags[0]}`)}${isVerbose ? `\n   ${task.description}` : ''}\n   Aliases: ${
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
        console.log(colourHighlight('\n👌  Your SSH connection has ended'))
        process.exit()
    }
})

render(
    <Swiff flags={cli.flags} pkg={cli.pkg} tasks={tasks} taskHelp={taskHelp()} />
)
