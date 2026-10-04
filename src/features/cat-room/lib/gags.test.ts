import { describe, expect, it } from 'vitest'
import { GAGS } from '../config/tuning'
import {
	cancelGags,
	createGagState,
	endGag,
	type Gag,
	maybeType,
	onSectionEntry,
	requestFish,
	tickGags,
} from './gags'

const free = () => true
const taken = () => false

describe('gag scheduler', () => {
	it('always peeks on the first section entry, within the width range and the duration cap', () => {
		for (let seed = 1; seed < 40; seed++) {
			const state = createGagState(seed)
			const gag = onSectionEntry(state, 10, free)
			expect(gag?.kind).toBe('peek')
			expect(gag?.xShare).toBeGreaterThanOrEqual(GAGS.peek.xRange[0])
			expect(gag?.xShare).toBeLessThanOrEqual(GAGS.peek.xRange[1])
			expect(gag?.duration).toBeLessThanOrEqual(GAGS.maxDuration)
		}
	})

	it('runs one gag at a time, with the minimum gap after it ends', () => {
		const state = createGagState(3)
		const first = onSectionEntry(state, 10, free) as Gag
		expect(onSectionEntry(state, 11, free)).toBeNull()
		expect(tickGags(state, 10 + first.duration - 0.01)).toBeNull()
		expect(tickGags(state, 10 + first.duration)).toBe(first)
		expect(state.active).toBeNull()
		const ended = 10 + first.duration
		expect(
			onSectionEntry(state, ended + GAGS.minGap - 0.5, free),
		).toBeNull()
		// Later entries roll the dice: over many seeds both outcomes occur.
		let peeks = 0
		let passes = 0
		for (let seed = 1; seed <= 60; seed++) {
			const s = createGagState(seed)
			const gag = onSectionEntry(s, 0, free) as Gag
			tickGags(s, gag.duration)
			if (onSectionEntry(s, gag.duration + GAGS.minGap + 0.01, free))
				peeks++
			else passes++
		}
		expect(peeks).toBeGreaterThan(30)
		expect(passes).toBeGreaterThan(3)
	})

	it('passes an entry whose head would land on something interactive, and stays "first"', () => {
		const state = createGagState(5)
		expect(onSectionEntry(state, 10, taken)).toBeNull()
		expect(state.automatic).toBe(0)
		expect(state.active).toBeNull()
		// A later free entry still gets the guaranteed first peek.
		expect(onSectionEntry(state, 11, free)?.kind).toBe('peek')
	})

	it('is deterministic for a seed', () => {
		const a = createGagState(21)
		const b = createGagState(21)
		const ga = onSectionEntry(a, 1, free) as Gag
		const gb = onSectionEntry(b, 1, free) as Gag
		expect(ga.xShare).toBe(gb.xShare)
	})

	it('Escape silences automatic gags but not a requested fish', () => {
		const state = createGagState(8)
		const peek = onSectionEntry(state, 10, free) as Gag
		cancelGags(state, 11)
		expect(state.active).toBeNull()
		expect(onSectionEntry(state, 12, free)).toBeNull()
		expect(onSectionEntry(state, 11 + GAGS.silence - 1, free)).toBeNull()
		const fish = requestFish(state, 20, { x: 100, y: 50 }, 1000)
		expect(fish.kind).toBe('fish')
		expect(fish.xShare).toBe(GAGS.fish.xRange[0])
		expect(fish.duration).toBeLessThanOrEqual(GAGS.maxDuration)
		endGag(state, 22)
		expect(onSectionEntry(state, 11 + GAGS.silence + 1, free)?.kind).toBe(
			'peek',
		)
		expect(peek.kind).toBe('peek')
	})

	it('a fish replaces a running peek and the gap counts from the fish', () => {
		const state = createGagState(2)
		onSectionEntry(state, 10, free)
		const fish = requestFish(state, 11, { x: 500, y: 100 }, 1000)
		expect(state.active).toBe(fish)
		expect(fish.xShare).toBe(0.5)
		endGag(state, 13)
		expect(onSectionEntry(state, 13 + GAGS.minGap - 1, free)).toBeNull()
		expect(onSectionEntry(state, 13 + GAGS.minGap, free)).not.toBeNull()
	})

	it('types after a peek only when the line is on screen, sometimes', () => {
		let typed = 0
		for (let seed = 1; seed <= 40; seed++) {
			const state = createGagState(seed)
			const peek = onSectionEntry(state, 0, free) as Gag
			const ended = tickGags(state, peek.duration) as Gag
			expect(maybeType(state, peek.duration, ended, false)).toBeNull()
			const typing = maybeType(state, peek.duration, ended, true)
			if (typing) {
				typed++
				expect(typing.kind).toBe('typing')
				expect(typing.duration).toBeLessThanOrEqual(GAGS.maxDuration)
				expect(state.active).toBe(typing)
			}
		}
		expect(typed).toBeGreaterThan(8)
		expect(typed).toBeLessThan(32)
	})
})
