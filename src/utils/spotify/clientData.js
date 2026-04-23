import { randomUUID } from 'crypto';

/**
 * @returns {Promise<{'dealer-g2': `${string}-dealer.g2.spotify.com:443`[], 'spclient': `${string}-spclient.spotify.com:443`[]}>}
 */
export async function resolveDomains() {
	const res = await fetch('https://apresolve.spotify.com/?type=dealer-g2&type=spclient', {
		method: 'GET',
		headers: {
			accept: 'application/json',
		},
	});
	const json = await res.json();
	return json;
}

/**
 * @param {string|undefined} client_id
 * @returns {Promise<{token: string, ...}>}
 */
export async function fetchClientToken(client_id) {
	const res = await fetch('https://clienttoken.spotify.com/v1/clienttoken', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			accept: 'application/json',
		},
		body: JSON.stringify({
			client_data: {
				client_version: '1.2.89.223.g9f1cb0f7',
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
	});
	const json = await res.json();
	return json.granted_token;
}

/**
 * @param {{tokenType: string, accessToken: string}} token
 * @param {{token: string}} clientToken
 * @param {string} connectionId
 * @param {{'spclient': `${string}-spclient.spotify.com:443`[]}} domains
 * @returns {Promise<number>} The HTTP status code of the response
 */
export async function subscribeToState(token, clientToken, connectionId, domains) {
	const res = await fetch(`https://${domains['spclient'][0]}/connect-state/v1/devices/subscribe`, {
		method: 'PUT',
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
