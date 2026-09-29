import protobuf from 'protobufjs';
import { LRUCache } from 'lru-cache';

const proto = await protobuf.load('protos/extended-metadata.proto');

const cache = new LRUCache({
	max: 500,
	ttl: 1000 * 60 * 60 * 24,
	updateAgeOnGet: true,
});

const ResponseType = proto.lookupType('spotify.content.contentagnostic.v2.Response');
const IdentityTraitType = proto.lookupType('spotify.content.contentagnostic.v2.IdentityTrait');
const FlagType = proto.lookupType('spotify.content.contentagnostic.v2.Flag');

/**
 * @param {{typeUrl: string, payload: Uint8Array}|null|undefined} typeRef
 * @returns {{kind: string, data?: any, typeUrl?: string, rawPayload?: string}|null}
 */
function decodeTraitPayload(typeRef) {
	if (!typeRef?.typeUrl) return null; // typeRef can be null

	const { typeUrl, payload } = typeRef;

	if (typeUrl.endsWith('IdentityTrait')) {
		return { kind: 'IdentityTrait', data: IdentityTraitType.decode(payload).toJSON() };
	}

	if (typeUrl.endsWith('EntityTypeTrait')) {
		return { kind: 'EntityTypeTrait', data: FlagType.decode(payload).toJSON() };
	}

	return { kind: 'Unknown', typeUrl, rawPayload: Buffer.from(payload).toString('hex') };
}

/**
 * Fetches metadata for the given URIs.
 * Throws on failure; the error has a `.status` property for HTTP errors (e.g. 401).
 *
 * @param {{tokenType: string, accessToken: string}} token
 * @param {{token: string}} clientToken
 * @param {string[]} uris
 * @returns {Promise<Record<string, {uri: string, kind: string, data?: any}>>}
 */
export async function getMetadata(token, clientToken, ...uris) {
	const result = {};
	const missingUris = [];

	for (const uri of uris.filter(Boolean)) {
		const cached = cache.get(uri);
		if (cached) {
			result[uri] = cached;
		} else {
			missingUris.push(uri);
		}
	}

	if (missingUris.length === 0) return result;

	let res;
	try {
		res = await fetch('https://spclient.wg.spotify.com/extended-metadata/v0/extended-metadata', {
			method: 'POST',
			signal: AbortSignal.timeout(10_000),
			headers: {
				accept: 'application/protobuf',
				authorization: `${token.tokenType} ${token.accessToken}`,
				'client-token': clientToken.token,
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				entityRequest: missingUris.map(uri => ({ entityUri: uri, query: [{ extensionKind: 178, etag: '' }] })),
			}),
		});
	} catch (err) {
		throw new Error(`metadata network error for ${missingUris.join(', ')}: ${err.message}`, { cause: err });
	}

	if (!res.ok) {
		const body = (await res.text().catch(() => '')).slice(0, 100);
		const error = new Error(
			`metadata HTTP ${res.status} ${res.statusText} for ${missingUris.join(', ')} ${body}`.trim()
		);
		error.status = res.status;
		throw error;
	}

	const buffer = Buffer.from(await res.arrayBuffer());
	const message = ResponseType.decode(buffer);
	const traits = message?.container?.traits ?? [];

	for (const trait of traits) {
		if (!trait?.uri) continue;

		let decoded;
		try {
			decoded = decodeTraitPayload(trait.typeRef);
		} catch (err) {
			console.warn(`Could not decode trait for ${trait.uri}: ${err.message}`);
			continue;
		}
		if (!decoded) continue;

		// several traits can share the same URI
		if (result[trait.uri]?.kind === 'IdentityTrait' && decoded.kind !== 'IdentityTrait') continue;

		result[trait.uri] = { uri: trait.uri, ...decoded };
	}

	// only cache what is actually useful
	for (const uri of missingUris) {
		if (result[uri]?.kind === 'IdentityTrait') cache.set(uri, result[uri]);
	}

	return result;
}
