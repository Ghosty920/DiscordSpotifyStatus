/**
 * @param {string} title
 * @returns {string}
 */
export function cleanTrackTitle(title) {
	const regex =
		/\s*(?:(?:[-([]\s*[\s\w'"]*(?:bonus|(re)?mix|medley|jazz|phonk|remaster|slowed|spee?d up|nightcore|dubstep|extended|loop|best\s?part|instrumental|(?:tv|cut) ver|version|style|f(?:ea)?t|with|from).*)[-)\]]?)+$/iu;
	return title.replace(regex, '');
}
