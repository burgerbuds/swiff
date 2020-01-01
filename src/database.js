import mysql from 'promise-mysql'
import { cmdPromise } from './utils'
import { isEmpty } from './utils'

// CLI Resources:
// https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html
// https://mariadb.com/kb/en/library/mysqldump/

// A better solution than dropping and recreating the db.
// It also avoids errors when run on an empty database.
// https://stackoverflow.com/a/18625545
const dropDbQuery = `SET FOREIGN_KEY_CHECKS = 0;SET GROUP_CONCAT_MAX_LEN=32768;SET @tables = NULL;SELECT GROUP_CONCAT('\`', table_name, '\`') INTO @tables FROM information_schema.tables WHERE table_schema = (SELECT DATABASE()); SELECT IFNULL(@tables,'dummy') INTO @tables; SET @tables = CONCAT('DROP TABLE IF EXISTS ', @tables); PREPARE stmt FROM @tables; EXECUTE stmt; DEALLOCATE PREPARE stmt; SET FOREIGN_KEY_CHECKS = 1;`

const importDbQuery = ({
    host = 'localhost',
    port = 3306,
    user,
    password,
    database,
    importFile,
}) =>
    `mysql --host='${host}' --port='${
        !isEmpty(port) ? port : 3306
    }' --user='${user}' --password='${password}' ${database} < ${importFile};`

// Clear out the tables in a database
const doDropAllDbTables = async config => {
    let errorMessage
    const defaultConfig = {
        multipleStatements: true,
        host: null,
        user: null,
        password: null,
        database: null,
        socketPath: null,
    }
    // Create the connection to the local database
    const conn = await mysql
        .createConnection({ ...defaultConfig, ...config })
        .catch(error => (errorMessage = error))
    if (errorMessage) return new Error(errorMessage)
    conn.query(dropDbQuery)
    conn.end()
}

const doImportDb = async config => {
    let errorMessage
    await cmdPromise(importDbQuery(config)).catch(e => (errorMessage = e))
    if (errorMessage) return new Error(errorMessage)
}

const doLocalDbDump = async config => {
    let errorMessage
    await cmdPromise(getDbDumpZipCommands(config)).catch(
        e => (errorMessage = e)
    )
    if (errorMessage) return new Error(errorMessage)
}

const getDbDumpZipCommands = ({
    host = 'localhost',
    port = 3306,
    user,
    password,
    database,
    gzipFilePath,
}) =>
    // Dump and zip the db - this can make it around 9 times smaller
    `mysqldump --host='${host}' --port='${port}' --user='${user}' --password='${password}' ${database} | gzip > '${gzipFilePath}'`

const checkForDb = async ({ dbFilePath, sshConn }) => {
    let errorMessage
    // Check the local database file has been uploaded
    await sshConn
        .execCommand(`test -f ${dbFilePath} && echo "true" || echo "false"`)
        .then(({ stdout, stderr }) => {
            // If error running command
            if (stderr)
                return (errorMessage = `There was an issue checking the presence of the remote db dump\n\n${stderr}`)
            // If db dump doesn't exist
            if (stdout && String(stdout).includes('false'))
                return (errorMessage = `The remote db dump wasn't found`)
        })
    if (errorMessage) return new Error(errorMessage)
    return
}

const unzipDb = async ({ dbFilePath, sshConn }) => {
    let errorMessage
    // -d : decompress / -f : force overwrite any existing file
    await sshConn
        .execCommand(`gzip -df '${dbFilePath}'`)
        .then(({ stdout, stderr }) => {
            // If error running command
            if (stderr)
                return (errorMessage = `There was an issue checking the presence of the remote db dump\n\n${stderr}`)
            // If db dump doesn't exist
            if (stdout && String(stdout).includes('false'))
                return (errorMessage = `The remote db dump wasn't found`)
        })
    if (errorMessage) return new Error(errorMessage)
    return
}

// Drop the tables in the remote database to prepare for import
const clearDb = async ({ remoteEnv, sshConn }) => {
    let errorMessage
    const connectSql = `mysql --host="${remoteEnv.DB_SERVER}" --user="${
        remoteEnv.DB_USER
    }" --port="${remoteEnv.DB_PORT}" --database="${
        remoteEnv.DB_DATABASE
    }" --password="${remoteEnv.DB_PASSWORD}"`
    await sshConn
        .execCommand(
            `${connectSql} -Nse 'show tables' ${
                remoteEnv.DB_DATABASE
            } | while read table; do ${connectSql} -e "SET FOREIGN_KEY_CHECKS = 0; truncate table $table; SET FOREIGN_KEY_CHECKS = 1;" ${
                remoteEnv.DB_DATABASE
            }; done`
        )
        .then(({ stdout, stderr }) => {
            const cleanMessage = message =>
                String(message)
                    .replace(
                        // Suppress this warning - it's not as bad as it sounds
                        /mysql: \[Warning] Using a password on the command line interface can be insecure./g,
                        ''
                    )
                    .trim()
            const cleanStderr = stderr ? cleanMessage(stderr) : false
            if (cleanStderr)
                errorMessage = `There was an issue attempting to clear the remote database\n\n${cleanStderr}`
        })
    if (errorMessage) return new Error(errorMessage)
    return
}

const importDb = async ({ remoteEnv, dbFilePath, sshConn }) => {
    let errorMessage
    // Import the local database into the remote with mysql
    await sshConn
        .execCommand(
            importDbQuery({
                host: remoteEnv.DB_SERVER,
                port: remoteEnv.DB_PORT,
                user: remoteEnv.DB_USER,
                password: remoteEnv.DB_PASSWORD,
                database: remoteEnv.DB_DATABASE,
                importFile: dbFilePath,
            })
        )
        .then(({ stdout, stderr }) => {
            const cleanMessage = message =>
                String(message)
                    .replace(
                        // Suppress this warning - it's not as bad as it sounds
                        /mysql: \[Warning] Using a password on the command line interface can be insecure./g,
                        ''
                    )
                    .trim()
            const cleanStderr = stderr ? cleanMessage(stderr) : false
            if (cleanStderr)
                errorMessage = `There was an issue importing the local db dump on the remote server\n\n${cleanStderr}`
        })
    if (errorMessage) return new Error(errorMessage)
    return
}

// Cleanup the database dump file on the remote
const removeDb = async ({ dbFilePath, sshConn }) => {
    let errorMessage
    // Import the local database into the remote with mysql
    await sshConn.execCommand(`rm ${dbFilePath}`).then(({ stdout, stderr }) => {
        // If error running command
        if (stderr)
            errorMessage = `There was an issue importing the local db dump on the remote server\n\n${stderr}`
    })
    if (errorMessage) return new Error(errorMessage)
    return
}

export {
    getDbDumpZipCommands,
    doDropAllDbTables,
    dropDbQuery,
    doImportDb,
    doLocalDbDump,
    importDbQuery,
    checkForDb,
    unzipDb,
    clearDb,
    importDb,
    removeDb,
}
