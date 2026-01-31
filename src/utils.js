import readline from 'readline';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

/**
 * @param {string} question
 * @returns {Promise<string>}
 */
export function ask(question) {
	return new Promise(resolve => rl.question(question, resolve));
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
}

export function logError(err) {
	if (!err) return console.error('Unknown error happened!');
	if (typeof err === 'number') return;
	if (err.code === 'EAI_AGAIN') return console.error(`DNS lookup timed out for ${err.hostname} (${err.code})`);
	return console.error(err);
}

/**
 * @param {string} title
 * @returns {string}
 */
export function cleanTrackTitle(title) {
	const regex =
		/\s*(?:(?:[-([]\s*[\s\w'"]*(?:bonus|remix|medley|jazz|phonk|remaster|slowed|spee?d up|nightcore|instrumental|tv ver|version|style)[\s\w'".-]*[-)\]]?)|(?:[-([](?:f(?:ea)?t|with|from)\.?[\s\w'"&,-]*[-)\]]?))+$/i;
	return title.replace(regex, '');
}
