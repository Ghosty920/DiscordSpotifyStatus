/**
 * @param {string} title
 * @returns {string}
 */
export function cleanTrackTitle(title) {
	const regex =
		/\s*(?:(?:[-([]\s*[\s\w'"]*(?:bonus|remix|medley|jazz|phonk|remaster|slowed|spee?d up|nightcore|instrumental|tv ver|version|style)[\s\w'".-]*[-)\]]?)|(?:[-([](?:f(?:ea)?t|with|from)\.?(?:[\s\w'"&,]|\p{L})*[-)\]]?))+$/iu;
	return title.replace(regex, '');
}
