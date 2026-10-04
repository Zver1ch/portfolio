import { describe, expect, it } from 'vitest'
import { fitQuadratic2 } from './fit'

describe('fitQuadratic2', () => {
	it('recovers a quadratic surface from a grid of samples', () => {
		const truth = (x: number, y: number) =>
			0.3 - 0.5 * x + 0.2 * y - 2 * x * x + 0.7 * x * y - 1.5 * y * y
		const samples: [number, number, number][] = []
		for (let i = -3; i <= 3; i++)
			for (let j = -3; j <= 3; j++)
				samples.push([i * 0.01, j * 0.01, truth(i * 0.01, j * 0.01)])
		const fitted = fitQuadratic2(samples)
		for (const [x, y] of [
			[0, 0],
			[0.02, -0.015],
			[-0.03, 0.03],
			[0.045, 0.01],
		])
			expect(fitted(x, y)).toBeCloseTo(truth(x, y), 9)
	})

	it('falls back to the mean for too few or degenerate samples', () => {
		expect(fitQuadratic2([])(1, 2)).toBe(0)
		expect(
			fitQuadratic2([
				[0, 0, 1],
				[1, 0, 3],
			])(5, 5),
		).toBe(2)
		const collinear: [number, number, number][] = Array.from(
			{ length: 8 },
			(_, i) => [i, 0, i * i],
		)
		expect(Number.isFinite(fitQuadratic2(collinear)(2, 2))).toBe(true)
	})
})
