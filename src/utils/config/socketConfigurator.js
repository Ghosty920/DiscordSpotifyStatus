import chalk from 'chalk';
import config, { saveConfig } from '../../config.js';
import { ask } from '../consoleUtils.js';
import { fetchSpotifyToken } from '../spotify/spotifyToken.js';

export default async function handleSocketConfiguration() {
	const cookie = config.SPOTIFY_COOKIE;

	if (await checkToken(cookie)) return;
	if (cookie) {
		console.warn(chalk.red('Your current cookie is not valid any more, please setup a new one.'));
		console.log(' ');
	}

	console.log(
		chalk.redBright(
			'Warning: Usage of this method is not permitted under the Spotify Developer Terms and Developer Policy, and applicable law.'
		)
	);
	console.log(chalk.redBright('Make sure you understand the low risks before using it.'));
	console.log('To use this method, you need to provide your cookies from Spotify.');
	console.log('You must copy the Spotify page request as cURL, and paste it here.');
	console.log(
		`Don't know how to? Follow ${chalk.blue('https://github.com/Ghosty920/DiscordSpotifyStatus/blob/main/assets/guide-cookie.mp4')}`
	);
	console.log('PS: You must be logged in.');
	console.log(' ');

	let token;
	while (true) {
		const curl = (await ask('Paste it here: ')).trim();
		token = getTokenFromCurl(curl);
		if (await checkToken(token)) break;
		console.warn(chalk.red('The value you put is invalid. Check again.'));
		console.log(' ');
	}

	config.SPOTIFY_COOKIE = token;
	saveConfig();
	console.log(chalk.green('The cookie is valid!'));
	console.log(' ');
}

/**
 * @param {string} curl
 * @returns {string|null}
 */
function getTokenFromCurl(curl) {
	const match = curl.match(/sp_dc=([\w-]+)/);
	console.log(match);
	return match ? match[1] : null;
}

async function checkToken(token) {
	if (!token || typeof token !== 'string' || token.trim().length < 10) return false;

	const res = await fetchSpotifyToken(token);
	if (!res || !res.accessToken) return false;

	return true;
}
