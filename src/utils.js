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
