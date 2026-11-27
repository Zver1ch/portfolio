import type { BufferGeometry } from 'three'
import { DEG } from '@/shared/lib/math/ease'
import type { Vec3 } from '@/shared/lib/math/vec3'
import {
	DESK,
	DESK_TOP,
	KEYBOARD,
	LAMP,
	MONITOR_STAND,
	MOUSE,
	ROOM,
	SCREEN,
	SOCKS,
	TOWER,
	WINDOW,
} from '../../../config/room-layout'
import { mixHex, PALETTE as P, paint } from '../materials'
import { flatRing, Kit, ring, yawAround } from './kit'

/**
 * The static room as two geometries: the opaque set and the painted light.
 * Everything here is palette tokens and mixes of them (plan §3.7); the
 * monitor's bezel and screen depend on the viewport and live in `monitor.ts`.
 */

export const PAINTS = {
	floor: paint(mixHex(P.ink, P.lavender, 0.04), mixHex(P.ink3, P.rose, 0.16)),
	backWall: paint(
		mixHex(P.ink, P.lavender, 0.07),
		mixHex(P.ink3, P.blush, 0.26),
	),
	leftWall: paint(
		mixHex(P.ink, P.lavender, 0.03),
		mixHex(P.ink3, P.blush, 0.18),
	),
	deskTop: paint(mixHex(P.ink3, P.rose, 0.22), mixHex(P.ink3, P.rose, 0.42)),
	deskPanel: paint(
		mixHex(P.ink3, P.rose, 0.12),
		mixHex(P.ink3, P.rose, 0.26),
	),
	bezel: paint(P.ink, mixHex(P.ink, P.blush, 0.18)),
	tower: paint(
		mixHex(P.ink2, P.lavender, 0.18),
		mixHex(P.ink3, P.blush, 0.3),
	),
	towerSlot: paint(P.ink, mixHex(P.ink, P.blush, 0.15)),
	powerDot: paint(P.rose, P.rose),
	keyboard: paint(
		mixHex(P.ink3, P.lavender, 0.12),
		mixHex(P.ink3, P.blush, 0.28),
	),
	key: paint(mixHex(P.ink3, P.lavender, 0.34), mixHex(P.ink3, P.blush, 0.52)),
	mouse: paint(
		mixHex(P.ink3, P.lavender, 0.44),
		mixHex(P.ink3, P.blush, 0.6),
	),
	wheel: paint(P.rose, P.rose),
	lampMetal: paint(
		mixHex(P.ink3, P.lavender, 0.22),
		mixHex(P.ink3, P.blush, 0.36),
	),
	lampShade: paint(P.rose, mixHex(P.rose, P.blush, 0.4)),
	bulb: paint(mixHex(P.orchid, P.snow, 0.55), mixHex(P.blush, P.snow, 0.3)),
	windowFrame: paint(
		mixHex(P.ink2, P.lavender, 0.22),
		mixHex(P.ink3, P.blush, 0.4),
	),
	skyTop: paint(
		mixHex(P.ink, P.lavender, 0.2),
		mixHex(P.lavender, P.orchid, 0.35),
	),
	skyBottom: paint(
		mixHex(P.ink2, P.rose, 0.22),
		mixHex(P.rose, P.blush, 0.25),
	),
	moon: paint(P.snow, mixHex(P.lavender, P.orchid, 0.35)),
	// The floor stockings are the cat's own, so they take its authored colours
	// rather than palette mixes: black, and the body's white (linear 0.8),
	// warmed at dawn the way the cat's shader warms it.
	stocking: paint(0x000000),
	stockingStripe: paint(0xe6e6e6, 0xe6dbcf),
	screenGlow: paint(P.orchid, P.blush),
	moonlight: paint(P.lavender, P.lavender),
	lampPool: paint(P.rose, mixHex(P.rose, P.blush, 0.5)),
	sun: paint(P.blush, mixHex(P.blush, P.orchid, 0.4)),
} as const

export type RoomGeometry = {
	opaque: BufferGeometry
	glow: BufferGeometry
	triangles: number
}

