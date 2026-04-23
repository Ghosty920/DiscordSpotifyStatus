import figlet from 'figlet';
import chalk from 'chalk';
import config, { loadConfig, addGuild, removeGuild, listGuilds, eraseConfig } from './config.js';
import readline from 'node:readline';
import startServer from './server.js';
import getStatus, { refreshStatus } from './utils/spotify/appStatus.js';
import { loginConfig, setName } from './client.js';
import equal from 'fast-deep-equal';
import { removeDelChars } from './utils/consoleUtils.js';
import Dealer from './utils/spotify/dealer.js';

await new Promise(resolve => {
	figlet('DSs', { font: 'Univers' }, (err, data) => {
		if (err) return console.error(err);
		const spaced = data
			.split('\n')
			.map(line => ' '.repeat(5) + line)
			.join('\n');
		console.log(chalk.cyan(spaced));
		resolve();
	});
});

let lastStatus;

async function start() {
	await loadConfig();
	await loginConfig();

	const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
	console.log('Console commands: type "help" for list of commands.');
	rl.on('line', input => {
		const line = removeDelChars(String(input || '')).trim();
		if (!line) return;
		const parts = line.split(' ');
		const cmd = parts.shift().toLowerCase().trim();

		switch (cmd) {
			case 'help':
				console.log('Commands: add <ID> [format], remove <ID>, list, refresh, reset, help');
				break;
			case 'add': {
				const id = parts.shift();
				if (!id) return console.log('Usage: add <ID> [format]');
				const format = parts.join(' ').trim() || '[[DISPLAY]] - [[TITLE]]';
				addGuild(id, format.length > 2 ? format : undefined);
				break;
			}
			case 'remove': {
				const id = parts.shift();
				if (!id) return console.log('Usage: remove <ID>');
				if (!removeGuild(id)) console.log('Guild not found');
				break;
			}
			case 'list': {
				const guilds = listGuilds();
				if (!Object.keys(guilds).length) return console.log('No guilds configured.');
				for (const [gid, fmt] of Object.entries(guilds)) console.log(`${gid}: ${fmt}`);
				break;
			}
			case 'refresh': {
				lastStatus = null;
				break;
			}
			case 'reset': {
				lastStatus = null;
				eraseConfig();
				console.log(chalk.red("Config reset. You'll be prompted the installation steps again."));
				loadConfig();
				rl.close();
				server.close();
				break;
			}
			default:
				console.log('Unknown command. Type help for list.');
		}
	});

	const musicCallback = async status => {
		if (equal(status, lastStatus)) return;
		lastStatus = status;
		console.log(
			`New music: ${chalk.bgBlueBright(status.title)} by ${chalk.bgBlueBright(status.artist)} in ${chalk.bgBlueBright(status.album)}`
		);
		await setName(status);
	};

	if (config.USED_METHOD === 1) {
		startServer(async (error, server) => {
			if (error) {
				console.error(error);
				return;
			}
			setTimeout(() => refreshStatus(musicCallback), 5 * 1000);
		});
	} else if (config.USED_METHOD === 2) {
		const dealer = new Dealer(config.SPOTIFY_COOKIE, musicCallback);
		await dealer.connect();
	}
}

await start();
