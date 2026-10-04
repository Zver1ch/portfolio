import { describe, expect, it } from 'vitest'
import { DRAG_THRESHOLD_PX, isBoopClick } from './tap-gesture'

describe('isBoopClick', () => {
	it('accepts a tap and rejects a drag', () => {
		expect(isBoopClick(0)).toBe(true)
		expect(isBoopClick(DRAG_THRESHOLD_PX)).toBe(true)
		expect(isBoopClick(DRAG_THRESHOLD_PX + 1)).toBe(false)
		expect(isBoopClick(-1)).toBe(false)
		expect(isBoopClick(Number.NaN)).toBe(false)
		expect(isBoopClick(10, 12)).toBe(true)
	})
})
