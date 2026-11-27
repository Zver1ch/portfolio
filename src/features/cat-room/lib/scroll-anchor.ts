import { jumpScrollBy } from '@/shared/lib/gsap/scroll-jump'

/**
 * Keeps the reader's place across a layout change (plan §3.4). The mode's
 * CSS adds or removes the lite spacers and the full-mode stages add or lose
 * their pin spacers, a couple of screens of height above whatever the
 * reader is looking at, and engines without scroll anchoring (WebKit) would
 * leave them that far off. The landmark the reader is in (`findScrollAnchor`)
 * is noted before the change, from the event that causes it, and scrolled back
 * to the same place on the frame after React's commit: by then the layout
 * is complete and ScrollTrigger's own refreshes, which restore a scroll
 * position recorded before the change and clamped meanwhile, are done.
 */

const LANDMARKS = 'main section[id], footer, [data-credits-roll]'
/** A landmark starting below this share of the viewport is the next one, not the reader's. */
const READING_SHARE = 0.3

export type ScrollAnchor = { element: Element; top: number }

/**
 * The landmark the reader is in: the last one starting in the upper part
 * of the viewport or above it, else the first one; a landmark nested in it
 * and showing (the credits over the finale's footer) is what they look at.
 * Sections and the footer are in the flow in every mode, so their document
 * position is what the reader keeps; a section reflowing to a new width
 * must not drag the one above it.
 */
export function findScrollAnchor(
	root: ParentNode = document,
	viewportHeight = window.innerHeight,
): ScrollAnchor | null {
	const elements = Array.from(root.querySelectorAll(LANDMARKS))
	let chosen = elements[0]
	for (const element of elements)
		if (
			element.getBoundingClientRect().top <=
			viewportHeight * READING_SHARE
		)
			chosen = element
	if (chosen)
		for (const element of elements) {
			const rect = element.getBoundingClientRect()
			if (
				element !== chosen &&
				chosen.contains(element) &&
				rect.bottom > 0 &&
				rect.top < viewportHeight
			)
				chosen = element
		}
	return chosen
		? { element: chosen, top: chosen.getBoundingClientRect().top }
		: null
}

/** After the layout changed: scroll so the landmark sits where it was. */
export function keepScrollAnchor(anchor: ScrollAnchor) {
	const delta = anchor.element.getBoundingClientRect().top - anchor.top
	if (Math.abs(delta) > 0.5) jumpScrollBy(delta)
}

let pending: ScrollAnchor | null = null
let frame = 0
/** The place as of the reader's last scroll: a resize moves the page (viewport units) before any event can measure it. */
let tracked: ScrollAnchor | null = null
let trackFrame = 0

const apply = () => {
	frame = 0
	const anchor = pending
	pending = null
	if (anchor) keepScrollAnchor(anchor)
}

const schedule = () => {
	if (!frame && pending) frame = requestAnimationFrame(apply)
}

/**
 * Follows the reader: the place is noted on every scroll (a frame behind),
 * so a hold can use what was on screen before the viewport changed, not
 * what the browser has already moved. Installed once by the layer.
 */
export function trackScrollPlace(): () => void {
	tracked = findScrollAnchor()
	const onScroll = () => {
		if (trackFrame) return
		trackFrame = requestAnimationFrame(() => {
			trackFrame = 0
			tracked = findScrollAnchor()
		})
	}
	window.addEventListener('scroll', onScroll, { passive: true })
	return () => {
		window.removeEventListener('scroll', onScroll)
		if (trackFrame) cancelAnimationFrame(trackFrame)
		trackFrame = 0
		tracked = null
	}
}

/**
 * Before a layout change (the event that will change the mode, ahead of
 * React's commit): note the place, the last tracked one. It is put back on
 * the next frame, so a change that moved nothing costs nothing.
 */
export function holdScrollPlace() {
	pending = tracked ?? findScrollAnchor()
	schedule()
}

/** The commit is done: make sure the held place is put back on the next frame. */
export function settleScrollPlace() {
	schedule()
}

/** Test hook. */
export function resetScrollPlace() {
	if (frame) cancelAnimationFrame(frame)
	frame = 0
	pending = null
	tracked = null
}
