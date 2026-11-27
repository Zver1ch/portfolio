import { describe, expect, it } from 'vitest'
import { CAT_SPOT } from '../config/room-layout'
import { CAT_REST_HEIGHT } from '../config/tuning'
import {
	overlayFrustum,
	overlayScale,
	overlayToWorld,
	risingPlacement,
	worldToOverlay,
} from './overlay'

const VIEWPORT = { width: 1440, height: 900 }

describe('overlayScale', () => {
	it('is 0.9 of the height within the clamp', () => {
		expect(overlayScale(900)).toBe(810)
		expect(overlayScale(400)).toBe(520)
		expect(overlayScale(2000)).toBe(900)
	})
})

describe('risingPlacement', () => {
	it('hides the whole cat below the edge at rise 0 and shows `show` metres at rise 1', () => {
		const hidden = risingPlacement(0.5, 0, 0.2, VIEWPORT)
		expect(hidden.origin.x).toBe(720)
		// The head top sits exactly on the bottom edge.
		expect(hidden.origin.y - CAT_REST_HEIGHT * hidden.scale).toBeCloseTo(
			900,
		)
		const up = risingPlacement(0.5, 1, 0.2, VIEWPORT)
		expect(up.origin.y - CAT_REST_HEIGHT * up.scale).toBeCloseTo(
			900 - 0.2 * up.scale,
		)
	})
})

describe('overlay mapping', () => {
	const placement = risingPlacement(0.3, 1, 0.2, VIEWPORT)

	it('puts the cat origin at the placement and round-trips pixels', () => {
		const [sx, sy, sz] = CAT_SPOT.position
		expect(overlayToWorld(placement.origin, placement, 0.15)).toEqual([
			sx,
			sy,
			sz + 0.15,
		])
		const pixel = { x: 100, y: 200 }
		const back = worldToOverlay(overlayToWorld(pixel, placement), placement)
		expect(back.x).toBeCloseTo(100)
		expect(back.y).toBeCloseTo(200)
	})

	it('maps one metre up to `scale` pixels up', () => {
		const [sx, sy] = CAT_SPOT.position
		const top = worldToOverlay([sx, sy + 1, 0], placement)
		expect(placement.origin.y - top.y).toBeCloseTo(placement.scale)
	})

	it('builds a frustum whose edges are the viewport edges', () => {
		const frustum = overlayFrustum(placement, VIEWPORT)
		const [sx, sy] = CAT_SPOT.position
		const left = overlayToWorld({ x: 0, y: 0 }, placement)
		const right = overlayToWorld({ x: 1440, y: 900 }, placement)
		expect(frustum.left).toBeCloseTo(left[0] - sx)
		expect(frustum.top).toBeCloseTo(left[1] - sy)
		expect(frustum.right).toBeCloseTo(right[0] - sx)
		expect(frustum.bottom).toBeCloseTo(right[1] - sy)
	})
})
