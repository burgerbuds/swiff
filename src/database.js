import { h } from 'ink'
import mysql from 'promise-mysql'
import { cmdPromise } from './utils'
import { isEmpty } from './utils'

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
    // This query avoids drop errors when run multiple times.
    // A more solid solution than dropping and recreating the db.
    // https://stackoverflow.com/a/18625545
    conn.query(`SET FOREIGN_KEY_CHECKS = 0;
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
    SET FOREIGN_KEY_CHECKS = 1;`)
    conn.end()
}

const doImportDb = async ({ host = 'localhost', port = 3306, user, password, database, importFile }) => {
    let errorMessage
    await cmdPromise(
        `mysql --host='${host}' --port='${!isEmpty(port) ? port : 3306}' --user='${user}' --password='${password}' ${database} < ${importFile};`
    ).catch(e => (errorMessage = e))
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
    // Dump and zip the remote db (can make it around 9 times smaller)
    `mysqldump --host='${host}' --port='${port}' --user='${user}' --password='${password}' ${database} | gzip > '${gzipFilePath}'`

export { getDbDumpZipCommands, doDropAllDbTables, doImportDb, doLocalDbDump }
