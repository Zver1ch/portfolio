import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function load() {
	vi.resetModules()
	return import('./sound-enabled')
}

describe('sound-enabled store', () => {
	beforeEach(() => {
		window.localStorage.clear()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('is on by default', async () => {
		const { getSoundEnabled } = await load()
		expect(getSoundEnabled()).toBe(true)
	})

	it('persists the choice to localStorage', async () => {
		const first = await load()
		first.setSoundEnabled(false)
		expect(window.localStorage.getItem('sound-enabled')).toBe('false')

		const second = await load()
		expect(second.getSoundEnabled()).toBe(false)
	})

	it('falls back to on and keeps working when storage throws', async () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('denied')
		})
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('denied')
		})
		const { getSoundEnabled, setSoundEnabled } = await load()

		expect(getSoundEnabled()).toBe(true)
		expect(() => setSoundEnabled(false)).not.toThrow()
		expect(getSoundEnabled()).toBe(false)
	})

	it('ignores a stored value that is neither true nor false', async () => {
		window.localStorage.setItem('sound-enabled', 'maybe')
		const { getSoundEnabled } = await load()
		expect(getSoundEnabled()).toBe(true)
	})

	it('notifies useSoundEnabled subscribers', async () => {
		const { setSoundEnabled, useSoundEnabled } = await load()
		const { result } = renderHook(() => useSoundEnabled())
		expect(result.current).toBe(true)

		act(() => setSoundEnabled(false))
		expect(result.current).toBe(false)
	})
})
