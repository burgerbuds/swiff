import test from 'ava'

const util = require('util');
const exec = util.promisify(require('child_process').exec);

import {
    doesFileExist,
} from './dist/utils'


(async () => {

	const hasConfig = await doesFileExist('swiff.config.js')
	const hasEnv = await doesFileExist('.env')

	if (!hasConfig) console.error('No swiff.config.js')
	if (!hasEnv) console.error('No .env')

	if (!hasConfig || !hasEnv) return

	test('swiff --pull-folders', async t => {
		const { stdout, stderr } = await exec('swiff --pull')
		if (stderr) return t.fail(stderr)
		if (!stdout) return t.fail('No output')
		const result = String(stdout).includes('No pull required, localhost is already up-to-date!')
		if (result) return t.pass(stdout)
		t.fail(`Unknown output:\n\n${stdout}`)
	})

	test('swiff --pull-database', async t => {
		const { stdout, stderr } = await exec('swiff --database')
		if (stderr) return t.fail(stderr)
		if (!stdout) return t.fail('No output')
		const result = String(stdout).includes('First create a database named swf on localhost with these login details')
		if (result) return t.pass(stdout)
		t.fail(`Unknown output:\n\n${stdout}`)
	})

	test('swiff --pull-composer', async t => {
		const { stdout, stderr } = await exec('swiff --composer')
		if (stderr) return t.fail(stderr)
		if (!stdout) return t.fail('No output')
		const result = String(stdout).includes('Your local composer.json and composer.lock were refreshed')
		if (result) return t.pass(stdout)
		t.fail(`Unknown output:\n\n${stdout}`)
	})

	test('swiff --backups', async t => {
		const { stdout, stderr } = await exec('swiff --backups')
		if (stderr) return t.fail(stderr)
		if (!stdout) return t.fail('No output')
		const result = String(stdout).includes('The backups folder was opened')
		if (result) return t.pass(stdout)
		t.fail(`Unknown output:\n\n${stdout}`)
	})

	// test('swiff --ssh', async t => {
	// 	const { stdout, stderr } = await exec('swiff --ssh')
	// 	if (stderr) return t.fail(stderr)
	// 	if (!stdout) return t.fail('No output')
	// 	const result = String(stdout).includes('...')
	// 	if (result) return t.pass(stdout)
	// 	t.fail(`Unknown output:\n\n${stdout}`)
	// })

})()