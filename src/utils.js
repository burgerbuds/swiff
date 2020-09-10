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
            if (typeof path !== "string") {
                path = path.path
            }
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

const validatePushFolderOptions = (suppliedPaths, configSetting) => {
    suppliedPaths.forEach(item => {
        if (Object.keys(item).filter(k => ['path','exclude'].indexOf(k)!==-1).length) {
            return new Error(`Only 'path' and 'exclude' key is supported in push folders setting. Adjust the ${colourAttention(
                configSetting
            )} values in your ${colourAttention('swiff.config.js')}`);
        }
    })
    return true;
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

// Source: http://jasonwatmore.com/post/2018/08/07/javascript-pure-pagination-logic-in-vanilla-js-typescript
const paginate = ({
    totalItems,
    currentPage,
    pageSize = 10,
    maxPages = 999,
}) => {
    // calculate total pages
    let totalPages = Math.ceil(totalItems / pageSize);
    let startPage = 1;
    let endPage = null;

    // ensure current page isn't out of range
    if (currentPage < 1) {
        currentPage = 1;
    } else if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (totalPages <= maxPages) {
        // total pages less than max so show all pages
        endPage = totalPages;
    } else {
        // total pages more than max so calculate start and end pages
        let maxPagesBeforeCurrentPage = Math.floor(maxPages / 2);
        let maxPagesAfterCurrentPage = Math.ceil(maxPages / 2) - 1;
        if (currentPage <= maxPagesBeforeCurrentPage) {
            // current page near the start
            endPage = maxPages;
        } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
            // current page near the end
            startPage = totalPages - maxPages + 1;
            endPage = totalPages;
        } else {
            // current page somewhere in the middle
            startPage = currentPage - maxPagesBeforeCurrentPage;
            endPage = currentPage + maxPagesAfterCurrentPage;
        }
    }

    // calculate start and end item indexes
    let startIndex = (currentPage - 1) * pageSize;
    let endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);

    // create an array of pages to ng-repeat in the pager control
    let pages = Array.from(Array((endPage + 1) - startPage).keys()).map(i => startPage + i);

    // return object with all pager properties required by the view
    return {
        totalItems: totalItems,
        currentPage: currentPage,
        pageSize: pageSize,
        totalPages: totalPages,
        startPage: startPage,
        endPage: endPage,
        startIndex: startIndex,
        endIndex: endIndex,
        pages: pages
    };
}

export {
    resolveApp,
    isEmpty,
    executeCommands,
    promisify,
    getMissingPaths,
    validatePushFolderOptions,
    cmdPromise,
    doesFileExist,
    commaAmpersander,
    replaceRsyncOutput,
    paginate,
}
