import protobuf from 'protobufjs';
import { LRUCache } from 'lru-cache'

const proto = await new Promise((resolve, reject) => {
	protobuf.load('protos/extended-metadata.proto', (err, root) => {
		if (err) {
			reject(err);
		} else {
			resolve(root);
		}
	});
});

const cache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 60 * 24,
  updateAgeOnGet: true,
})

const ResponseType = proto.lookupType('spotify.content.contentagnostic.v2.Response');
const IdentityTraitType = proto.lookupType('spotify.content.contentagnostic.v2.IdentityTrait');
const FlagType = proto.lookupType('spotify.content.contentagnostic.v2.Flag');

/**
 * @param {{typeUrl: string, payload: Uint8Array}} typeRef
 * @returns {{kind: string, data: any}}
 */
function decodeTraitPayload(typeRef) {
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
 * @param {{tokenType: string, accessToken: string}} token
 * @param {{token: string}} clientToken
 * @param {string[]} uris
 * @returns {Promise<Record<string, any>|null>}
 */
export async function getMetadata(token, clientToken, ...uris) {
	const result = {};
	const missingUris = [];

	for (const uri of uris) {
		const cached = cache.get(uri);
		if (cached) {
			result[uri] = cached;
		} else {
			missingUris.push(uri);
		}
	}

	if (missingUris.length === 0) {
		return result;
	}

	try {
		const res = await fetch(`https://spclient.wg.spotify.com/extended-metadata/v0/extended-metadata`, {
			method: 'POST',
			headers: {
				accept: 'application/protobuf',
				authorization: `${token.tokenType} ${token.accessToken}`,
				'client-token': clientToken.token,
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				entityRequest: [...missingUris.map(uri => ({ entityUri: uri, query: [{ extensionKind: 178, etag: '' }] }))],
			}),
		});

		if (!res.ok) {
			console.error(`Failed to fetch metadata for ${uris.join(', ')}: ${res.status} ${res.statusText}`);
			console.error(await res.text());
			return null;
		}

		const buffer = Buffer.from(await res.arrayBuffer());
		const message = ResponseType.decode(buffer);
		const traits = message.container.traits;

		const data = Object.fromEntries(
			traits.map(trait => {
				const decoded = decodeTraitPayload(trait.typeRef);
				return [
					trait.uri,
					{
						uri: trait.uri,
						...decoded,
					},
				];
			})
		);

		for (const [uri, metadata] of Object.entries(data)) {
			cache.set(uri, metadata);
		}

		return data;
	} catch (error) {
		console.error(`Error fetching metadata for ${uris.join(', ')}:`, error);
		return null;
	}
}