export function buildRoom(): RoomGeometry {
	const kit = new Kit()
	const glow = new Kit(true)

	buildShell(kit)
	buildWindow(kit)
	buildDesk(kit)
	buildMonitorStand(kit)
	buildTower(kit)
	buildKeyboard(kit)
	buildMouse(kit)
	buildLamp(kit)
	buildSocks(kit)
	buildPaintedLight(glow)

	return {
		opaque: kit.build(),
		glow: glow.build(),
		triangles: kit.triangles + glow.triangles,
	}
}

function buildShell(kit: Kit) {
	const { floorY, backWallZ, leftWallX, height } = ROOM
	const right = 2.9
	const front = 1.6
	kit.quad(
		[
			[leftWallX, floorY, backWallZ],
			[right, floorY, backWallZ],
			[right, floorY, front],
			[leftWallX, floorY, front],
		],
		PAINTS.floor,
		{ tone: 1 },
	)
	kit.quad(
		[
			[leftWallX, floorY, backWallZ],
			[leftWallX, height, backWallZ],
			[right, height, backWallZ],
			[right, floorY, backWallZ],
		],
		PAINTS.backWall,
		{ tone: 1 },
	)
	kit.quad(
		[
			[leftWallX, floorY, front],
			[leftWallX, height, front],
			[leftWallX, height, backWallZ],
			[leftWallX, floorY, backWallZ],
		],
		PAINTS.leftWall,
		{ tone: 1 },
	)
	// Skirting board along the back wall.
	kit.box(
		[0.6, floorY + 0.04, backWallZ + 0.012],
		[right - leftWallX, 0.08, 0.024],
		PAINTS.windowFrame,
	)
}

function buildWindow(kit: Kit) {
	const [cx, cy, cz] = WINDOW.center
	const [w, h] = WINDOW.size
	const f = WINDOW.frame
	// Sky: a vertical gradient quad slightly inside the wall.
	kit.gradientQuad(
		[
			[cx - w / 2, cy + h / 2, cz],
			[cx + w / 2, cy + h / 2, cz],
			[cx + w / 2, cy - h / 2, cz],
			[cx - w / 2, cy - h / 2, cz],
		],
		[PAINTS.skyTop, PAINTS.skyTop, PAINTS.skyBottom, PAINTS.skyBottom],
	)
	const [mx, my] = WINDOW.moon.center
	kit.disc([mx, my, cz + 0.003], WINDOW.moon.radius, 28, PAINTS.moon, 'z')
	// Frame: four bars and a cross, standing proud of the wall.
	const depth = 0.03
	const z = cz + depth / 2
	kit.box(
		[cx, cy + h / 2 + f / 2, z],
		[w + 2 * f, f, depth],
		PAINTS.windowFrame,
	)
	kit.box(
		[cx, cy - h / 2 - f / 2, z],
		[w + 2 * f, f, depth],
		PAINTS.windowFrame,
	)
	kit.box([cx - w / 2 - f / 2, cy, z], [f, h, depth], PAINTS.windowFrame)
	kit.box([cx + w / 2 + f / 2, cy, z], [f, h, depth], PAINTS.windowFrame)
	kit.box([cx, cy, cz + 0.008], [f * 0.6, h, 0.016], PAINTS.windowFrame)
	kit.box(
		[cx, cy + h * 0.18, cz + 0.008],
		[w, f * 0.6, 0.016],
		PAINTS.windowFrame,
	)
	// Sill.
	kit.box(
		[cx, cy - h / 2 - f - 0.015, cz + 0.05],
		[w + 2 * f + 0.1, 0.03, 0.1],
		PAINTS.windowFrame,
	)
}

function buildDesk(kit: Kit) {
	kit.box(DESK.center, DESK.size, PAINTS.deskTop)
	const [cx, cy, cz] = DESK.center
	const [w, t, d] = DESK.size
	const panelHeight = cy - t / 2 - ROOM.floorY
	for (const side of [-1, 1] as const) {
		kit.box(
			[
				cx + side * (w / 2 - DESK.panelInset),
				ROOM.floorY + panelHeight / 2,
				cz,
			],
			[0.032, panelHeight, d - 0.06],
			PAINTS.deskPanel,
		)
	}
	// Back rail between the panels.
	kit.box(
		[cx, cy - t / 2 - 0.08, cz - d / 2 + 0.03],
		[w - 2 * DESK.panelInset, 0.16, 0.02],
		PAINTS.deskPanel,
	)
}

