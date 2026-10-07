import { describe, expect, it } from 'vitest'
import { projectPoint } from '@/shared/lib/math/projection'
import { normalize, sub, type Vec2 } from '@/shared/lib/math/vec3'
import {
	DAWN_CAMERA,
	DIVE,
	FINALE,
	HERO_CAMERA,
	LITE_FRAMING,
	LITE_PULLBACK,
	PHONE_CAMERAS,
	PHONE_CARD,
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
	liteFade,
	liteFinaleCamera,
	liteHeroCamera,
	phoneCardProgress,
	phoneDawnCamera,
	phoneDiveCamera,
	phoneFinaleCamera,
	phoneHeroCamera,
} from './camera-path'
import {
	columnWidth,
	projectColumn,
	projectScreen,
	screenAspect,
	screenWidth,
} from './screen-quad'

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
	it('keeps wide viewports and pulls narrow ones back along the line of sight', () => {
		expect(liteHeroCamera(1.6)).toEqual(HERO_CAMERA)
		const narrow = liteHeroCamera(0.46)
		const far = Math.hypot(
			...narrow.position.map((v, i) => v - narrow.target[i]),
		)
		const near = Math.hypot(
			...HERO_CAMERA.position.map((v, i) => v - HERO_CAMERA.target[i]),
		)
		expect(far / near).toBeCloseTo(LITE_PULLBACK / 0.46)
		// The same direction, the aim moved straight down.
		const stockDir = normalize(
			sub(HERO_CAMERA.position, HERO_CAMERA.target),
		)
		const liteDir = normalize(sub(narrow.position, narrow.target))
		for (let i = 0; i < 3; i++)
			expect(liteDir[i]).toBeCloseTo(stockDir[i], 6)
		expect(narrow.target[0]).toBe(HERO_CAMERA.target[0])
		expect(narrow.target[2]).toBe(HERO_CAMERA.target[2])
		expect(narrow.target[1]).toBeLessThan(HERO_CAMERA.target[1])
		expect(narrow.fov).toBe(HERO_CAMERA.fov)
	})

	it('puts the desk top at the portrait share of the frame on a phone', () => {
		const camera = liteHeroCamera(0.46)
		const height = 844
		const width = height * 0.46
		const desk = projectPoint(
			[camera.target[0], DESK_TOP, camera.target[2]],
			camera,
			width,
			height,
		)
		expect(desk).not.toBeNull()
		expect((desk as Vec2)[1] / height).toBeCloseTo(
			LITE_FRAMING.deskShare.hero,
			2,
		)
	})

	it('blends back to the stock aim towards a square window', () => {
		const square = liteHeroCamera(LITE_FRAMING.portraitFrom)
		expect(square.target).toEqual(HERO_CAMERA.target)
		const between = liteHeroCamera(0.9)
		expect(between.target[1]).toBeLessThan(HERO_CAMERA.target[1])
		expect(between.target[1]).toBeGreaterThan(
			liteHeroCamera(0.46).target[1],
		)
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
		expect(columnWidth(0.46)).toBeCloseTo(SCREEN.height * 0.46)
		expect(columnWidth(0.46)).toBeLessThan(screenWidth(0.46))
	})

	it('the dive holds the lite hero camera, travels, and arrives at the exact fit', () => {
		expect(liteDiveCamera(0, 0.46)).toEqual(liteHeroCamera(0.46))
		expect(liteDiveCamera(DIVE.hold, 0.46)).toEqual(liteHeroCamera(0.46))
		expect(liteDiveCamera(DIVE.travelEnd, 0.46)).toEqual(liteEndCamera())
		expect(liteDiveCamera(1, 0.46)).toEqual(liteEndCamera())
		let previous = liteDiveCamera(DIVE.hold, 0.46).position[2]
		for (let p = 0.1; p <= 0.9; p += 0.05) {
			const z = liteDiveCamera(p, 0.46).position[2]
			expect(z).toBeLessThanOrEqual(previous + 1e-9)
			previous = z
		}
	})

	it('the pull-back starts where the dive ended and ends at the lite dawn camera', () => {
		expect(liteFinaleCamera(0, 0.46)).toEqual(liteEndCamera())
		expect(liteFinaleCamera(FINALE.undock, 0.46)).toEqual(liteEndCamera())
		expect(liteFinaleCamera(1, 0.46)).toEqual(liteDawnCamera(0.46))
		expect(liteFinaleCamera(1, 1.6)).toEqual(DAWN_CAMERA)
		const mid = liteFinaleCamera(0.5, 0.46)
		expect(mid.fov).toBeGreaterThan(liteEndCamera().fov)
		expect(mid.fov).toBeLessThan(DAWN_CAMERA.fov)
	})

	it('fades the room out over the docking stretch and in over the undock stretch', () => {
		expect(liteFade('dive', 0)).toBe(1)
		expect(liteFade('dive', DIVE.dock)).toBe(1)
		expect(liteFade('dive', (DIVE.dock + 1) / 2)).toBeCloseTo(0.5)
		expect(liteFade('dive', 1)).toBe(0)
		expect(liteFade('finale', 0)).toBe(0)
		expect(liteFade('finale', FINALE.undock / 2)).toBeCloseTo(0.5)
		expect(liteFade('finale', FINALE.undock)).toBe(1)
		expect(liteFade('finale', 1)).toBe(1)
	})
})

describe('dawnFactor', () => {
	it('ramps from 0.55 to 1 over the middle of the finale', () => {
		expect(dawnFactor(0)).toBeCloseTo(0.55)
		expect(dawnFactor(0.5)).toBeCloseTo(0.775)
		expect(dawnFactor(1)).toBeCloseTo(1)
	})
})

