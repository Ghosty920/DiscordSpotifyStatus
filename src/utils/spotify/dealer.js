import config from '../../config.js';
import { sleep } from '../consoleUtils.js';
import { cleanTrackTitle } from '../musicUtils.js';
import { fetchClientToken, resolveDomains, subscribeToState } from './clientData.js';
import { getMetadata } from './metadata.js';
import { fetchSpotifyToken } from './spotifyToken.js';

export default class Dealer {
	/**
	 * @type {WebSocket}
	 */
	ws;

	/**
	 * @type {string}
	 */
	cookie;

	/**
	 * @type {{clientId: string, accessToken: string, accessTokenExpirationTimestampMs: number}}
	 */
	spotifyToken;

	/**
	 * @type {{token: string, refresh_after_seconds: number}}
	 */
	clientToken;

	/**
	 * @type {(music: {title: string, artist: string, album: string}) => any}
	 */
	musicCallback;

	/**
	 * @type {ReturnType<typeof setTimeout>}
	 */
	spotifyTokenRefreshTimeout;

	/**
	 * @type {ReturnType<typeof setTimeout>}
	 */
	clientTokenRefreshTimeout;

	/**
	 * @type {ReturnType<typeof setTimeout>}
	 */
	debounceTimer;

	/**
	 * @type {ReturnType<typeof setTimeout>}
	 */
	pingTimer;

	/**
	 * @type {ReturnType<typeof setTimeout>}
	 */
	reconnectTimer;

	/**
	 * @param {string} cookie The value of the sp_dc cookie from Spotify
	 * @param {(music: {title: string, artist: string, album: string}) => any} callback A callback function that will be called when the music changes, with an object containing title, artist and album.
	 */
	constructor(cookie, callback) {
		this.cookie = cookie;
		this.musicCallback = callback;
	}

	startPing() {
		clearTimeout(this.pingTimer);
		const ping = () => {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				this.ws.send(JSON.stringify({ type: 'ping' }));
				this.pingTimer = setTimeout(ping, 30 * 1000);
			}
		};
		this.pingTimer = setTimeout(ping, 30 * 1000);
	}

	async refreshSpotifyToken() {
		clearTimeout(this.spotifyTokenRefreshTimeout);
		let token = null;
		while (!token) {
			try {
				token = await fetchSpotifyToken(this.cookie);
			} catch (error) {
				console.error('Error fetching Spotify token:', error);
				await sleep(5000);
			}
		}
		this.spotifyToken = token;

		if (token.accessTokenExpirationTimestampMs) {
			this.spotifyTokenRefreshTimeout = setTimeout(
				() => {
					this.refreshSpotifyToken();
				},
				token.accessTokenExpirationTimestampMs - Date.now() - 60 * 1000
			);
		} else {
			console.error('Spotify token does not have an expiration timestamp?', token);
		}
	}

	async refreshClientToken() {
		clearTimeout(this.clientTokenRefreshTimeout);
		let token = null;
		while (!token) {
			try {
				token = await fetchClientToken(this.spotifyToken.clientId);
			} catch (error) {
				console.error('Error fetching client token:', error);
				await sleep(5000);
			}
		}
		this.clientToken = token;

		if (token.refresh_after_seconds) {
			this.clientTokenRefreshTimeout = setTimeout(() => {
				this.refreshClientToken();
			}, token.refresh_after_seconds * 1000);
		} else {
			console.error('Client token does not have a refresh_after_seconds?', token);
		}
	}

	async connect() {
		if (config.USED_METHOD !== 2) return;

		const domains = await resolveDomains();
		await this.refreshSpotifyToken();
		await this.refreshClientToken();

		if (this.ws) {
			this.ws.onopen = this.ws.onmessage = this.ws.onclose = null;
			try {
				this.ws.close();
			} catch {}
		}

		let lastUriSeen = null;

		this.ws = new WebSocket(`wss://${domains['dealer-g2'][0]}/?access_token=${this.spotifyToken.accessToken}`);
		this.ws.onopen = () => {
			console.log('Connected to Spotify websocket');
			this.startPing();
		};
		this.ws.onmessage = async msg => {
			const data = JSON.parse(msg.data);
			if (data.method === 'PUT') {
				const connectionId = data.headers['Spotify-Connection-Id'];
				const subscribeRes = await subscribeToState(this.spotifyToken, this.clientToken, connectionId, domains);
				return;
			}

			if (data.payloads) {
				let trackData = null;

				for (const payload of data.payloads) {
					const music = payload?.cluster?.player_state;
					const metadata = music?.track?.metadata;
					if (metadata) {
						const uri = metadata.requested_uri;

						if (uri === lastUriSeen) return;
						lastUriSeen = uri;

						let title = metadata.title;
						let artist = undefined; // not available by default thanks spotify <3
						let album = metadata.album_title;

						const data = await getMetadata(this.spotifyToken, this.clientToken, uri);
						const uriData = data?.[uri]?.data;
						if (uriData) {
							title = uriData?.title;
							artist = uriData?.artists?.[0]?.name;
							album = uriData?.album?.name;
						}

						if (!title) return;
						trackData = {
							title: cleanTrackTitle(title),
							artist: artist ?? '?',
							album: album ?? '?',
						};
					}
				}

				if (trackData) {
					clearTimeout(this.debounceTimer);
					this.debounceTimer = setTimeout(() => {
						this.musicCallback?.(trackData);
					}, 3000);
				}
			}
		};
		this.ws.onclose = () => {
			console.log('Disconnected from Spotify websocket');
			clearTimeout(this.pingTimer);
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = setTimeout(() => {
				this.connect();
			}, 5 * 1000);
		};
	}
}