function buildMonitorStand(kit: Kit) {
	const [sx, sy, sz] = SCREEN.center
	const [nw, nh, nd] = MONITOR_STAND.neck
	const [bw, bh, bd] = MONITOR_STAND.base
	kit.box([sx, DESK_TOP + bh / 2, sz], [bw, bh, bd], PAINTS.bezel)
	kit.box(
		[sx, DESK_TOP + bh + nh / 2, sz - SCREEN.depth / 2],
		[nw, nh + (sy - SCREEN.height / 2 - DESK_TOP - bh - nh), nd],
		PAINTS.bezel,
	)
}

function buildTower(kit: Kit) {
	const [cx, cy, cz] = TOWER.center
	const [w, h, d] = TOWER.size
	kit.box(TOWER.center, TOWER.size, PAINTS.tower)
	const front = cz + d / 2
	// A vent slot and the power light on the front face.
	kit.box(
		[cx + w * 0.22, cy + h * 0.1, front + 0.002],
		[0.012, h * 0.5, 0.004],
		PAINTS.towerSlot,
	)
	kit.box(
		[cx + w * 0.32, cy + h * 0.1, front + 0.002],
		[0.012, h * 0.5, 0.004],
		PAINTS.towerSlot,
	)
	kit.disc(
		[cx - w * 0.28, cy + h * 0.4, front + 0.003],
		0.009,
		14,
		PAINTS.powerDot,
		'z',
	)
	// Feet.
	for (const dx of [-1, 1] as const)
		for (const dz of [-1, 1] as const)
			kit.box(
				[
					cx + dx * (w / 2 - 0.02),
					cy - h / 2 - 0.006,
					cz + dz * (d / 2 - 0.04),
				],
				[0.03, 0.012, 0.03],
				PAINTS.towerSlot,
			)
}

function buildKeyboard(kit: Kit) {
	const [cx, cy, cz] = KEYBOARD.center
	const [w, d] = KEYBOARD.size
	const { heightBack, heightFront, chamfer, yawDeg } = KEYBOARD
	// A wedge, thinner at the front, with a chamfer around the top edge.
	const top = (z: number) =>
		heightBack + ((heightFront - heightBack) * (z + d / 2)) / d
	const turn = (x: number, y: number, z: number): Vec3 =>
		yawAround([cx + x, cy + y, cz + z], yawDeg, KEYBOARD.center)
	const corners: readonly [number, number][] = [
		[-w / 2, -d / 2],
		[w / 2, -d / 2],
		[w / 2, d / 2],
		[-w / 2, d / 2],
	]
	const inset = (x: number, z: number): [number, number] => [
		x - Math.sign(x) * chamfer,
		z - Math.sign(z) * chamfer,
	]
	kit.loft(
		[
			corners.map(([x, z]) => turn(x, 0, z)),
			corners.map(([x, z]) => turn(x, top(z) - chamfer, z)),
			corners.map(([x, z]) => {
				const [ix, iz] = inset(x, z)
				return turn(ix, top(z), iz)
			}),
		],
		PAINTS.keyboard,
	)
	// Keycaps: small frustums standing on the sloped top.
	const margin = 0.016
	const gap = 0.004
	const bevel = 0.0012
	const keyHeight = KEYBOARD.keyHeight
	const keyW =
		(w - 2 * margin - gap * (KEYBOARD.columns - 1)) / KEYBOARD.columns
	const keyD = (d - 2 * margin - gap * (KEYBOARD.rows - 1)) / KEYBOARD.rows
	for (let row = 0; row < KEYBOARD.rows; row++) {
		for (let col = 0; col < KEYBOARD.columns; col++) {
			const spaceBar = row === KEYBOARD.rows - 1 && col >= 4 && col <= 9
			if (spaceBar && col !== 4) continue
			const x0 = -w / 2 + margin + col * (keyW + gap)
			const x1 = spaceBar ? x0 + 6 * keyW + 5 * gap : x0 + keyW
			const z0 = -d / 2 + margin + row * (keyD + gap)
			const z1 = z0 + keyD
			const base = top((z0 + z1) / 2) + 0.0005
			const foot: Vec3[] = [
				turn(x0, base, z0),
				turn(x1, base, z0),
				turn(x1, base, z1),
				turn(x0, base, z1),
			]
			const crown: Vec3[] = [
				turn(x0 + bevel, base + keyHeight, z0 + bevel),
				turn(x1 - bevel, base + keyHeight, z0 + bevel),
				turn(x1 - bevel, base + keyHeight, z1 - bevel),
				turn(x0 + bevel, base + keyHeight, z1 - bevel),
			]
			kit.loft([foot, crown], PAINTS.key)
		}
	}
}

