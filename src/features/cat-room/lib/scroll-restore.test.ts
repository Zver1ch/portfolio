import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const anchor = vi.hoisted(() => ({
	find: vi.fn(),
	hold: vi.fn(),
}))
vi.mock('./scroll-anchor', () => ({
	findScrollAnchor: anchor.find,
	holdScrollPlace: anchor.hold,
}))

import {
	installScrollRestore,
	noteEarlyScroll,
	resetScrollRestore,
	restoreScrollOnce,
	savePlace,
	scrollToHash,
} from './scroll-restore'

/** A section at a viewport top, with a scroll margin, as the landmark. */
function section(id: string, top: number) {
	const element = document.createElement('section')
	element.id = id
	element.style.scrollMarginTop = '64px'
	element.getBoundingClientRect = () =>
		({ top, bottom: top + 500 }) as DOMRect
	element.scrollIntoView = vi.fn()
	document.body.append(element)
	return element
}

describe('scroll restore', () => {
	let scrollBy: ReturnType<typeof vi.fn>
	beforeEach(() => {
		scrollBy = vi.fn()
		vi.stubGlobal('scrollBy', scrollBy)
		vi.stubGlobal('scrollY', 0)
		window.sessionStorage.clear()
		window.location.hash = ''
	})
	afterEach(() => {
		resetScrollRestore()
		document.body.innerHTML = ''
		vi.unstubAllGlobals()
		history.scrollRestoration = 'auto'
	})

	it('scrolls to the hash target once per load and turns the browser restoration off', () => {
		const about = section('about', 900)
		window.location.hash = '#about'
		restoreScrollOnce()
		expect(about.scrollIntoView).toHaveBeenCalledTimes(1)
		expect(history.scrollRestoration).toBe('manual')
		// A later mode change asks again: nothing happens.
		restoreScrollOnce()
		expect(about.scrollIntoView).toHaveBeenCalledTimes(1)
	})

	it('leaves a hash target alone when it already sits at its margin', () => {
		const about = section('about', 64)
		window.location.hash = '#about'
		scrollToHash()
		expect(about.scrollIntoView).not.toHaveBeenCalled()
		scrollToHash('#1/not-a-selector')
		scrollToHash('#missing')
	})

	it('comes back to the saved place on a reload, ahead of the hash', () => {
		const stack = section('stack', 1500)
		section('about', 900)
		anchor.find.mockReturnValue({ element: stack, top: 160 })
		savePlace()
		expect(
			JSON.parse(sessionStorage.getItem('room-scroll-place') ?? ''),
		).toEqual({ landmark: '#stack', top: 160 })
		vi.stubGlobal('performance', {
			getEntriesByType: () => [{ type: 'reload' }],
		})
		window.location.hash = '#about'
		restoreScrollOnce()
		expect(scrollBy).toHaveBeenCalledWith(0, 1340)
		expect(
			document.getElementById('about')?.scrollIntoView,
		).not.toHaveBeenCalled()
	})

	it('restores nothing, and holds the place, for a reader who scrolled early', () => {
		section('about', 900)
		window.location.hash = '#about'
		noteEarlyScroll()
		expect(anchor.hold).toHaveBeenCalledTimes(1)
		restoreScrollOnce()
		expect(
			document.getElementById('about')?.scrollIntoView,
		).not.toHaveBeenCalled()
		expect(history.scrollRestoration).toBe('manual')
	})

	it('does not count the fragment the browser landed on as an early scroll', () => {
		section('about', 64)
		window.location.hash = '#about'
		vi.stubGlobal('scrollY', 1200)
		noteEarlyScroll()
		expect(anchor.hold).not.toHaveBeenCalled()
	})

	it('saves the place when the page hides and follows the hash on history traversal', () => {
		const stack = section('stack', 300)
		const about = section('about', 900)
		anchor.find.mockReturnValue({ element: stack, top: 300 })
		const uninstall = installScrollRestore()
		window.dispatchEvent(new Event('pagehide'))
		expect(sessionStorage.getItem('room-scroll-place')).toContain('#stack')
		window.location.hash = '#about'
		window.dispatchEvent(new Event('hashchange'))
		expect(about.scrollIntoView).toHaveBeenCalledTimes(1)
		uninstall()
		window.dispatchEvent(new Event('hashchange'))
		expect(about.scrollIntoView).toHaveBeenCalledTimes(1)
	})
})
