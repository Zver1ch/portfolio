import { describe, expect, it } from 'vitest'
import type { Quad } from '@/shared/lib/math/homography'
import { createPortal } from './portal'

const quad: Quad = [
	[400, 200],
	[800, 220],
	[790, 500],
	[410, 480],
]

describe('createPortal', () => {
	it('warps while diving, keeps the previous matrix on a bad quad and docks at the end', () => {
		const element = document.createElement('div')
		const portal = createPortal(element)
		expect(element.style.transformOrigin).toBe('0 0')
		expect(element.style.transform).toBe('')

		portal.apply(quad, 0, 1440, 900)
		const atRest = element.style.transform
		expect(atRest).toMatch(/^matrix3d\(/)
		expect(element.style.willChange).toBe('')

		portal.apply(quad, 0.5, 1440, 900)
		expect(element.style.transform).toBe(atRest)
		expect(element.style.willChange).toBe('transform')

		portal.apply(null, 0.6, 1440, 900)
		expect(element.style.transform).toBe(atRest)

		// Docking: the corners move towards the viewport rectangle.
		portal.apply(quad, 0.95, 1440, 900)
		expect(element.style.transform).not.toBe(atRest)
		expect(element.style.transform).toMatch(/^matrix3d\(/)

		portal.apply(quad, 1, 1440, 900)
		expect(element.style.transform).toBe('')
		expect(element.style.willChange).toBe('')
	})

	it('reaches the identity exactly at the end of docking', () => {
		const element = document.createElement('div')
		const portal = createPortal(element)
		portal.apply(quad, 0.999999, 1440, 900)
		const match = /^matrix3d\((.*)\)$/.exec(element.style.transform)
		const values = (match?.[1] ?? '').split(',').map(Number)
		const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
		for (const [i, value] of values.entries())
			expect(value).toBeCloseTo(identity[i], 2)
	})
})