function buildMouse(kit: Kit) {
	const [cx, cy, cz] = MOUSE.center
	const [w, h, d] = MOUSE.size
	const segments = 12
	// A domed body lofted from five ellipses, the crown sliding backwards.
	const level = (y: number, scaleX: number, scaleZ: number, shiftZ: number) =>
		flatRing(
			[cx, cy + y, cz + shiftZ],
			(w / 2) * scaleX,
			(d / 2) * scaleZ,
			segments,
		).map((point) => yawAround(point, MOUSE.yawDeg, MOUSE.center))
	kit.loft(
		[
			level(0.0005, 1, 1, 0),
			level(h * 0.3, 1, 1, -0.001),
			level(h * 0.6, 0.9, 0.92, -0.003),
			level(h * 0.85, 0.7, 0.78, -0.006),
			level(h, 0.38, 0.5, -0.009),
		],
		PAINTS.mouse,
	)
	// Scroll wheel across the front slope.
	const wheelCentre: Vec3 = [cx, cy + h * 0.82, cz - d * 0.3]
	const from = yawAround(
		[wheelCentre[0] - 0.004, wheelCentre[1], wheelCentre[2]],
		MOUSE.yawDeg,
		MOUSE.center,
	)
	const to = yawAround(
		[wheelCentre[0] + 0.004, wheelCentre[1], wheelCentre[2]],
		MOUSE.yawDeg,
		MOUSE.center,
	)
	kit.tube(from, to, 0.0055, 0.0055, 8, PAINTS.wheel, {
		capFrom: true,
		capTo: true,
	})
}

