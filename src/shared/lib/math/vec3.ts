/** Tuple vectors for camera and pose maths; no three.js in the initial bundle. */
export type Vec2 = readonly [number, number]
export type Vec3 = readonly [number, number, number]

export const ZERO: Vec3 = [0, 0, 0]
export const UP: Vec3 = [0, 1, 0]

export function add(a: Vec3, b: Vec3): Vec3 {
	return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function sub(a: Vec3, b: Vec3): Vec3 {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function scale(a: Vec3, s: number): Vec3 {
	return [a[0] * s, a[1] * s, a[2] * s]
}

export function dot(a: Vec3, b: Vec3): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function cross(a: Vec3, b: Vec3): Vec3 {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0],
	]
}

export function length(a: Vec3): number {
	return Math.hypot(a[0], a[1], a[2])
}

export function distance(a: Vec3, b: Vec3): number {
	return length(sub(a, b))
}

/** Unit vector; the zero vector stays zero instead of producing NaN. */
export function normalize(a: Vec3): Vec3 {
	const len = length(a)
	return len > 0 ? [a[0] / len, a[1] / len, a[2] / len] : ZERO
}

export function lerp(a: Vec3, b: Vec3, t: number): Vec3 {
	return [
		a[0] + (b[0] - a[0]) * t,
		a[1] + (b[1] - a[1]) * t,
		a[2] + (b[2] - a[2]) * t,
	]
}

/** Quadratic Bézier through `a`, control `c`, `b`. */
export function bezier2(a: Vec3, c: Vec3, b: Vec3, t: number): Vec3 {
	const u = 1 - t
	return [
		u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
		u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
		u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
	]
}
