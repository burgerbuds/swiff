/**
 * Swiff Project Configuration
 *
 * Head to 'https://github.com/simple-integrated-marketing/swiff' for further information.
 */
module.exports = {
    // Remote SSH server details
    server: {
        // The SSH login username
        user: '',
        // The IP/hostname of the remote server (eg: 100.100.100.100)
        host: '',
        // The working directory of the remote app folder
        // eg: /srv/users/[user]/apps/[app]
        appPath: '',
        // The SSH port to connect on (22 is the SSH default)
        port: 22,
    },
    // Folders to upload and sync with the server
    // eg: pushFolders: ['templates', 'config', 'public/assets/build'],
    pushFolders: [],
    // Folders to pull new or changed files from
    // eg: pullFolders: ['public/assets/volumes'],
    pullFolders: [],
    // disabled: ['folderPull', 'databasePush'],
}
