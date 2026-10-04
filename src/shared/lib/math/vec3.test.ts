import { describe, expect, it } from 'vitest'
import { bezier2, cross, distance, dot, lerp, normalize, sub } from './vec3'

describe('vec3', () => {
	it('does the basic algebra', () => {
		expect(sub([1, 2, 3], [1, 1, 1])).toEqual([0, 1, 2])
		expect(dot([1, 2, 3], [4, 5, 6])).toBe(32)
		expect(cross([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1])
		expect(normalize([0, 3, 4])).toEqual([0, 0.6, 0.8])
		expect(normalize([2, 0, 0])).toEqual([1, 0, 0])
		expect(normalize([0, 0, 0])).toEqual([0, 0, 0])
		expect(distance([0, 0, 0], [3, 4, 0])).toBe(5)
		expect(lerp([0, 0, 0], [2, 4, 6], 0.5)).toEqual([1, 2, 3])
	})

	it('evaluates a quadratic Bézier at its ends and middle', () => {
		expect(bezier2([0, 0, 0], [1, 2, 0], [2, 0, 0], 0)).toEqual([0, 0, 0])
		expect(bezier2([0, 0, 0], [1, 2, 0], [2, 0, 0], 1)).toEqual([2, 0, 0])
		expect(bezier2([0, 0, 0], [1, 2, 0], [2, 0, 0], 0.5)).toEqual([1, 1, 0])
	})
})
