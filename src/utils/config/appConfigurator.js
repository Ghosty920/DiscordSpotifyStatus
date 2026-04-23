import chalk from 'chalk';
import config, { saveConfig } from '../../config.js';
import { ask, logError } from '../consoleUtils.js';

export default async function handleAppConfiguration() {
	if (await checkClient(config.CLIENT_ID, config.CLIENT_SECRET)) return;
	if (config.CLIENT_ID) {
		console.warn(chalk.red('Your current app is not valid any more, please setup a new one.'));
		console.log(' ');
	}

	console.log(`Go to ${chalk.blue('https://developer.spotify.com/dashboard')}`);
	console.log(`Create a new app, with a name and a description (can be anything)`);
	console.log(`Add the Redirect URI ${chalk.bgBlack(chalk.white(`http://127.0.0.1:${config.PORT}/callback`))}`);
	console.log(`Click ${chalk.bgBlue(chalk.white('Save'))}, then input the asked values.`);
	console.log(`PS: You do not need to specify anything without the red star ${chalk.red('*')}`);
	console.log(' ');

	let clientId, clientSecret;
	while (true) {
		clientId = (await ask('Client ID: ')).trim().toLowerCase();
		clientSecret = (await ask('Client Secret: ')).trim().toLowerCase();

		if (await checkClient(clientId, clientSecret)) break;

		console.warn(chalk.red('The values you put are invalid. Check again.'));
		console.log(' ');
	}

	config.CLIENT_ID = clientId;
	config.CLIENT_SECRET = clientSecret;
	saveConfig();

	console.log(chalk.green('The app is valid!'));
	console.log(' ');
}

/**
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {boolean}
 */
async function checkClient(clientId, clientSecret) {
	if (typeof clientId !== 'string' || typeof clientSecret !== 'string') return false;

	try {
		const res = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: 'grant_type=client_credentials',
		});
		return res.ok;
	} catch (err) {
		logError(err);
		return false;
	}
}
