import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	findScrollAnchor,
	holdScrollPlace,
	keepScrollAnchor,
	resetScrollPlace,
	settleScrollPlace,
	trackScrollPlace,
} from './scroll-anchor'

const VIEWPORT = 800

/** Landmarks laid out at the given viewport tops, 500 px tall (jsdom has no layout). */
function page(tops: Record<string, number>) {
	document.body.innerHTML = `
		<main>
			<section id="top"><div data-stage="hero"><div data-portal>first</div></div></section>
			<section id="about">about</section>
			<section id="stack">stack</section>
		</main>
		<footer id="finale"><div data-stage="finale"><div data-portal>last</div></div><div data-credits-roll>credits</div></footer>
	`
	// Every landmark gets a position: the ones not named sit far below the viewport.
	const place = () => {
		for (const element of document.querySelectorAll(
			'main section[id], footer, [data-credits-roll]',
		)) {
			const named = Object.entries(tops).find(([selector]) =>
				element.matches(selector),
			)
			const top = named ? named[1] : 5000
			const height = named?.[0] === 'footer' ? 2500 : 500
			element.getBoundingClientRect = () =>
				({ top, bottom: top + height }) as DOMRect
		}
	}
	place()
	return {
		move(next: Record<string, number>) {
			Object.assign(tops, next)
			place()
		},
	}
}

describe('scroll anchor', () => {
	afterEach(() => {
		document.body.innerHTML = ''
		resetScrollPlace()
		vi.unstubAllGlobals()
	})

	it('picks the landmark the reader is in, not the next one showing below', () => {
		page({ 'section#top': -2000, '#about': -300, '#stack': 400 })
		const anchor = findScrollAnchor(document, VIEWPORT)
		expect(anchor?.element.id).toBe('about')
		expect(anchor?.top).toBe(-300)
		// Started high enough in the viewport: the reader is in it.
		page({ 'section#top': -2000, '#about': -600, '#stack': 200 })
		expect(findScrollAnchor(document, VIEWPORT)?.element.id).toBe('stack')
	})

	it('prefers the credits to the footer they lie over', () => {
		page({ footer: -1620, '[data-credits-roll]': 550 })
		expect(
			findScrollAnchor(document, VIEWPORT)?.element.hasAttribute(
				'data-credits-roll',
			),
		).toBe(true)
		page({ footer: -800 })
		expect(findScrollAnchor(document, VIEWPORT)?.element.id).toBe('finale')
	})

	it('falls back to the first landmark, and to null without any', () => {
		page({})
		expect(findScrollAnchor(document, VIEWPORT)?.element.id).toBe('top')
		document.body.innerHTML = ''
		expect(findScrollAnchor(document, VIEWPORT)).toBeNull()
	})

	it("scrolls by the landmark's displacement, and not for sub-pixel noise", () => {
		const scrollBy = vi.fn()
		vi.stubGlobal('scrollBy', scrollBy)
		const layout = page({ '#about': -300 })
		const anchor = findScrollAnchor(document, VIEWPORT) as NonNullable<
			ReturnType<typeof findScrollAnchor>
		>
		expect(anchor.element.id).toBe('about')
		// The lite spacers went away: the section moved up by 1.2 screens.
		layout.move({ '#about': -1313 })
		keepScrollAnchor(anchor)
		expect(scrollBy).toHaveBeenCalledWith(0, -1013)
		layout.move({ '#about': -1313.2 })
		scrollBy.mockClear()
		keepScrollAnchor({ element: anchor.element, top: -1313 })
		expect(scrollBy).not.toHaveBeenCalled()
	})

	it('holds the place from the event and settles it once, or within a frame', () => {
		const scrollBy = vi.fn()
		vi.stubGlobal('scrollBy', scrollBy)
		vi.stubGlobal('innerHeight', VIEWPORT)
		let frame: FrameRequestCallback | null = null
		vi.stubGlobal(
			'requestAnimationFrame',
			(callback: FrameRequestCallback) => {
				frame = callback
				return 1
			},
		)
		vi.stubGlobal('cancelAnimationFrame', () => {
			frame = null
		})
		const layout = page({ '#stack': 100 })
		holdScrollPlace()
		layout.move({ '#stack': 1113 })
		settleScrollPlace()
		// Not before the frame: the commit's own refreshes may still move the page.
		expect(scrollBy).not.toHaveBeenCalled()
		expect(frame).not.toBeNull()
		;(frame as unknown as FrameRequestCallback)(0)
		frame = null
		expect(scrollBy).toHaveBeenCalledWith(0, 1013)
		// Settled: a second settle schedules nothing and moves nothing.
		scrollBy.mockClear()
		settleScrollPlace()
		expect(frame).toBeNull()
		expect(scrollBy).not.toHaveBeenCalled()

		// Nothing settles it by hand: the frame the hold scheduled does.
		layout.move({ '#stack': 100 })
		holdScrollPlace()
		layout.move({ '#stack': -400 })
		expect(frame).not.toBeNull()
		;(frame as unknown as FrameRequestCallback)(0)
		expect(scrollBy).toHaveBeenCalledWith(0, -500)
	})

	it('holds the place the reader last scrolled to, not what a resize has already moved', () => {
		const scrollBy = vi.fn()
		vi.stubGlobal('scrollBy', scrollBy)
		vi.stubGlobal('innerHeight', VIEWPORT)
		const frames: FrameRequestCallback[] = []
		vi.stubGlobal(
			'requestAnimationFrame',
			(callback: FrameRequestCallback) => frames.push(callback),
		)
		vi.stubGlobal('cancelAnimationFrame', () => {})
		const layout = page({ '#stack': 100 })
		const untrack = trackScrollPlace()
		// The reader scrolls: the place follows, a frame behind.
		layout.move({ '#stack': 20 })
		window.dispatchEvent(new Event('scroll'))
		for (const frame of frames.splice(0)) frame(0)
		// The viewport changes and moves the page before the mode's event.
		layout.move({ '#stack': 920 })
		holdScrollPlace()
		layout.move({ '#stack': 1500 })
		for (const frame of frames.splice(0)) frame(0)
		expect(scrollBy).toHaveBeenCalledWith(0, 1480)
		untrack()
	})
})
