import { ScrollTrigger } from '@/shared/lib/gsap/register'
import { jumpScrollBy } from '@/shared/lib/gsap/scroll-jump'
import { findScrollAnchor, holdScrollPlace } from './scroll-anchor'

/**
 * The page is laid out only after hydration (the pins, the lite spacers),
 * so what the browser does for a reader on arrival lands somewhere else:
 * its scroll restoration is switched off (`ScrollTrigger.clearScrollMemory`,
 * since ScrollTrigger re-applies the value it knows on every refresh) and
 * the layer restores by hand, once per page load, in the effect after the
 * first non-static layout:
 *
 * - a reload or a back/forward navigation returns to the place saved on the
 *   way out (`pagehide`, a hidden tab): a landmark and its offset, which
 *   survive the late layout where raw pixels would not;
 * - otherwise the hash target is scrolled to;
 * - a reader who had already scrolled on a slow phone gets neither, and
 *   keeps their place across the first mode's layout instead.
 *
 * History traversal between hashes (Back after nav clicks) scrolls to the
 * target on `hashchange`, which the browser no longer does by itself.
 */

const PLACE_KEY = 'room-scroll-place'
/** A scroll this far from where the page started counts as the reader's own. */
const EARLY_SCROLL_PX = 40

type SavedPlace = { landmark: string; top: number }

let done = false
let scrolledEarly = false

function landmarkOf(element: Element): string | null {
	if (element.id) return `#${CSS.escape(element.id)}`
	if (element.hasAttribute('data-credits-roll')) return '[data-credits-roll]'
	return element.tagName === 'FOOTER' ? 'footer' : null
}

function query(selector: string): Element | null {
	try {
		return document.querySelector(selector)
	} catch {
		return null
	}
}

/** Where a scroll to `target` would put it: at its scroll margin from the top. */
function offTarget(target: Element): number {
	const margin =
		Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0
	return target.getBoundingClientRect().top - margin
}

/** The reader's place for the next load of this page. */
export function savePlace() {
	const anchor = findScrollAnchor()
	const landmark = anchor && landmarkOf(anchor.element)
	if (!landmark) return
	try {
		sessionStorage.setItem(
			PLACE_KEY,
			JSON.stringify({ landmark, top: anchor.top } satisfies SavedPlace),
		)
	} catch {
		// Storage off: no place to come back to.
	}
}

function readPlace(): SavedPlace | null {
	try {
		const raw = sessionStorage.getItem(PLACE_KEY)
		return raw ? (JSON.parse(raw) as SavedPlace) : null
	} catch {
		return null
	}
}

function navigationType(): string | undefined {
	const [entry] = performance.getEntriesByType('navigation')
	return (entry as PerformanceNavigationTiming | undefined)?.type
}

/** Scrolls to the hash target, unless it already sits where that would put it. */
export function scrollToHash(hash = window.location.hash) {
	if (!hash) return
	const target = query(hash)
	if (!target || Math.abs(offTarget(target)) < 2) return
	target.scrollIntoView()
}

/**
 * At hydration, before any mode's layout: a reader who has already scrolled
 * (away from the fragment the browser landed on, or from the top) keeps
 * their place across the first layout and gets no restore.
 */
export function noteEarlyScroll() {
	const target = window.location.hash ? query(window.location.hash) : null
	scrolledEarly = target
		? Math.abs(offTarget(target)) > EARLY_SCROLL_PX
		: window.scrollY > EARLY_SCROLL_PX
	if (scrolledEarly) holdScrollPlace()
}

/** Once per page load, after the first non-static layout. */
export function restoreScrollOnce() {
	if (done) return
	done = true
	ScrollTrigger.clearScrollMemory('manual')
	if (scrolledEarly) return
	const type = navigationType()
	if (type === 'reload' || type === 'back_forward') {
		const place = readPlace()
		const element = place && query(place.landmark)
		if (place && element) {
			jumpScrollBy(element.getBoundingClientRect().top - place.top)
			return
		}
	}
	scrollToHash()
}

/** The page-level listeners: the place on the way out, the hash on history traversal. */
export function installScrollRestore(): () => void {
	const onHidden = () => {
		if (document.visibilityState === 'hidden') savePlace()
	}
	const onHash = () => scrollToHash()
	window.addEventListener('pagehide', savePlace)
	document.addEventListener('visibilitychange', onHidden)
	window.addEventListener('hashchange', onHash)
	return () => {
		window.removeEventListener('pagehide', savePlace)
		document.removeEventListener('visibilitychange', onHidden)
		window.removeEventListener('hashchange', onHash)
	}
}

/** Test hook. */
export function resetScrollRestore() {
	done = false
	scrolledEarly = false
}
