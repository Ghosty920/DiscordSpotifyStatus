/**
 * @param {string} title
 * @returns {string}
 */
export function cleanTrackTitle(title) {
	const regex =
		/\s*(?:(?:[-([]\s*[\s\w'"]*(?:bonus|remix|medley|jazz|phonk|remaster|slowed|spee?d up|nightcore|instrumental|(?:tv|cut) ver|version|style|f(?:ea)?t|with|from).*)[-)\]]?)+$/iu;
	return title.replace(regex, '');
}
