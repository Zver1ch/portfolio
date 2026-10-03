/** Placeholder hrefs like "TODO: ссылка" must not become broken anchors. */
export function isWebLink(href: string | undefined): href is string {
	if (!href) return false
	try {
		const url = new URL(href)
		return url.protocol === 'https:' || url.protocol === 'http:'
	} catch {
		return false
	}
}
