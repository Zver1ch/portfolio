import { afterEach, describe, expect, it, vi } from 'vitest'
import { jumpScrollBy, registerScrollJumper } from './scroll-jump'

describe('jumpScrollBy', () => {
	afterEach(() => {
		registerScrollJumper(null)
		vi.unstubAllGlobals()
	})

	it('scrolls the window when no smooth scroller runs', () => {
		const scrollBy = vi.fn()
		vi.stubGlobal('scrollBy', scrollBy)
		jumpScrollBy(-120)
		expect(scrollBy).toHaveBeenCalledWith(0, -120)
	})

	it('hands the correction to the registered scroller instead', () => {
		const scrollBy = vi.fn()
		vi.stubGlobal('scrollBy', scrollBy)
		const jumper = vi.fn()
		registerScrollJumper(jumper)
		jumpScrollBy(350)
		expect(jumper).toHaveBeenCalledWith(350)
		expect(scrollBy).not.toHaveBeenCalled()
	})
})
