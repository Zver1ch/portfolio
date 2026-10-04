import { DEG } from '@/shared/lib/math/ease'
import { distance, dot, sub, type Vec3 } from '@/shared/lib/math/vec3'
import {
	DESK,
	DESK_TOP,
	KEYBOARD,
	LAMP,
	MONITOR_STAND,
	MOUSE,
	SCREEN,
	TOWER,
} from './room-layout'

/**
 * Solid furniture the cat must not enter. `depth` is how far a world point
 * is inside, in metres, 0 outside; the lab's penetration check runs every
 * skinned vertex of the posed cat through these (plan §7, "no mesh
 * interpenetration").
 */
export type Collider = {
	name: string
	depth(point: Vec3): number
}

function box(name: string, center: Vec3, size: Vec3): Collider {
	return {
		name,
		depth([x, y, z]) {
			const dx = size[0] / 2 - Math.abs(x - center[0])
			const dy = size[1] / 2 - Math.abs(y - center[1])
			const dz = size[2] / 2 - Math.abs(z - center[2])
			return dx > 0 && dy > 0 && dz > 0 ? Math.min(dx, dy, dz) : 0
		},
	}
}

function capsule(name: string, a: Vec3, b: Vec3, radius: number): Collider {
	const axis = sub(b, a)
	const lengthSq = dot(axis, axis)
	return {
		name,
		depth(point) {
			const t =
				lengthSq > 0
					? Math.min(
							1,
							Math.max(0, dot(sub(point, a), axis) / lengthSq),
						)
					: 0
			const closest: Vec3 = [
				a[0] + axis[0] * t,
				a[1] + axis[1] * t,
				a[2] + axis[2] * t,
			]
			const d = radius - distance(point, closest)
			return d > 0 ? d : 0
		},
	}
}

/** Everything under the desk top inside its footprint is inside the desk. */
function deskTop(): Collider {
	const [cx, , cz] = DESK.center
	const [w, , d] = DESK.size
	return {
		name: 'desk',
		depth([x, y, z]) {
			if (Math.abs(x - cx) > w / 2 || Math.abs(z - cz) > d / 2) return 0
			return y < DESK_TOP ? DESK_TOP - y : 0
		},
	}
}

/** The keyboard wedge with its keycaps, in its yawed frame. */
function keyboard(): Collider {
	const [cx, , cz] = KEYBOARD.center
	const [w, d] = KEYBOARD.size
	const cos = Math.cos(KEYBOARD.yawDeg * DEG)
	const sin = Math.sin(KEYBOARD.yawDeg * DEG)
	return {
		name: 'keyboard',
		depth([x, y, z]) {
			const lx = (x - cx) * cos - (z - cz) * sin
			const lz = (x - cx) * sin + (z - cz) * cos
			if (Math.abs(lx) > w / 2 || Math.abs(lz) > d / 2) return 0
			// The wedge is tallest at the back (towards the monitor, -z).
			const t = (lz + d / 2) / d
			const top =
				DESK_TOP +
				KEYBOARD.heightBack +
				(KEYBOARD.heightFront - KEYBOARD.heightBack) * t +
				KEYBOARD.keyHeight
			return y < top ? top - y : 0
		},
	}
}

/** The mouse dome: an elliptical footprint under a rounded top. */
function mouse(): Collider {
	const [cx, , cz] = MOUSE.center
	const [w, h, d] = MOUSE.size
	const cos = Math.cos(MOUSE.yawDeg * DEG)
	const sin = Math.sin(MOUSE.yawDeg * DEG)
	return {
		name: 'mouse',
		depth([x, y, z]) {
			const lx = (x - cx) * cos - (z - cz) * sin
			const lz = (x - cx) * sin + (z - cz) * cos
			const r2 = (lx / (w / 2)) ** 2 + (lz / (d / 2)) ** 2
			if (r2 >= 1) return 0
			const top = DESK_TOP + h * Math.sqrt(1 - r2 * r2)
			return y < top ? top - y : 0
		},
	}
}

function monitor(screenWidth: number): Collider[] {
	const [cx, cy, cz] = SCREEN.center
	const h = SCREEN.height
	const b = SCREEN.bezel
	const zc = cz - 0.0015 - SCREEN.depth / 2
	return [
		box(
			'monitor',
			[cx, cy, zc],
			[screenWidth + 2 * b, h + 2 * b, SCREEN.depth],
		),
		box(
			'monitor chin',
			[cx, cy - h / 2 - b - 0.012, zc],
			[screenWidth + 2 * b, 0.024, SCREEN.depth],
		),
	]
}

function monitorStand(): Collider[] {
	const [sx, sy, sz] = SCREEN.center
	const [nw, , nd] = MONITOR_STAND.neck
	const [bw, bh, bd] = MONITOR_STAND.base
	const neckHeight = sy - SCREEN.height / 2 - DESK_TOP - bh
	return [
		box('monitor base', [sx, DESK_TOP + bh / 2, sz], [bw, bh, bd]),
		box(
			'monitor neck',
			[sx, DESK_TOP + bh + neckHeight / 2, sz - SCREEN.depth / 2],
			[nw, neckHeight, nd],
		),
	]
}

function lamp(): Collider[] {
	const [bx, by, bz] = LAMP.base
	const postTop: Vec3 = [bx, by + 0.02 + LAMP.postHeight, bz]
	const toTarget = sub(LAMP.headTarget, LAMP.head)
	const length = distance(LAMP.headTarget, LAMP.head)
	const shadeEnd: Vec3 = [
		LAMP.head[0] + (toTarget[0] / length) * LAMP.shadeLength,
		LAMP.head[1] + (toTarget[1] / length) * LAMP.shadeLength,
		LAMP.head[2] + (toTarget[2] / length) * LAMP.shadeLength,
	]
	return [
		box(
			'lamp base',
			[bx, by + 0.01, bz],
			[LAMP.baseRadius * 2, 0.02, LAMP.baseRadius * 2],
		),
		capsule(
			'lamp post',
			[bx, by + 0.02, bz],
			postTop,
			LAMP.armRadius * 1.2,
		),
		capsule('lamp arm', postTop, LAMP.elbow, LAMP.armRadius),
		capsule('lamp arm', LAMP.elbow, LAMP.head, LAMP.armRadius),
		capsule('lamp shade', LAMP.head, shadeEnd, LAMP.shadeRadius),
	]
}

/** The room's solids for a monitor of `screenWidth` metres. */
export function roomColliders(screenWidth: number): Collider[] {
	return [
		deskTop(),
		keyboard(),
		mouse(),
		...monitor(screenWidth),
		...monitorStand(),
		...lamp(),
		box('tower', TOWER.center, TOWER.size),
	]
}
