import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const lenis = vi.hoisted(() => ({
	instances: [] as {
		scrollTo: ReturnType<typeof vi.fn>
		destroy: ReturnType<typeof vi.fn>
	}[],
}))
vi.mock('lenis', () => ({
	default: class FakeLenis {
		scrollTo = vi.fn()
		destroy = vi.fn()
		on() {}
		raf() {}
		constructor() {
			lenis.instances.push(this)
		}
	},
}))

import { inPageAnchor, SmoothScroll } from './smooth-scroll'

function click(target: Element, init: MouseEventInit = {}) {
	const event = new MouseEvent('click', {
		bubbles: true,
		cancelable: true,
		button: 0,
		...init,
	})
	target.dispatchEvent(event)
	return event
}

describe('SmoothScroll', () => {
	beforeEach(() => {
		lenis.instances.length = 0
		document.body.innerHTML = `
			<a id="about-link" href="#about">About</a>
			<a id="top-link" href="/#top">Top</a>
			<a id="external" href="https://example.com/#x">Out</a>
			<a id="missing" href="#nowhere">Missing</a>
			<a id="blank" href="#about" target="_blank">New tab</a>
			<section id="top"></section>
			<section id="about"></section>
		`
		window.location.hash = ''
	})
	afterEach(() => {
		cleanup()
		vi.unstubAllGlobals()
	})

	it('names in-page links only', () => {
		const about = document.getElementById('about') as Element
		expect(
			inPageAnchor(
				click(document.getElementById('about-link') as Element),
			),
		).toEqual({
			hash: '#about',
			element: about,
		})
		expect(
			inPageAnchor(click(document.getElementById('top-link') as Element))
				?.element,
		).toBe(document.getElementById('top'))
		expect(
			inPageAnchor(click(document.getElementById('external') as Element)),
		).toBeNull()
		expect(
			inPageAnchor(click(document.getElementById('missing') as Element)),
		).toBeNull()
		expect(
			inPageAnchor(click(document.getElementById('blank') as Element)),
		).toBeNull()
		expect(
			inPageAnchor(
				click(document.getElementById('about-link') as Element, {
					ctrlKey: true,
				}),
			),
		).toBeNull()
		expect(
			inPageAnchor(
				click(document.getElementById('about-link') as Element, {
					button: 1,
				}),
			),
		).toBeNull()
	})

	it('with a fine pointer, scrolls in-page links through Lenis alone and sets the hash on arrival', () => {
		vi.stubGlobal(
			'matchMedia',
			(media: string) =>
				({
					matches: true,
					media,
					addEventListener() {},
					removeEventListener() {},
				}) as unknown as MediaQueryList,
		)
		const { unmount } = render(<SmoothScroll />)
		expect(lenis.instances).toHaveLength(1)
		const instance = lenis.instances[0]

		const event = click(document.getElementById('about-link') as Element)
		expect(event.defaultPrevented).toBe(true)
		expect(instance.scrollTo).toHaveBeenCalledTimes(1)
		const [element, options] = instance.scrollTo.mock.calls[0] as [
			Element,
			{ onComplete: () => void },
		]
		expect(element).toBe(document.getElementById('about'))
		expect(window.location.hash).toBe('')
		options.onComplete()
		expect(window.location.hash).toBe('#about')

		// A link out of the page keeps its default.
		const out = click(document.getElementById('external') as Element)
		expect(out.defaultPrevented).toBe(false)
		expect(instance.scrollTo).toHaveBeenCalledTimes(1)

		unmount()
		expect(instance.destroy).toHaveBeenCalled()
		const after = click(document.getElementById('about-link') as Element)
		expect(after.defaultPrevented).toBe(false)
	})

	it('without a fine pointer, leaves clicks to the browser', () => {
		render(<SmoothScroll />)
		expect(lenis.instances).toHaveLength(0)
		const event = click(document.getElementById('about-link') as Element)
		expect(event.defaultPrevented).toBe(false)
	})
})
