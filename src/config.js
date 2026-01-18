import { join as pathJoin } from 'node:path';
import { ask, logError } from './utils.js';
import fs from 'node:fs';
import chalk from 'chalk';

function getConfigPath() {
	if (typeof process.pkg === 'undefined') return new URL('../config.json', import.meta.url);

	const name = 'DiscordSpotifyStatus';
	if (process.platform === 'win32') {
		return pathJoin(process.env.APPDATA, name, 'config.json');
	}
	if (process.platform === 'darwin') {
		return pathJoin(process.env.HOME, 'Library', 'Application Support', name, 'config.json');
	}
	return pathJoin(process.env.HOME, '.config', name, 'config.json');
}

let config = {
	WARNING: 'Do not share this config with anyone, as it contains sensible data!',

	CLIENT_ID: process.env.CLIENT_ID ?? null,
	CLIENT_SECRET: process.env.CLIENT_SECRET ?? null,
	PORT: Number(process.env.PORT || '61174'),

	REFRESH_TOKEN: null,
	ACCESS_TOKEN: null,
	EXPIRES_AT: 0,

	DISCORD_TOKEN: process.env.TOKEN ?? null,
	DISCORD_INTERVAL: 1000,
	GUILDS: {},
};

export default config;

const configPath = getConfigPath();

export async function loadConfig() {
	if (fs.existsSync(configPath)) {
		const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
		Object.assign(config, data);
	} else {
		saveConfig();
	}

	if (await checkClient(config.CLIENT_ID, config.CLIENT_SECRET)) return;
	if (config.CLIENT_ID) {
		console.warn(chalk.red('Your current app is not valid anymore, please setup a new one.'));
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

export function saveConfig() {
	fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf-8');
}

/**
 * Add a guild ID with an optional format string.
 * @param {string} id
 * @param {string} [format]
 */
export function addGuild(id, format = '[[DISPLAY]] - [[TITLE]]') {
	if (typeof id !== 'string' || !id.trim()) return false;
	config.GUILDS[id] = format;
	saveConfig();
	console.log(chalk.green(`Added guild ${id}`));
	return true;
}

/**
 * Remove a guild ID.
 * @param {string} id
 */
export function removeGuild(id) {
	if (typeof id !== 'string' || !id.trim()) return false;
	if (!(id in config.GUILDS)) return false;
	delete config.GUILDS[id];
	saveConfig();
	console.log(chalk.yellow(`Removed guild ${id}`));
	return true;
}

export function listGuilds() {
	return config.GUILDS;
}
