import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { playCatSound, prefetchCatSoundWhenIdle, cancelPrefetch } = vi.hoisted(
	() => {
		const cancelPrefetch = vi.fn()
		return {
			playCatSound: vi.fn(),
			cancelPrefetch,
			prefetchCatSoundWhenIdle: vi.fn(() => cancelPrefetch),
		}
	},
)
vi.mock('@/shared/lib/sound/cat-sound', () => ({
	playCatSound,
	prefetchCatSoundWhenIdle,
}))

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

	it('prefetches the meow while sound is on, not while muted', async () => {
		const { usePrefetchMeow } = await import('./boop')
		const { setSoundEnabled } = await import(
			'@/shared/lib/sound/sound-enabled'
		)

		const { rerender, unmount } = renderHook(() => usePrefetchMeow())
		expect(prefetchCatSoundWhenIdle).toHaveBeenCalledTimes(1)

		setSoundEnabled(false)
		rerender()
		expect(cancelPrefetch).toHaveBeenCalledTimes(1)
		expect(prefetchCatSoundWhenIdle).toHaveBeenCalledTimes(1)

		setSoundEnabled(true)
		rerender()
		expect(prefetchCatSoundWhenIdle).toHaveBeenCalledTimes(2)
		unmount()
	})
})
