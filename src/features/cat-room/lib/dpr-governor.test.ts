import { describe, expect, it } from 'vitest'
import { GOVERNOR } from '../config/tuning'
import { createDprGovernor } from './dpr-governor'

/** Feeds one governor window of frames at a frame rate; returns the last decision. */
function runWindow(
	governor: ReturnType<typeof createDprGovernor>,
	fps: number,
) {
	const dt = 1 / fps
	const frames = Math.ceil(GOVERNOR.windowSeconds / dt) + 1
	let decision: number | null = null
	for (let i = 0; i < frames; i++) decision = governor.sample(dt) ?? decision
	return decision
}

describe('dpr governor', () => {
	it('declines under the low threshold and recovers at the high one', () => {
		const governor = createDprGovernor(1.75)
		expect(runWindow(governor, 30)).toBe(1)
		expect(governor.dpr).toBe(1)
		expect(runWindow(governor, 50)).toBeNull()
		expect(runWindow(governor, 60)).toBe(1.75)
	})

	it('locks at 1 after three flips', () => {
		const governor = createDprGovernor(1.75)
		runWindow(governor, 30)
		runWindow(governor, 60)
		expect(runWindow(governor, 30)).toBe(1)
		expect(governor.locked).toBe(true)
		expect(runWindow(governor, 60)).toBeNull()
		expect(governor.dpr).toBe(1)
	})

	it('has nothing to decide when the cap is already 1', () => {
		const governor = createDprGovernor(1)
		expect(runWindow(governor, 20)).toBeNull()
	})
})
