import chalk from 'chalk';
import config, { saveConfig } from './config.js';
import { Client } from 'discord.js-selfbot-v13';
import { ask, sleep } from './utils.js';

const client = new Client();

export async function loginConfig() {
	try {
		await login(config.DISCORD_TOKEN);
		console.log(chalk.greenBright(`Logged in as ${client.user.tag}`));
	} catch (err) {
		if (err === 0) {
			console.log(
				`Open Discord. Press ${chalk.bgBlack('Ctrl + Shift + I')} (or whatever keys to open Developer Tools)`
			);
			console.log(`Go in the ${chalk.bgBlack('Console')} category, and paste the following code:`);
			console.log(
				chalk.bgGray(
					'window.webpackChunkdiscord_app.push([[Symbol()],{},o=>{for(let e of Object.values(o.c))try{if(!e.exports||e.exports===window)continue;e.exports?.getToken&&(token=e.exports.getToken());for(let o in e.exports)e.exports?.[o]?.getToken&&"IntlMessagesProxy"!==e.exports[o][Symbol.toStringTag]&&(token=e.exports[o].getToken())}catch{}}]),window.webpackChunkdiscord_app.pop(),token;'
				)
			);
			console.log('PS: You may need to type "allow pasting" and pressing Enter first.');

			while (true) {
				console.log(' ');
				const token = (await ask('Paste your token: ')).trim().replace(/['"]/g, '');
				try {
					await login(token);
					config.DISCORD_TOKEN = token;
					saveConfig();
					console.log(chalk.greenBright(`Logged in as ${client.user.tag}`));
					break;
				} catch (err) {
					console.error(chalk.red('Invalid token. Please check and try again.'));
				}
			}
		}
	}
}

export function login(token) {
	return new Promise((resolve, reject) => {
		if (typeof token !== 'string') return reject(0);

		client.login(token).catch(reject);
		client.once('ready', () => {
			resolve();
		});
	});
}

export async function setName(status) {
	if (!client.isReady()) return;

	let failed = 0;
	for (const guildId of Object.keys(config.GUILDS)) {
		const guild = client.guilds.cache.get(guildId);
		if (!guild) continue;
		if (!guild.members.me.permissions.has('CHANGE_NICKNAME', true)) continue;

		const formatted = config.GUILDS[guildId]
			.replaceAll('[[TITLE]]', status.title)
			.replaceAll('[[ARTIST]]', status.artist)
			.replaceAll('[[ALBUM]]', status.album)
			.replaceAll('[[DISPLAY]]', client.user.displayName);
		if (guild.members.me.nickname === formatted) continue;

		try {
			await guild.members.me.setNickname(formatted);
		} catch (err) {
			failed++;
		}
		await sleep(config.DISCORD_INTERVAL);
	}
	const success = Object.keys(config.GUILDS).length - failed;
	console.log(chalk.gray(`Updated on ${success} server${success > 1 ? 's' : ''}.`));
	if (failed > 0) console.warn(chalk.redBright(`Failed on ${failed} server${failed > 1 ? 's' : ''}.`));
}
