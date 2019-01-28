import path from 'path'
import { promisify } from 'util'
import isEmpty from 'lodash/isEmpty'
import fs from 'fs-extra'
import { exec } from 'child_process'
import cmd from 'node-cmd'
import { colourHighlight, colourAttention, colourNotice } from './palette'
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
              } or adjust the ${colourAttention(
                  configSetting
              )} values in your ${colourAttention('swiff.config.js')}`
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

// Check https://stackoverflow.com/a/36851784/9055509 for rsync output details
const replaceRsyncOutput = (outputText, folders) =>
    // If no changes then don't render anything
    outputText.split('\n').filter(Boolean).length === folders.length
        ? ''
        : outputText
              .split('\n')
              // Remove empty items
              .filter(Boolean)
              // Add note to folders without changes
              // TODO: Convert this to a filter
              .map((e, i, arr) => {
                  const isLast = i === arr.length - 1
                  const isNextAFolder = !isLast && arr[i + 1].startsWith('!')
                  return e.startsWith('!') && (isNextAFolder || isLast) ? '' : e
              })
              // Style folder headings
              .map(i => (i.startsWith('!') ? `\n${i.substring(1)}` : i))
              // Remove 'modified date updated'
              .filter(i => !i.startsWith('<f..t'))
              .filter(i => !i.startsWith('>f..t'))
              .map(
                  i =>
                      i
                          .replace(/(\<|\>)f.st..../g, colourHighlight('^')) // Updated
                          .replace(
                              /(\<|\>)f\+\+\+\+\+\+\+/g,
                              colourHighlight('+')
                          ) // Added
                          .replace(/\*deleting/g, colourAttention('-')) // Deleted
              )
              // Remove empty items
              .filter(Boolean)
              .join('\n')

export {
    resolveApp,
    isEmpty,
    executeCommands,
    promisify,
    getMissingPaths,
    cmdPromise,
    doesFileExist,
    commaAmpersander,
    replaceRsyncOutput,
}
