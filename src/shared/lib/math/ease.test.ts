import { describe, expect, it } from 'vitest'
import { clamp, easeInOutCubic, smoothstep, unlerp } from './ease'

describe('ease', () => {
	it('clamps and remaps', () => {
		expect(clamp(5, 0, 1)).toBe(1)
		expect(clamp(-5, 0, 1)).toBe(0)
		expect(unlerp(10, 20, 15)).toBe(0.5)
		expect(unlerp(10, 20, 25)).toBe(1)
		expect(unlerp(10, 10, 10)).toBe(0)
	})

	it('smoothstep is flat outside the edges and symmetric inside', () => {
		expect(smoothstep(0.2, 0.8, 0)).toBe(0)
		expect(smoothstep(0.2, 0.8, 1)).toBe(1)
		expect(smoothstep(0.2, 0.8, 0.5)).toBeCloseTo(0.5)
		expect(smoothstep(0, 1, 0.25)).toBeCloseTo(0.15625)
	})

	it('easeInOutCubic passes through the corners and the centre', () => {
		expect(easeInOutCubic(0)).toBe(0)
		expect(easeInOutCubic(0.5)).toBe(0.5)
		expect(easeInOutCubic(1)).toBe(1)
		expect(easeInOutCubic(2)).toBe(1)
	})
})
