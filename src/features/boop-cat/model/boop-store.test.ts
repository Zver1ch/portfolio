import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function load() {
	vi.resetModules()
	return import('./boop-store')
}

describe('boop-store', () => {
	beforeEach(() => {
		window.localStorage.clear()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('starts at zero', async () => {
		const { getBoopCount } = await load()
		expect(getBoopCount()).toBe(0)
	})

	it('increments and persists across reloads', async () => {
		const first = await load()
		first.incrementBoops()
		expect(first.incrementBoops()).toBe(2)
		expect(window.localStorage.getItem('boop-count')).toBe('2')

		const second = await load()
		expect(second.getBoopCount()).toBe(2)
	})

	it('ignores corrupt stored values', async () => {
		window.localStorage.setItem('boop-count', 'many')
		const { getBoopCount } = await load()
		expect(getBoopCount()).toBe(0)
	})

	it('keeps counting in memory when storage throws', async () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('denied')
		})
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('denied')
		})
		const { getBoopCount, incrementBoops } = await load()
		expect(getBoopCount()).toBe(0)
		expect(incrementBoops()).toBe(1)
		expect(getBoopCount()).toBe(1)
	})

	it('notifies hook subscribers', async () => {
		const { useBoopCount, incrementBoops } = await load()
		const { result } = renderHook(() => useBoopCount())
		expect(result.current).toBe(0)
		act(() => {
			incrementBoops()
		})
		expect(result.current).toBe(1)
	})
})
