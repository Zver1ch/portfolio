import { describe, expect, it } from 'vitest'
import { damp, springStep } from './spring'

describe('damp', () => {
	it('is frame-rate independent', () => {
		let a = 0
		for (let i = 0; i < 60; i++) a = damp(a, 1, 6, 1 / 60)
		const b = damp(0, 1, 6, 1)
		expect(a).toBeCloseTo(b, 6)
		expect(b).toBeCloseTo(1 - Math.exp(-6))
	})

	it('never overshoots and ignores negative dt', () => {
		expect(damp(0, 1, 6, 100)).toBeLessThanOrEqual(1)
		expect(damp(0.5, 1, 6, -1)).toBe(0.5)
	})
})

describe('springStep', () => {
	const params = { stiffness: 12, damping: 1 }

	it('settles on the target', () => {
		let state = { value: 0, velocity: 0 }
		for (let i = 0; i < 300; i++)
			state = springStep(state, 1, 1 / 60, params)
		expect(state.value).toBeCloseTo(1, 3)
		expect(Math.abs(state.velocity)).toBeLessThan(1e-3)
	})

	it('stays bounded under one huge clamped frame', () => {
		const state = springStep({ value: 0, velocity: 0 }, 1, 5, params)
		expect(Number.isFinite(state.value)).toBe(true)
		expect(state.value).toBeGreaterThan(0.9)
		expect(state.value).toBeLessThan(1.1)
	})

	it('an under-damped spring overshoots, a critically damped one does not', () => {
		let wobbly = { value: 0, velocity: 0 }
		let calm = { value: 0, velocity: 0 }
		let overshoot = 0
		let calmMax = 0
		for (let i = 0; i < 240; i++) {
			wobbly = springStep(wobbly, 1, 1 / 60, {
				stiffness: 12,
				damping: 0.2,
			})
			calm = springStep(calm, 1, 1 / 60, params)
			overshoot = Math.max(overshoot, wobbly.value)
			calmMax = Math.max(calmMax, calm.value)
		}
		expect(overshoot).toBeGreaterThan(1.1)
		expect(calmMax).toBeLessThanOrEqual(1.0001)
	})
})