describe('liteDawnCamera', () => {
	it('keeps wide viewports and pulls narrow ones back, aiming lower for the credits', () => {
		expect(liteDawnCamera(1.6)).toEqual(DAWN_CAMERA)
		const narrow = liteDawnCamera(0.5625)
		expect(narrow.fov).toBe(DAWN_CAMERA.fov)
		const far = Math.hypot(
			...narrow.position.map((v, i) => v - narrow.target[i]),
		)
		const near = Math.hypot(
			...DAWN_CAMERA.position.map((v, i) => v - DAWN_CAMERA.target[i]),
		)
		expect(far / near).toBeCloseTo(LITE_PULLBACK / 0.5625)
		const phone = liteDawnCamera(0.46)
		const height = 844
		const desk = projectPoint(
			[phone.target[0], DESK_TOP, phone.target[2]],
			phone,
			height * 0.46,
			height,
		)
		expect((desk as Vec2)[1] / height).toBeCloseTo(
			LITE_FRAMING.deskShare.dawn,
			2,
		)
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

describe('phone variants (Gate 2 round 6)', () => {
	const PHONE = 390 / 844

	it('a and c hold their hero camera through the dive and their dawn camera through the finale', () => {
		for (const variant of ['a', 'c'] as const) {
			for (const p of [0, 0.3, 0.9, 1]) {
				expect(phoneDiveCamera(variant, p, PHONE)).toEqual(
					PHONE_CAMERAS[variant].hero,
				)
				expect(phoneFinaleCamera(variant, p, PHONE)).toEqual(
					PHONE_CAMERAS[variant].dawn,
				)
			}
		}
	})

	it('b flies straight from its hero camera to the exact fit and pulls back from it to its dawn camera', () => {
		expect(phoneDiveCamera('b', 0, PHONE)).toEqual(PHONE_CAMERAS.b.hero)
		expect(phoneDiveCamera('b', DIVE.hold, PHONE)).toEqual(
			PHONE_CAMERAS.b.hero,
		)
		expect(phoneDiveCamera('b', 1, PHONE)).toEqual(liteEndCamera())
		let previous = phoneDiveCamera('b', DIVE.hold, PHONE).position[2]
		for (let p = DIVE.hold; p <= 1; p += 0.05) {
			const z = phoneDiveCamera('b', p, PHONE).position[2]
			expect(z).toBeLessThanOrEqual(previous + 1e-9)
			previous = z
		}
		expect(phoneFinaleCamera('b', 0, PHONE)).toEqual(liteEndCamera())
		expect(phoneFinaleCamera('b', 1, PHONE)).toEqual(PHONE_CAMERAS.b.dawn)
		const mid = phoneFinaleCamera('b', 0.5, PHONE)
		expect(mid.fov).toBeGreaterThan(liteEndCamera().fov)
		expect(mid.fov).toBeLessThan(PHONE_CAMERAS.b.dawn.fov)
	})

	it('keeps the stock cameras on landscape viewports and blends towards them past a portrait one', () => {
		for (const variant of ['a', 'b', 'c'] as const) {
			expect(phoneHeroCamera(variant, 1.6)).toEqual(HERO_CAMERA)
			expect(phoneDawnCamera(variant, 1.6)).toEqual(DAWN_CAMERA)
			expect(phoneHeroCamera(variant, PHONE)).toEqual(
				PHONE_CAMERAS[variant].hero,
			)
			const between = phoneHeroCamera(variant, 0.9).fov
			expect(between).toBeGreaterThan(HERO_CAMERA.fov)
			expect(between).toBeLessThan(PHONE_CAMERAS[variant].hero.fov)
		}
	})

	it('the card grows out of the screen over the dive and is back in it before the finale ends', () => {
		expect(phoneCardProgress('dive', 0)).toBe(DIVE.dock)
		expect(phoneCardProgress('dive', DIVE.hold)).toBe(DIVE.dock)
		expect(phoneCardProgress('dive', 1)).toBe(1)
		let previous: number = DIVE.dock
		for (let p = 0; p <= 1; p += 0.05) {
			const q = phoneCardProgress('dive', p)
			expect(q).toBeGreaterThanOrEqual(previous - 1e-9)
			previous = q
		}
		expect(phoneCardProgress('finale', 0)).toBe(1)
		expect(
			phoneCardProgress('finale', PHONE_CARD.finaleEnd / 2),
		).toBeCloseTo(1 - (1 - DIVE.dock) / 2)
		expect(phoneCardProgress('finale', PHONE_CARD.finaleEnd)).toBe(
			DIVE.dock,
		)
		expect(phoneCardProgress('finale', 1)).toBe(DIVE.dock)
	})

	it('a lowered aspect floor turns the screen portrait without touching the page column', () => {
		expect(screenAspect(PHONE)).toBe(SCREEN.aspectRange[0])
		expect(screenAspect(PHONE, PHONE_CARD.screenAspectFloor)).toBe(
			PHONE_CARD.screenAspectFloor,
		)
		expect(screenAspect(2, 0.5)).toBe(2)
		expect(screenAspect(5, 0.5)).toBe(SCREEN.aspectRange[1])
		expect(screenWidth(PHONE, PHONE_CARD.screenAspectFloor)).toBeCloseTo(
			SCREEN.height * PHONE_CARD.screenAspectFloor,
		)
		expect(columnWidth(PHONE)).toBeCloseTo(SCREEN.height * PHONE)
	})
})