function buildLamp(kit: Kit) {
	const [bx, by, bz] = LAMP.base
	const r = LAMP.armRadius
	// Base plate and a short post.
	kit.tube(
		[bx, by, bz],
		[bx, by + 0.02, bz],
		LAMP.baseRadius,
		LAMP.baseRadius * 0.94,
		18,
		PAINTS.lampMetal,
		{ capTo: true },
	)
	const postTop: Vec3 = [bx, by + 0.02 + LAMP.postHeight, bz]
	kit.tube(
		[bx, by + 0.02, bz],
		postTop,
		r * 1.2,
		r * 1.2,
		10,
		PAINTS.lampMetal,
	)
	// Two arms with knobs at the joints.
	kit.sphere(postTop, 0.02, PAINTS.lampMetal)
	kit.tube(postTop, LAMP.elbow, r, r, 8, PAINTS.lampMetal)
	kit.sphere(LAMP.elbow, 0.021, PAINTS.lampMetal)
	kit.tube(LAMP.elbow, LAMP.head, r, r, 8, PAINTS.lampMetal)
	kit.sphere(LAMP.head, 0.019, PAINTS.lampMetal)
	// Bell shade aimed at the desk, with the bulb glowing inside the opening.
	const direction = unit3(sub3(LAMP.headTarget, LAMP.head))
	const along = (t: number): Vec3 => [
		LAMP.head[0] + direction[0] * t,
		LAMP.head[1] + direction[1] * t,
		LAMP.head[2] + direction[2] * t,
	]
	kit.tube(
		along(0.015),
		along(LAMP.shadeLength),
		0.028,
		LAMP.shadeRadius,
		18,
		PAINTS.lampShade,
		{ capFrom: true },
	)
	const bulbCentre = along(LAMP.shadeLength - 0.012)
	const [u, v] = frameOf3(direction)
	const bulbRing: Vec3[] = []
	for (let i = 0; i < 18; i++) {
		const a = (i / 18) * Math.PI * 2
		const rr = LAMP.shadeRadius * 0.82
		bulbRing.push([
			bulbCentre[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * rr,
			bulbCentre[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * rr,
			bulbCentre[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * rr,
		])
	}
	kit.fan(bulbCentre, bulbRing, LAMP.head, PAINTS.bulb, 1)
}

function add3(a: Vec3, b: Vec3): Vec3 {
	return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function sub3(a: Vec3, b: Vec3): Vec3 {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function cross3(a: Vec3, b: Vec3): Vec3 {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0],
	]
}

function unit3(a: Vec3): Vec3 {
	const len = Math.hypot(a[0], a[1], a[2]) || 1
	return [a[0] / len, a[1] / len, a[2] / len]
}

function frameOf3(axis: Vec3): [Vec3, Vec3] {
	const helper: Vec3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
	const ux = helper[1] * axis[2] - helper[2] * axis[1]
	const uy = helper[2] * axis[0] - helper[0] * axis[2]
	const uz = helper[0] * axis[1] - helper[1] * axis[0]
	const u = unit3([ux, uy, uz])
	const v: Vec3 = [
		axis[1] * u[2] - axis[2] * u[1],
		axis[2] * u[0] - axis[0] * u[2],
		axis[0] * u[1] - axis[1] * u[0],
	]
	return [u, v]
}

function buildSocks(kit: Kit) {
	const [cx, cy, cz] = SOCKS.center
	// One nearly straight, foot towards the viewer; one bent at the knee,
	// foot back towards the desk. Neither crosses the other.
	buildStocking(kit, [cx - 0.24, cy, cz - 0.04], SOCKS.yawDeg, -1, 14)
	buildStocking(kit, [cx + 0.04, cy, cz + 0.04], SOCKS.yawDeg - 20, 1, 36)
}

/**
 * One of the cat's stockings dropped on the floor: an empty thigh-high lying
 * flat, lofted along a path that kinks at the knee and folds at the heel,
 * tapering from the cuff to the ankle and on to a rounded toe, with the two
 * white stripes below the cuff. `mirror` flips the bends, `kneeDeg` is the
 * kink at the knee; the stocking starts at `origin` with its cuff and runs
 * along local +Z turned by `yawDeg`.
 */
function buildStocking(
	kit: Kit,
	origin: Vec3,
	yawDeg: number,
	mirror: number,
	kneeDeg: number,
) {
	const { length, foot, cuffWidth, ankleWidth, thickness } = SOCKS
	const up: Vec3 = [0, 1, 0]
	const knee = length / 2
	const heelDeg = kneeDeg + 75
	const heading = (deg: number): Vec3 => [
		mirror * Math.sin(deg * DEG),
		0,
		Math.cos(deg * DEG),
	]
	// Local position and tangent at distance `s` along cuff → knee → heel → toe.
	const along = (s: number): { x: number; z: number; tangent: Vec3 } => {
		const legs: [number, Vec3][] = [
			[knee, heading(0)],
			[length - knee, heading(kneeDeg)],
			[foot, heading(heelDeg)],
		]
		let x = 0
		let z = 0
		let left = s
		for (const [span, dir] of legs) {
			const step = Math.min(left, span)
			x += dir[0] * step
			z += dir[2] * step
			left -= step
			if (left <= 1e-9) return { x, z, tangent: dir }
		}
		return { x, z, tangent: legs[legs.length - 1][1] }
	}
	const at = (x: number, z: number, y = 0): Vec3 =>
		yawAround([origin[0] + x, origin[1] + y, origin[2] + z], yawDeg, origin)
	// The empty stocking's flat width, cuff to ankle, then the foot.
	const widthAt = (s: number) =>
		s <= length
			? cuffWidth + (ankleWidth - cuffWidth) * (s / length)
			: ankleWidth * 0.95
	// A flattened ellipse resting on the floor across `tangent`; a fold
	// station takes the bisector and widens by the mitre of its turn.
	const station = (
		s: number,
		{
			tangent = along(s).tangent,
			width = 1,
			height = 1,
			turnDeg = 0,
		}: {
			tangent?: Vec3
			width?: number
			height?: number
			turnDeg?: number
		} = {},
	) => {
		const { x, z } = along(s)
		const across = unit3(cross3(tangent, up))
		const yawed = unit3(sub3(at(x + across[0], z + across[2]), at(x, z)))
		const w = (widthAt(s) * width) / Math.cos((turnDeg / 2) * DEG)
		const h = thickness * height
		return ring(at(x, z, h / 2), yawed, up, w / 2, h / 2, 14)
	}
	const fold = (s: number, fromDeg: number, toDeg: number) =>
		station(s, {
			tangent: unit3(add3(heading(fromDeg), heading(toDeg))),
			turnDeg: toDeg - fromDeg,
		})
	const [[a0, a1], [b0, b1]] = SOCKS.stripes
	const rings = [
		station(0, { height: 1.3 }),
		station(a0, { height: 1.2 }),
		station(a1, { height: 1.1 }),
		station(b0),
		station(b1),
		station(0.06),
		station(0.09),
		fold(knee, 0, kneeDeg),
		station(0.16),
		station(0.2),
		fold(length, kneeDeg, heelDeg),
		station(length + foot * 0.4),
		station(length + foot * 0.75, { width: 0.85 }),
		station(length + foot * 0.92, { width: 0.55, height: 0.7 }),
		station(length + foot, { width: 0.2, height: 0.4 }),
	]
	const paints = rings.map((_, segment) =>
		segment === 1 || segment === 3 ? PAINTS.stockingStripe : undefined,
	)
	kit.loft(rings, PAINTS.stocking, {
		closeStart: true,
		closeEnd: true,
		paints,
	})
}

function buildPaintedLight(glow: Kit) {
	const [sx, , sz] = SCREEN.center
	const y = DESK_TOP + 0.0015
	// Screen glow falling on the desk and whatever lies on it.
	glow.gradientQuad(
		[
			[sx - 0.45, y, sz + 0.1],
			[sx + 0.45, y, sz + 0.1],
			[sx + 0.6, y, sz + 0.52],
			[sx - 0.6, y, sz + 0.52],
		],
		[
			PAINTS.screenGlow,
			PAINTS.screenGlow,
			PAINTS.screenGlow,
			PAINTS.screenGlow,
		],
		[0.34, 0.34, 0, 0],
		[0.1, 0.1, 0, 0],
	)
	// Moonlight through the window onto the floor.
	const floor = ROOM.floorY + 0.002
	glow.gradientQuad(
		[
			[-1.3, floor, ROOM.backWallZ + 0.03],
			[-0.45, floor, ROOM.backWallZ + 0.03],
			[-0.05, floor, -0.45],
			[-1.05, floor, -0.45],
		],
		[
			PAINTS.moonlight,
			PAINTS.moonlight,
			PAINTS.moonlight,
			PAINTS.moonlight,
		],
		[0.17, 0.17, 0, 0],
		[0, 0, 0, 0],
	)
	// The lamp's pool on the desk.
	const [px, , pz] = LAMP.headTarget
	glow.glowDisc(
		[px, y + 0.0005, pz],
		0.3,
		20,
		PAINTS.lampPool,
		0.3,
		0.12,
		0.8,
	)
	// Dawn: the sun comes in through the window and lands on the floor and the desk.
	glow.gradientQuad(
		[
			[-1.35, floor, ROOM.backWallZ + 0.03],
			[-0.3, floor, ROOM.backWallZ + 0.03],
			[0.3, floor, -0.2],
			[-1.0, floor, -0.2],
		],
		[PAINTS.sun, PAINTS.sun, PAINTS.sun, PAINTS.sun],
		[0, 0, 0, 0],
		[0.55, 0.55, 0.08, 0.08],
	)
	glow.gradientQuad(
		[
			[-0.5, y + 0.001, -1.5],
			[0.9, y + 0.001, -1.5],
			[0.9, y + 0.001, -0.82],
			[-0.5, y + 0.001, -0.82],
		],
		[PAINTS.sun, PAINTS.sun, PAINTS.sun, PAINTS.sun],
		[0, 0, 0, 0],
		[0.3, 0.14, 0.14, 0.3],
	)
}
