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
 * @param {string} str
 * @returns {string}
 */
export function removeDelChars(str) {
	let result = str;
	while (true) {
		const index = result.indexOf('\x7f');
		if (index === -1) break;
		const start = Math.max(0, index - 1);
		result = result.slice(0, start) + result.slice(index + 1);
	}
	return result;
}

/**
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
export function sliceString(str, max) {
	if (str.length <= max) return str;
	return str.slice(0, max) + '…';
}
