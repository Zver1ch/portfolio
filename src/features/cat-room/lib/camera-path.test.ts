import { describe, expect, it } from 'vitest'
import {
	DAWN_CAMERA,
	HERO_CAMERA,
	LITE_PULLBACK,
} from '../config/camera-tracks'
import {
	cameraAt,
	dawnFactor,
	endCamera,
	liteFinaleCamera,
	liteHeroCamera,
} from './camera-path'
import { projectScreen } from './screen-quad'

const WIDTH = 1600

describe('cameraAt', () => {
	it('holds the hero camera at the start of the dive and the dawn camera at the end of the finale', () => {
		expect(cameraAt('dive', 0, 1.6)).toEqual(HERO_CAMERA)
		expect(cameraAt('dive', 0.05, 1.6)).toEqual(HERO_CAMERA)
		expect(cameraAt('finale', 1, 1.6)).toEqual(DAWN_CAMERA)
	})

	it('starts the finale where the dive ended', () => {
		expect(cameraAt('finale', 0, 1.6)).toEqual(cameraAt('dive', 1, 1.6))
	})

	it('moves monotonically towards the screen during the travel', () => {
		let previous = cameraAt('dive', 0.08, 1.6).position[2]
		for (let p = 0.1; p <= 0.9; p += 0.05) {
			const z = cameraAt('dive', p, 1.6).position[2]
			expect(z).toBeLessThanOrEqual(previous + 1e-9)
			previous = z
		}
	})

	it.each([1.2, 1.6, 1.78, 2.4])(
		'at p = 1 the exact-fit end camera projects the screen onto the viewport (aspect %s)',
		(aspect) => {
			const height = WIDTH / aspect
			const quad = projectScreen(endCamera(1), WIDTH, height)
			expect(quad).not.toBeNull()
			const [tl, tr, br, bl] = quad as NonNullable<typeof quad>
			for (const [point, expected] of [
				[tl, [0, 0]],
				[tr, [WIDTH, 0]],
				[br, [WIDTH, height]],
				[bl, [0, height]],
			] as const) {
				expect(Math.abs(point[0] - expected[0])).toBeLessThan(0.5)
				expect(Math.abs(point[1] - expected[1])).toBeLessThan(0.5)
			}
		},
	)

	it('overshoots the viewport by the bezel margin at the real end camera', () => {
		const height = WIDTH / 1.6
		const quad = projectScreen(cameraAt('dive', 1, 1.6), WIDTH, height)
		const [tl, , br] = quad as NonNullable<typeof quad>
		expect(tl[0]).toBeLessThan(0)
		expect(tl[1]).toBeLessThan(0)
		expect(br[0]).toBeGreaterThan(WIDTH)
		expect(br[1]).toBeGreaterThan(height)
		// 1.5% overshoot: about 0.75% of the size on each side.
		expect(-tl[0] / WIDTH).toBeCloseTo(0.0076, 3)
	})
})

describe('liteHeroCamera', () => {
	it('keeps wide viewports and pulls narrow ones back', () => {
		expect(liteHeroCamera(1.6)).toEqual(HERO_CAMERA)
		const narrow = liteHeroCamera(0.46)
		const far = Math.hypot(
			...narrow.position.map((v, i) => v - HERO_CAMERA.target[i]),
		)
		const near = Math.hypot(
			...HERO_CAMERA.position.map((v, i) => v - HERO_CAMERA.target[i]),
		)
		expect(far / near).toBeCloseTo(LITE_PULLBACK / 0.46)
	})
})

describe('dawnFactor', () => {
	it('ramps from 0.55 to 1 over the middle of the finale', () => {
		expect(dawnFactor(0)).toBeCloseTo(0.55)
		expect(dawnFactor(0.5)).toBeCloseTo(0.775)
		expect(dawnFactor(1)).toBeCloseTo(1)
	})
})

describe('liteFinaleCamera', () => {
	it('keeps wide viewports and pulls narrow ones back from the dawn target', () => {
		expect(liteFinaleCamera(1.6)).toEqual(DAWN_CAMERA)
		const narrow = liteFinaleCamera(0.5625)
		expect(narrow.target).toEqual(DAWN_CAMERA.target)
		expect(narrow.fov).toBe(DAWN_CAMERA.fov)
		const far = Math.hypot(
			...narrow.position.map((v, i) => v - DAWN_CAMERA.target[i]),
		)
		const near = Math.hypot(
			...DAWN_CAMERA.position.map((v, i) => v - DAWN_CAMERA.target[i]),
		)
		expect(far / near).toBeCloseTo(LITE_PULLBACK / 0.5625)
	})
})
