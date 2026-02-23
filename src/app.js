import figlet from 'figlet';
import chalk from 'chalk';
import { loadConfig, addGuild, removeGuild, listGuilds } from './config.js';
import readline from 'node:readline';
import startServer from './server.js';
import getStatus from './status.js';
import { loginConfig, setName } from './client.js';
import equal from 'fast-deep-equal';
import { removeDelChars } from './utils.js';

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

await loadConfig();

startServer(async (error, server) => {
	if (error) {
		console.error(error);
		return;
	}

	await loginConfig();

	const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
	console.log('Console commands: type "help" for list of commands.');

	rl.on('line', (input) => {
		const line = removeDelChars(String(input || '')).trim();
		if (!line) return;
		const parts = line.split(' ');
		const cmd = parts.shift().toLowerCase().trim();

		switch (cmd) {
			case 'help':
				console.log('Commands: add <ID> [format], remove <ID>, list, help');
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
			default:
				console.log('Unknown command. Type help for list.');
		}
	});

	let lastStatus;
	setInterval(async () => {
		const status = await getStatus();
		if (equal(status, lastStatus)) return;
		lastStatus = status;

		if (typeof status === 'object') {
			console.log(
				`New music: ${chalk.bgBlueBright(status.title)} by ${chalk.bgBlueBright(status.artist)} in ${chalk.bgBlueBright(status.album)}`
			);
			await setName(status);
		}
	}, 15000);
});
