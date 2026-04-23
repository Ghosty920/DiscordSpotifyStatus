// this code was made by claude cause i cbaed to reverse it myself, thanks claude <3
/**
 * Reproduction of Spotify Web Player's /api/token TOTP param generation.
 *
 * Reverse-engineered from web-player.js (webpack bundle).
 *
 * Dependencies:
 *   npm install otpauth
 *
 * Flow:
 *  1. Derive the TOTP secret from the obfuscated raw string (XOR transform).
 *  2. Generate two TOTP codes:
 *     - `totp`       → based on local Date.now()
 *     - `totpServer` → based on server time from /api/server-time (if available)
 *  3. Build URLSearchParams for GET /api/token
 */

const location = {
	origin: 'https://open.spotify.com',
};

import * as OTPAuth from 'otpauth'; // npm install otpauth

// ─── 1. Secret versions (as found in the bundle) ────────────────────────────

const SECRET_VERSIONS = [
	{ secret: ',7/*F("rLJ2oxaKL^f+E1xvP@N', version: 61 },
	{ secret: 'OmE{ZA.J^":0FG\\Uz?[@WW', version: 60 },
	{ secret: '{iOFn;4}<1PFYKPV?5{%u14]M>/V0hDH', version: 59 },
];

// ─── 2. Key derivation (XOR obfuscation) ────────────────────────────────────

/**
 * Derives the OTPAuth Secret from Spotify's obfuscated raw string.
 *
 * Each character is XOR'd with: (charIndex % XOR_MOD) + XOR_OFFSET
 * The resulting bytes are hex-encoded then parsed as an OTPAuth.Secret.
 */
function deriveSecret(rawString) {
	const XOR_MOD = 33;
	const XOR_OFFSET = 9;

	const xored = rawString.split('').map((char, i) => char.charCodeAt(0) ^ ((i % XOR_MOD) + XOR_OFFSET));

	const hex = Buffer.from(xored.join(''), 'utf8').toString('hex');
	return OTPAuth.Secret.fromHex(hex);
}

// ─── 3. TOTP configuration (as found in the bundle) ─────────────────────────

const TOTP_CONFIG = {
	period: 30, // seconds
	algorithm: 'SHA1',
	digits: 6,
};

// Build using the latest (first) secret version
const activeVersion = SECRET_VERSIONS[0];
const secret = deriveSecret(activeVersion.secret);

const totp = new OTPAuth.TOTP({
	...TOTP_CONFIG,
	secret,
});

// ─── 4. Server time helper ───────────────────────────────────────────────────

/**
 * Fetches Spotify's server time (Unix seconds).
 * Used to synchronise the "totpServer" code with the server clock.
 * Falls back to null on timeout or error (4s timeout).
 */
async function fetchServerTime() {
	try {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 4_000);

		const res = await fetch('/api/server-time', { signal: controller.signal });
		clearTimeout(timer);

		const { serverTime } = await res.json();
		const parsed = Number(serverTime);
		return !isNaN(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

// ─── 5. Build query params ───────────────────────────────────────────────────

/**
 * Builds the URLSearchParams object matching:
 *   GET /api/token?reason=init&productType=web-player&totp=...&totpServer=...&totpVer=61
 *
 * @param {"init"|string} reason      - Token request reason
 * @param {string}        productType - e.g. "web-player"
 * @param {number|null}   serverTime  - Unix timestamp (seconds) from /api/server-time
 * @returns {URLSearchParams}
 */
function buildTokenParams(reason, productType, serverTime) {
	const totpLocal = totp.generate({ timestamp: Date.now() });

	// totpServer uses server-side time if available, otherwise "unavailable"
	//const totpServer =
	//	serverTime != null && !isNaN(serverTime) ? totp.generate({ timestamp: serverTime * 1_000 }) : 'unavailable';
	const totpServer = 'unavailable';

	return new URLSearchParams({
		reason,
		productType,
		totp: totpLocal,
		totpServer,
		totpVer: String(activeVersion.version),
	});
}

// ─── 6. Fetch /api/token (init) ──────────────────────────────────────────────

/**
 * Replicates Spotify's initial token fetch.
 *
 * @param {string} cookie - The "sp_dc" cookie value from the user's browser session.
 * @returns {Promise<{accessToken: string, tokenType: "Bearer", clientId: string, ...}>}
 */
export async function fetchSpotifyToken(cookie) {
	const serverTime = await fetchServerTime();
	const params = buildTokenParams('init', 'web-player', serverTime);

	const url = new URL('/api/token', location.origin);
	url.search = params.toString();

	const res = await fetch(url, {
		headers: {
			cookie: `sp_dc=${cookie}`,
		},
	});
	const json = await res.json();

	return { ...json, tokenType: 'Bearer' };
}

// ─── 7. Quick sanity check (Node / browser) ──────────────────────────────────

// Uncomment to test locally (Node.js):
// console.log(buildTokenParams("init", "web-player", null).toString());
// console.log(await fetchSpotifyToken('cookie_value'));
