/**
 * A scroll correction that survives the smooth scroller. While Lenis runs
 * (fine pointers) it ignores native scrolling and writes its own position
 * on the next frame, so a `window.scrollBy` would be undone: the scroller
 * registers a jumper here and corrections go through it.
 */

export type ScrollJumper = (delta: number) => void

let jumper: ScrollJumper | null = null

export function registerScrollJumper(next: ScrollJumper | null) {
	jumper = next
}

/** Moves the page by `delta` CSS px at once, through the smooth scroller when one runs. */
export function jumpScrollBy(delta: number) {
	if (jumper) jumper(delta)
	else window.scrollBy(0, delta)
}
