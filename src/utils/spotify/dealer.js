import config from '../../config.js';
import { cleanTrackTitle } from '../musicUtils.js';
import { fetchClientToken, resolveDomains, subscribeToState } from './clientData.js';
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
	 * @type {(music: {title: string, artist: string, album: string}) => any}
	 */
	musicCallback;

	/**
	 * @type {ReturnType<typeof setTimeout>}
	 */
	debounceTimer;

	/**
	 * @param {string} cookie The value of the sp_dc cookie from Spotify
	 * @param {(music: {title: string, artist: string, album: string}) => any} callback A callback function that will be called when the music changes, with an object containing title, artist and album.
	 */
	constructor(cookie, callback) {
		this.cookie = cookie;
		this.musicCallback = callback;

		let nextPing = setTimeout(() => ping(), 30 * 1000);
		const ping = () => {
			if (this.ws.readyState === WebSocket.OPEN) {
				this.ws.send(JSON.stringify({ type: 'ping' }));
				nextPing = setTimeout(() => ping(), 30 * 1000);
			}
		};
	}

	async connect() {
		if (config.USED_METHOD !== 2) return;

		const domains = await resolveDomains();
		const token = await fetchSpotifyToken(this.cookie);
		const clientToken = await fetchClientToken(token.clientId);
		this.ws = new WebSocket(`wss://${domains['dealer-g2'][0]}/?access_token=${token.accessToken}`);
		this.ws.onopen = () => {
			console.log('Connected to Spotify websocket');
		};
		this.ws.onmessage = async msg => {
			const data = JSON.parse(msg.data);
			if (data.method === 'PUT') {
				const connectionId = data.headers['Spotify-Connection-Id'];
				const subscribeRes = await subscribeToState(token, clientToken, connectionId, domains);
				return;
			}

			if (data.payloads) {
				let trackData = null;

				for (const payload of data.payloads) {
					const music = payload?.cluster?.player_state;
					const metadata = music?.track?.metadata;
					if (metadata) {
						trackData = {
							title: cleanTrackTitle(metadata?.title),
							artist: '?', // not available thanks spotify <3
							album: metadata?.album_title,
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
			setTimeout(() => {
				this.connect();
			}, 5 * 1000);
		};
	}
}
