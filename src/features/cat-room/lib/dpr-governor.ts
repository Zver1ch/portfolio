import { GOVERNOR } from '../config/tuning'

export type DprGovernor = {
	/** Feed one rendered frame; returns the new pixel ratio when it changes. */
	sample(dt: number): number | null
	readonly dpr: number
	readonly locked: boolean
}

/**
 * Plan §3.6: every window of rendered frames, an average under the low
 * threshold drops the pixel ratio to 1, an average at or above the high one
 * restores the cap. Each change is a flip; after `maxFlips` the ratio locks
 * at 1 so a borderline device stops oscillating.
 */
export function createDprGovernor(cap: number): DprGovernor {
	let dpr = cap
	let flips = 0
	let locked = false
	let elapsed = 0
	let frames = 0
	return {
		get dpr() {
			return dpr
		},
		get locked() {
			return locked
		},
		sample(dt) {
			if (locked || cap <= 1) return null
			elapsed += dt
			frames += 1
			if (elapsed < GOVERNOR.windowSeconds) return null
			const fps = frames / elapsed
			elapsed = 0
			frames = 0
			let next = dpr
			if (fps < GOVERNOR.lowFps) next = 1
			else if (fps >= GOVERNOR.highFps) next = cap
			if (next === dpr) return null
			flips += 1
			if (flips >= GOVERNOR.maxFlips) {
				locked = true
				next = 1
			}
			dpr = next
			return dpr
		},
	}
}
