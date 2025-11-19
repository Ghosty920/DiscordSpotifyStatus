import config, { saveConfig } from './config.js';
import chalk from 'chalk';
import { logError } from './utils.js';

export default async function getStatus() {
	if (!config.ACCESS_TOKEN) {
		console.log(`Login on http://127.0.0.1:${config.PORT}/login`);
		return 0;
	}
	if (config.EXPIRES_AT < Date.now() + 2000) {
		if (!(await updateToken())) return 0;
	}

	let data;
	try {
		const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
			headers: { Authorization: 'Bearer ' + config.ACCESS_TOKEN },
		});
		if (!res.ok) return 1;
		data = await res.json();
	} catch (err) {
		logError(err);
		return 1;
	}

	if (!data.is_playing) return 2;

	let title = data.item.name;
	title = /^(.*?)(?:\s*\((?:feat|ft)[^)]+\))?$/gi.exec(title)[1] ?? title;

	return {
		title: data.item.name,
		artist: data.item.artists[0].name,
		album: data.item.album.name,
	};
}

export async function updateToken() {
	try {
		const res = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: 'Basic ' + Buffer.from(config.CLIENT_ID + ':' + config.CLIENT_SECRET).toString('base64'),
			},
			body: new URLSearchParams({
				grant_type: 'refresh_token',
				refresh_token: config.REFRESH_TOKEN,
			}),
		});

		if (!res.ok) {
			console.warn(chalk.red('Your account is not linked anymore.'));
			config.REFRESH_TOKEN = null;
			config.ACCESS_TOKEN = null;
			config.EXPIRES_AT = 0;
			saveConfig();
			console.log(`Login on http://127.0.0.1:${config.PORT}/login`);
			return false;
		}

		let data;
		try {
			data = await res.json();
		} catch (err) {
			console.error(err);
			return false;
		}

		config.ACCESS_TOKEN = data.access_token;
		config.EXPIRES_AT = new Date(Date.now() + data.expires_in * 1000).getTime();
		saveConfig();
		return true;
	} catch (err) {
		logError(err);
		return false;
	}
}
