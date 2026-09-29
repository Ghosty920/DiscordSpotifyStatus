import { randomUUID } from 'crypto';

async function fetchJson(url, options, label) {
	let res;
	try {
		res = await fetch(url, { ...options, signal: AbortSignal.timeout(10_000) });
	} catch (err) {
		throw new Error(`${label}: network error (${err.message})`, { cause: err });
	}

	const text = await res.text();
	if (!res.ok) {
		const error = new Error(`${label}: HTTP ${res.status} ${text.slice(0, 100)}`);
		error.status = res.status;
		throw error;
	}

	try {
		return JSON.parse(text);
	} catch {
		throw new Error(`${label}: invalid JSON: ${text.slice(0, 100)}`);
	}
}

/**
 * @returns {Promise<{'dealer-g2': string[], 'spclient': string[]}>}
 */
export async function resolveDomains() {
	const json = await fetchJson(
		'https://apresolve.spotify.com/?type=dealer-g2&type=spclient',
		{ method: 'GET', headers: { accept: 'application/json' } },
		'resolveDomains'
	);

	if (!json?.['dealer-g2']?.[0] || !json?.spclient?.[0]) {
		throw new Error('resolveDomains: unexpected response shape');
	}
	return json;
}

/**
 * @param {string|undefined} client_id
 * @returns {Promise<{token: string, refresh_after_seconds?: number, expires_after_seconds?: number}>}
 */
export async function fetchClientToken(client_id) {
	const json = await fetchJson(
		'https://clienttoken.spotify.com/v1/clienttoken',
		{
			method: 'POST',
			headers: {
				accept: 'application/json',
				'content-type': 'application/json',
				origin: 'https://open.spotify.com',
				referer: 'https://open.spotify.com/',
				'user-agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
			},
			body: JSON.stringify({
				client_data: {
					client_version: '1.3.4.129.g437aacef09e9',
					client_id: client_id ?? 'd8a5ed958d274c2e8ee717e6a4b0971d',
					js_sdk_data: {
						device_brand: 'unknown',
						device_model: 'unknown',
						os: 'windows',
						os_version: 'NT 10.0',
						device_id: randomUUID(),
						device_type: 'computer',
					},
				},
			}),
		},
		'fetchClientToken'
	);

	if (!json?.granted_token?.token) {
		throw new Error('fetchClientToken: no granted_token in response');
	}
	return json.granted_token;
}

/**
 * @param {{tokenType: string, accessToken: string}} token
 * @param {{token: string}} clientToken
 * @param {string} connectionId
 * @param {{'spclient': string[]}} domains
 * @returns {Promise<number>} The HTTP status code of the response (throws on network error)
 */
export async function subscribeToState(token, clientToken, connectionId, domains) {
	const res = await fetch(`https://${domains['spclient'][0]}/connect-state/v1/devices/subscribe`, {
		method: 'PUT',
		signal: AbortSignal.timeout(10_000),
		headers: {
			authorization: `${token.tokenType} ${token.accessToken}`,
			'client-token': clientToken.token,
			'x-spotify-connection-id': connectionId,
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			member_type: 'CONNECT_STATE',
			device: {
				device_info: {
					capabilities: { can_be_player: false, hidden: true, needs_full_player_state: true },
				},
			},
		}),
	});
	return res.status;
}
