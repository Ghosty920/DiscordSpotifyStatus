import http from 'node:http';
import config, { saveConfig } from './config.js';
import { updateToken } from './status.js';
import chalk from 'chalk';

/**
 * @param {(error: any, server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>) => any} callback
 */
export default function startServer(callback) {
	const server = http.createServer(async (req, res) => {
		const redirect_uri = `http://127.0.0.1:${server.address().port}/callback`;

		if (req.url === '/login') {
			const params = new URLSearchParams({
				client_id: config.CLIENT_ID,
				response_type: 'code',
				redirect_uri,
				scope: 'user-read-currently-playing user-read-playback-state',
			});
			res.writeHead(302, {
				Location: 'https://accounts.spotify.com/authorize?' + params,
			});
			res.end();
			return;
		}

		if (req.url.startsWith('/callback')) {
			const code = new URL('http://localhost' + req.url).searchParams.get('code');

			const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization:
						'Basic ' + Buffer.from(config.CLIENT_ID + ':' + config.CLIENT_SECRET).toString('base64'),
				},
				body: new URLSearchParams({
					grant_type: 'authorization_code',
					code,
					redirect_uri,
				}),
			});

			if (!tokenRes.ok) {
				console.error(`Account request failed. (Status ${tokenRes.status})`);
				console.error(await tokenRes.text());
				res.writeHead(501);
				res.end('Account request failed. Check the console for more details.');
				return;
			}

			let data;
			try {
				data = await tokenRes.json();
			} catch(err) {
				console.error(err);
				res.writeHead(501);
				res.end('Invalid data somehow, read the console.');
				return 2;
			}
			config.REFRESH_TOKEN = data.refresh_token;
			config.ACCESS_TOKEN = data.access_token;
			config.EXPIRES_AT = new Date(Date.now() + data.expires_in * 1000).getTime();
			saveConfig();
			console.log(chalk.green('Received an account!'));

			res.writeHead(200);
			res.end('Connected! Check the console to continue.');
			return;
		}

		res.writeHead(404);
		res.end('Not Found');
	});
	server.listen(config.PORT, err => {
		if (typeof callback === 'function') callback(err, server);
	});
}
