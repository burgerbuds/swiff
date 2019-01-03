/**
 * Swiff Project Configuration
 *
 * Head to 'https://github.com/simple-integrated-marketing/swiff' for further information.
 */
module.exports = {
    server: {
        // The username for connecting to the host server
        user: 'swf3',
        // The IP/hostname of the remote host
        // eg '100.10.10.100'
        host: '103.43.75.117',
        // The working directory for the remote app folder
        // eg: '/srv/users/[user]/apps/[app]'
        appPath: '/srv/users/swf3/apps/swf3',
    },
    // Folders to upload and sync with the server
    pushFolders: ['asdf'],
    // Folders to pull new or changed files from
    pullFolders: ['asdf'],
}
