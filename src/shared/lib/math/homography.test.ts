import { describe, expect, it } from 'vitest'
import {
	applyMatrix3d,
	matrix3dValue,
	type Quad,
	quadToMatrix3d,
} from './homography'

const W = 1440
const H = 900

describe('quadToMatrix3d', () => {
	it('maps the box corners exactly onto the quad', () => {
		const quad: Quad = [
			[412.3, 220.7],
			[811.9, 236.1],
			[803.2, 505.4],
			[420.5, 489.8],
		]
		const matrix = quadToMatrix3d(quad, W, H)
		expect(matrix).not.toBeNull()
		const corners: [number, number][] = [
			[0, 0],
			[W, 0],
			[W, H],
			[0, H],
		]
		corners.forEach(([x, y], i) => {
			const [px, py] = applyMatrix3d(matrix as number[], x, y)
			expect(px).toBeCloseTo(quad[i][0], 6)
			expect(py).toBeCloseTo(quad[i][1], 6)
		})
	})

	it('is the identity for the viewport rectangle', () => {
		const matrix = quadToMatrix3d(
			[
				[0, 0],
				[W, 0],
				[W, H],
				[0, H],
			],
			W,
			H,
		)
		// -0 and +0 are the same transform.
		expect(matrix?.map((v) => v + 0)).toEqual([
			1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
		])
		expect(matrix3dValue(matrix as number[])).toBe(
			'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)',
		)
	})

	it('returns null for a degenerate quad', () => {
		expect(
			quadToMatrix3d(
				[
					[10, 10],
					[10, 10],
					[10, 10],
					[10, 10],
				],
				W,
				H,
			),
		).toBeNull()
		expect(
			quadToMatrix3d(
				[
					[0, 0],
					[100, 0],
					[200, 0],
					[300, 0],
				],
				W,
				H,
			),
		).toBeNull()
	})
})
