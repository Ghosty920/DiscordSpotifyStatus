import config, { saveConfig } from '../../config.js';
import chalk from 'chalk';
import { logError, sliceString } from '../consoleUtils.js';
import { cleanTrackTitle } from '../musicUtils.js';

let rateLimitedUntil = 0;

/**
 * @returns {Promise<0|1|2|{title: string, artist: string, album: string}>}
 *  0 = not logged in, 1 = error / nothing usable, 2 = nothing playing
 */
export default async function getStatus() {
	if (!config.ACCESS_TOKEN) {
		console.log(`Login on http://127.0.0.1:${config.PORT}/login`);
		return 0;
	}
	if (config.EXPIRES_AT < Date.now() + 2000) {
		if (!(await updateToken())) return 0;
	}
	if (Date.now() < rateLimitedUntil) return 1;

	let res;
	try {
		res = await fetch('https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode', {
			headers: { Authorization: 'Bearer ' + config.ACCESS_TOKEN },
			signal: AbortSignal.timeout(10_000),
		});
	} catch (err) {
		logError(err);
		return 1;
	}

	if (res.status === 401) {
		config.EXPIRES_AT = 0; // force a token refresh on the next tick
		return 1;
	}
	if (res.status === 429) {
		const retryAfter = Number(res.headers.get('retry-after')) || 30;
		rateLimitedUntil = Date.now() + retryAfter * 1000;
		console.warn(chalk.yellow(`Spotify rate limit hit, pausing for ${retryAfter}s.`));
		return 1;
	}
	if (!res.ok) return 1;

	const text = await res.text().catch(() => '');
	if (text.length < 3) return 1; // assume is an empty response and that's bad!

	let data;
	try {
		data = JSON.parse(text);
	} catch (err) {
		logError(err);
		console.error(sliceString(text, 200));
		return 1;
	}

	const item = data?.item;
	if (!data?.is_playing || !item) return 2; // paused, or an ad (item is null)

	return {
		title: cleanTrackTitle(item.name ?? ''),
		artist: item.artists?.[0]?.name ?? item.show?.publisher ?? '?',
		album: item.album?.name ?? item.show?.name ?? '?',
	};
}

export async function updateToken() {
	try {
		const res = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			signal: AbortSignal.timeout(10_000),
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
			const body = await res.json().catch(() => ({}));

			// only unlink when the refresh token is revoked
			if (res.status === 400 && body.error === 'invalid_grant') {
				console.warn(chalk.red('Your account is not linked anymore.'));
				config.REFRESH_TOKEN = null;
				config.ACCESS_TOKEN = null;
				config.EXPIRES_AT = 0;
				saveConfig();
				console.log(`Login on http://127.0.0.1:${config.PORT}/login`);
			} else {
				console.warn(chalk.yellow(`Token refresh failed (HTTP ${res.status}), will retry.`));
			}
			return false;
		}

		let data;
		try {
			data = await res.json();
		} catch (err) {
			console.error('Token refresh returned invalid JSON:', err.message);
			return false;
		}

		config.ACCESS_TOKEN = data.access_token;
		config.EXPIRES_AT = Date.now() + data.expires_in * 1000;
		if (data.refresh_token) config.REFRESH_TOKEN = data.refresh_token; // Spotify may rotate it
		saveConfig();
		return true;
	} catch (err) {
		logError(err);
		return false;
	}
}

let nextRefresh = 0;

/**
 * @param {(status: {title: string, artist: string, album: string}) => any} callback
 */
export async function refreshStatus(callback) {
	if (config.USED_METHOD !== 1) return;

	let status = 1;
	try {
		status = await getStatus();
	} catch (err) {
		logError(err);
	}

	clearTimeout(nextRefresh);
	nextRefresh = setTimeout(() => refreshStatus(callback), 10 * 1000);

	if (typeof status === 'object' && status.title) {
		try {
			await callback?.(status);
		} catch (err) {
			logError(err);
		}
	}
}
