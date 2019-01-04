import path from 'path'
import { promisify } from 'util'
import { isEmpty } from 'lodash'
import fs from 'fs-extra'
import { exec } from 'child_process'
import cmd from 'node-cmd'
import dns from 'dns'
import { colourHighlight, colourAttention } from './palette'
const execPromise = promisify(exec)
const cmdPromise = promisify(cmd.get)

// Make sure any symlinks in the project folder are resolved
const appDirectory = fs.realpathSync(process.cwd())
const resolveApp = relativePath => path.resolve(appDirectory, relativePath)

// Execute bash commands
const executeCommands = async commands => {
    try {
        const { stdout } = await execPromise(commands)
        return stdout
    } catch (error) {
        return new Error(error)
    }
}

const doesFileExist = async file => fs.pathExists(file)

// Returns a list of missing paths
const getMissingPaths = async (suppliedPaths, configSetting) => {
    // Map over the list of paths and return missing ones
    const getResults = async paths => {
        const pathChecks = await paths.map(async path => {
            const doesExist = await doesFileExist(path)
            return doesExist ? null : path
        })
        return Promise.all(pathChecks)
    }
    // Wait for the path results
    const results = await getResults(suppliedPaths)
    // Remove the nulls from the object
    const filteredResults = results.filter(i => i)
    // Create a template helper for wording adjustments
    const hasMultipleResults = filteredResults.length > 1
    // Return the missing path messages
    return !isEmpty(filteredResults)
        ? new Error(
              `The folder${hasMultipleResults ? 's' : ''} ${commaAmpersander(
                  filteredResults,
                  colourAttention
              )} ${
                  hasMultipleResults ? 'aren’t found in' : 'isn’t found in'
              } your project\n\nEither create ${
                  hasMultipleResults ? 'those folders' : 'the folder'
              } or adjust the ${colourAttention(configSetting)} values in your ${colourAttention(
                  'swiff.config.js'
              )}`
          )
        : []
}

const commaAmpersander = (array, styler = colourHighlight) =>
    array
        .map(
            (f, i) =>
                (i > 0 ? (i === array.length - 1 ? ' and ' : ', ') : '') +
                styler(f)
        )
        .join('')

export {
    resolveApp,
    isEmpty,
    executeCommands,
    promisify,
    getMissingPaths,
    cmdPromise,
    doesFileExist,
    commaAmpersander,
}
