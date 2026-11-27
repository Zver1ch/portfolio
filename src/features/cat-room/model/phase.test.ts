import { describe, expect, it } from 'vitest'
import { type PhaseInput, resolvePhase } from './phase'

const base: PhaseInput = {
	mode: 'full',
	dive: 0,
	finale: 0,
	heroInView: true,
	finaleInView: false,
}

describe('resolvePhase', () => {
	it.each([
		[{ mode: 'static' }, 'off'],
		[{ mode: 'static', heroInView: false, finaleInView: true }, 'off'],
		[{}, 'room'],
		[{ dive: 0.9 }, 'room'],
		[{ dive: 0.985 }, 'inside'],
		[{ dive: 1, heroInView: false }, 'inside'],
		[{ heroInView: false, finaleInView: false }, 'inside'],
		[{ heroInView: false, finaleInView: true, finale: 0 }, 'inside'],
		[{ heroInView: false, finaleInView: true, finale: 0.02 }, 'finale'],
		[{ finale: 0.5 }, 'finale'],
		[{ mode: 'lite' }, 'room'],
		[{ mode: 'lite', dive: 0.95 }, 'room'],
		[{ mode: 'lite', dive: 1 }, 'off'],
		[{ mode: 'lite', heroInView: false }, 'off'],
		[{ mode: 'lite', heroInView: false, finaleInView: true }, 'off'],
		[
			{
				mode: 'lite',
				heroInView: false,
				finaleInView: true,
				finale: 0.01,
			},
			'finale',
		],
		[{ mode: 'lite', finaleInView: true, finale: 0.5 }, 'finale'],
		[{ mode: 'lite', finaleInView: false, finale: 0.5 }, 'room'],
	] as const)('%o is %s', (overrides, phase) => {
		expect(resolvePhase({ ...base, ...overrides })).toBe(phase)
	})
})
