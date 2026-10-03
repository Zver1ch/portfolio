import { beforeEach, describe, expect, it, vi } from 'vitest'

const { playCatSound } = vi.hoisted(() => ({ playCatSound: vi.fn() }))
vi.mock('@/shared/lib/sound/cat-sound', () => ({ playCatSound }))

describe('boop', () => {
	beforeEach(() => {
		window.localStorage.clear()
		vi.resetModules()
	})

	it('plays the cat sound and increments the counter', async () => {
		const { boop } = await import('./boop')
		const { getBoopCount } = await import('./boop-store')

		expect(boop()).toBe(1)
		expect(boop()).toBe(2)
		expect(playCatSound).toHaveBeenCalledTimes(2)
		expect(getBoopCount()).toBe(2)
	})
})
