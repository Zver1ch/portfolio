import { describe, expect, it } from 'vitest'
import { projectPoint } from '@/shared/lib/math/projection'
import type { Vec2 } from '@/shared/lib/math/vec3'
import {
	DAWN_CAMERA,
	DIVE,
	FINALE,
	HERO_CAMERA,
	LITE_CAMERAS,
	LITE_FRAMING,
} from '../config/camera-tracks'
import { DESK_TOP, SCREEN } from '../config/room-layout'
import {
	cameraAt,
	dawnFactor,
	endCamera,
	finaleUndock,
	liteDawnCamera,
	liteDiveCamera,
	liteEndCamera,
	liteFinaleCamera,
	liteHeroCamera,
} from './camera-path'
import {
	columnWidth,
	projectColumn,
	projectScreen,
	screenAspect,
	screenWidth,
} from './screen-quad'

const WIDTH = 1600
/** A phone's viewport aspect. */
const PHONE = 390 / 844

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

describe('lite stage cameras', () => {
	it('keeps the stock cameras on landscape viewports and the lite ones on portrait viewports', () => {
		expect(liteHeroCamera(1.6)).toEqual(HERO_CAMERA)
		expect(liteDawnCamera(1.6)).toEqual(DAWN_CAMERA)
		expect(liteHeroCamera(LITE_FRAMING.portraitFrom)).toEqual(HERO_CAMERA)
		expect(liteHeroCamera(PHONE)).toEqual(LITE_CAMERAS.hero)
		expect(liteDawnCamera(PHONE)).toEqual(LITE_CAMERAS.dawn)
		expect(liteHeroCamera(LITE_FRAMING.portraitTo)).toEqual(
			LITE_CAMERAS.hero,
		)
	})

	it('blends between them towards a square window', () => {
		const between = liteHeroCamera(0.9)
		expect(between.fov).toBeGreaterThan(HERO_CAMERA.fov)
		expect(between.fov).toBeLessThan(LITE_CAMERAS.hero.fov)
		for (let i = 0; i < 3; i++) {
			const low = Math.min(
				HERO_CAMERA.position[i],
				LITE_CAMERAS.hero.position[i],
			)
			const high = Math.max(
				HERO_CAMERA.position[i],
				LITE_CAMERAS.hero.position[i],
			)
			expect(between.position[i]).toBeGreaterThanOrEqual(low)
			expect(between.position[i]).toBeLessThanOrEqual(high)
		}
	})

	it('the hero camera on a phone sees the whole desk with the screen in the upper half', () => {
		const camera = liteHeroCamera(PHONE)
		const height = 844
		const width = height * PHONE
		const [cx, cy, cz] = SCREEN.center
		const screen = projectPoint([cx, cy, cz], camera, width, height)
		expect(screen).not.toBeNull()
		expect((screen as Vec2)[0]).toBeGreaterThan(0)
		expect((screen as Vec2)[0]).toBeLessThan(width)
		expect((screen as Vec2)[1] / height).toBeLessThan(0.5)
		const desk = projectPoint([0.25, DESK_TOP, -0.8], camera, width, height)
		expect((desk as Vec2)[1] / height).toBeGreaterThan(0.5)
	})
})

describe('lite dive and pull-back', () => {
	it.each([0.46, 0.5625, 0.75, 1.2, 1.78])(
		'the lite end camera lands the page column on the viewport exactly (aspect %s)',
		(aspect) => {
			const height = WIDTH / aspect
			const quad = projectColumn(liteEndCamera(), WIDTH, height)
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

	it('the column is the whole screen on landscape viewports and narrower on portrait ones', () => {
		expect(columnWidth(1.6)).toBeCloseTo(screenWidth(1.6))
		expect(columnWidth(PHONE)).toBeCloseTo(SCREEN.height * PHONE)
		expect(columnWidth(PHONE)).toBeLessThan(screenWidth(PHONE))
		expect(screenAspect(PHONE)).toBe(SCREEN.aspectRange[0])
		expect(screenAspect(5)).toBe(SCREEN.aspectRange[1])
	})

	it('the dive holds the lite hero camera, pushes straight in, and arrives at the exact fit', () => {
		expect(liteDiveCamera(0, PHONE)).toEqual(LITE_CAMERAS.hero)
		expect(liteDiveCamera(DIVE.hold, PHONE)).toEqual(LITE_CAMERAS.hero)
		expect(liteDiveCamera(DIVE.travelEnd, PHONE)).toEqual(liteEndCamera())
		expect(liteDiveCamera(1, PHONE)).toEqual(liteEndCamera())
		const start = LITE_CAMERAS.hero.position
		const end = liteEndCamera().position
		let previous: number = start[2]
		for (let p = DIVE.hold; p <= 1; p += 0.05) {
			const { position, fov } = liteDiveCamera(p, PHONE)
			expect(position[2]).toBeLessThanOrEqual(previous + 1e-9)
			previous = position[2]
			// On the straight line between the two: the lerp parameter agrees on every axis.
			const t = (position[2] - start[2]) / (end[2] - start[2])
			for (const i of [0, 1])
				expect(position[i]).toBeCloseTo(
					start[i] + (end[i] - start[i]) * t,
					9,
				)
			expect(fov).toBeGreaterThanOrEqual(liteEndCamera().fov)
			expect(fov).toBeLessThanOrEqual(LITE_CAMERAS.hero.fov)
		}
		// Landscape: the stock hero camera flies to the same fit.
		expect(liteDiveCamera(0, 1.6)).toEqual(HERO_CAMERA)
		expect(liteDiveCamera(1, 1.6)).toEqual(liteEndCamera())
	})

	it('the pull-back starts where the dive ended and ends at the lite dawn camera, the field of view widening', () => {
		expect(liteFinaleCamera(0, PHONE)).toEqual(liteEndCamera())
		expect(liteFinaleCamera(FINALE.undock, PHONE)).toEqual(liteEndCamera())
		expect(liteFinaleCamera(1, PHONE)).toEqual(LITE_CAMERAS.dawn)
		expect(liteFinaleCamera(1, 1.6)).toEqual(DAWN_CAMERA)
		const mid = liteFinaleCamera(0.5, PHONE)
		expect(mid.fov).toBeGreaterThan(liteEndCamera().fov)
		expect(mid.fov).toBeLessThan(LITE_CAMERAS.dawn.fov)
		// The bow: the camera swings out in front of the desk on its way.
		expect(mid.position[2]).toBeGreaterThan(
			Math.min(
				liteEndCamera().position[2],
				LITE_CAMERAS.dawn.position[2],
			),
		)
	})
})

describe('dawnFactor', () => {
	it('ramps from 0.55 to 1 over the middle of the finale', () => {
		expect(dawnFactor(0)).toBeCloseTo(0.55)
		expect(dawnFactor(0.5)).toBeCloseTo(0.775)
		expect(dawnFactor(1)).toBeCloseTo(1)
	})
})

describe('finaleUndock', () => {
	it('runs the docking backwards over the undock stretch, then frees the quad', () => {
		expect(finaleUndock(0)).toBe(1)
		expect(finaleUndock(-0.1)).toBe(1)
		expect(finaleUndock(FINALE.undock / 2)).toBeCloseTo(
			1 - (1 - DIVE.dock) / 2,
		)
		expect(finaleUndock(FINALE.undock)).toBe(DIVE.dock)
		expect(finaleUndock(0.5)).toBe(DIVE.dock)
		expect(finaleUndock(1)).toBe(DIVE.dock)
	})
})
