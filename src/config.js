import { join as pathJoin } from 'node:path';
import { ask, logError } from './utils/consoleUtils.js';
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

const defaultConfig = Object.freeze({
	WARNING: 'Do not share this config with anyone, as it contains sensible data!',

	/**
	 * 0 = None, 1 = Spotify App, 2 = Spotify Socket
	 */
	USED_METHOD: 0,

	CLIENT_ID: process.env.CLIENT_ID ?? null,
	CLIENT_SECRET: process.env.CLIENT_SECRET ?? null,
	PORT: Number(process.env.PORT || '61174'),
	REFRESH_TOKEN: null,
	ACCESS_TOKEN: null,
	EXPIRES_AT: 0,

	SPOTIFY_COOKIE: process.env.SPOTIFY_COOKIE ?? null,

	DISCORD_TOKEN: process.env.TOKEN ?? null,
	DISCORD_INTERVAL: 1000,
	GUILDS: {},
});

let config = { ...defaultConfig };

export default config;

const configPath = getConfigPath();

export async function loadConfig() {
	if (fs.existsSync(configPath)) {
		const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
		Object.assign(config, data);
	} else {
		saveConfig();
	}

	let usedMethod = config.USED_METHOD;
	if (usedMethod === 0) {
		console.log("Welcome! It seems like this is your first time running the program. Let's set it up!");
		console.log('You can choose between two methods to fetch your Spotify status:');
		console.log(
			`1. ${chalk.blue('Spotify App')}: Fetches the status directly from a Spotify dev application. Safer, but requires ${chalk.green('Spotify Premium')} to work.`
		);
		console.log(`2. ${chalk.blue('Spotify Socket')}: Fetches the status from Spotify's official client websocket.`);
		console.log(' ');
		while (true) {
			const choice = (await ask('Choose a method (type the number): ')).trim().toLowerCase();
			if (choice === '1' || choice === 'spotify app') {
				usedMethod = 1;
				break;
			} else if (choice === '2' || choice === 'spotify socket') {
				usedMethod = 2;
				break;
			} else {
				console.log(chalk.red('Invalid choice, please type again.'));
			}
		}
	}

	if (usedMethod === 1) {
		const { default: handleAppConfiguration } = await import('./utils/config/appConfigurator.js');
		await handleAppConfiguration();
	} else if (usedMethod === 2) {
		const { default: handleSocketConfiguration } = await import('./utils/config/socketConfigurator.js');
		await handleSocketConfiguration();
	}
	config.USED_METHOD = usedMethod;
	saveConfig();
}

export async function eraseConfig() {
	config = { ...defaultConfig };
	saveConfig();
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
