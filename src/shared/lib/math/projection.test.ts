import { describe, expect, it } from 'vitest'
import { type CameraPose, projectPoint } from './projection'

const cam: CameraPose = { position: [0, 0, 5], target: [0, 0, 0], fov: 90 }

describe('projectPoint', () => {
	it('puts the look-at target in the centre of the viewport', () => {
		expect(projectPoint([0, 0, 0], cam, 800, 600)).toEqual([400, 300])
	})

	it('maps the edges of a 90° frustum to the viewport edges', () => {
		// At depth 5 with fov 90 the half-height of the view is 5.
		expect(projectPoint([0, 5, 0], cam, 800, 600)?.[1]).toBeCloseTo(0)
		expect(projectPoint([0, -5, 0], cam, 800, 600)?.[1]).toBeCloseTo(600)
		// Aspect 4:3 widens the half-width to 5 * 4/3.
		const right = projectPoint([5 * (4 / 3), 0, 0], cam, 800, 600)
		expect(right?.[0]).toBeCloseTo(800)
		expect(right?.[1]).toBeCloseTo(300)
	})

	it('returns null behind the camera', () => {
		expect(projectPoint([0, 0, 6], cam, 800, 600)).toBeNull()
	})

	it('follows a rotated camera', () => {
		const side: CameraPose = {
			position: [5, 0, 0],
			target: [0, 0, 0],
			fov: 60,
		}
		const p = projectPoint([0, 0, -1], side, 1000, 1000)
		// Looking down -X, world -Z is to the right of the viewer.
		expect(p?.[0]).toBeGreaterThan(500)
		expect(p?.[1]).toBeCloseTo(500)
	})
})
