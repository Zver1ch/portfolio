import { describe, expect, it } from 'vitest'
import { advance, MAX_FRAME_DELTA } from './scene-time'

describe('advance', () => {
	it('accumulates ordinary frames', () => {
		const clock = { current: 0 }
		advance(clock, 1 / 60)
		advance(clock, 1 / 60)
		expect(clock.current).toBeCloseTo(2 / 60)
	})

	it('clamps a background-tab delta and ignores negative ones', () => {
		const clock = { current: 1 }
		expect(advance(clock, 5)).toBeCloseTo(1 + MAX_FRAME_DELTA)
		expect(advance(clock, -1)).toBeCloseTo(1 + MAX_FRAME_DELTA)
	})
})
