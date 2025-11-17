import figlet from 'figlet';
import chalk from 'chalk';
import config, { loadConfig } from './config.js';
import startServer from './server.js';
import getStatus from './status.js';
import { loginConfig, setName } from './client.js';
import equal from 'fast-deep-equal';

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
