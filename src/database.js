import { h } from 'ink'
import mysql from 'promise-mysql'
import { cmdPromise } from './utils'
import { isEmpty } from './utils'

// A better solution than dropping and recreating the db.
// It also avoids errors when run on an empty database.
// https://stackoverflow.com/a/18625545
const dropDbQuery = `SET FOREIGN_KEY_CHECKS = 0;
SET GROUP_CONCAT_MAX_LEN=32768;
SET @tables = NULL;
SELECT GROUP_CONCAT('\`', table_name, '\`') INTO @tables
  FROM information_schema.tables
  WHERE table_schema = (SELECT DATABASE());
SELECT IFNULL(@tables,'dummy') INTO @tables;
SET @tables = CONCAT('DROP TABLE IF EXISTS ', @tables);
PREPARE stmt FROM @tables;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET FOREIGN_KEY_CHECKS = 1;`

const importDbQuery = ({ host = 'localhost', port = 3306, user, password, database, importFile }) => `mysql --host='${host}' --port='${!isEmpty(port) ? port : 3306}' --user='${user}' --password='${password}' ${database} < ${importFile};`

// Clear out the tables in a database
const doDropAllDbTables = async config => {
    let errorMessage
    const defaultConfig = {
        multipleStatements: true,
        host: null,
        user: null,
        password: null,
        database: null,
    }
    // Create the connection to the local database
    const conn = await mysql
        .createConnection({ ...defaultConfig, ...config })
        .catch(error => (errorMessage = error))
    if (errorMessage) return new Error(errorMessage)
    conn.query(dropDbQuery)
    conn.end()
}

const doImportDb = async (config) => {
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

const getDbDumpZipCommands = ({ host = 'localhost', port = 3306, user, password, database, gzipFilePath }) =>
    // Dump and zip the db - this can make it around 9 times smaller
    `mysqldump --host='${host}' --port='${port}' --user='${user}' --password='${password}' ${database} | gzip > '${gzipFilePath}'`

export { getDbDumpZipCommands, doDropAllDbTables, dropDbQuery, doImportDb, doLocalDbDump, importDbQuery }
