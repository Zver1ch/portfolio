/** Scroll length of a pinned chapter, in viewport heights. */
export function pinEnd(viewportHeights: number) {
	return () => `+=${Math.round(window.innerHeight * viewportHeights)}`
}
