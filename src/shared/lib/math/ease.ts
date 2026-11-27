export function clamp(x: number, min: number, max: number): number {
	return x < min ? min : x > max ? max : x
}

export function clamp01(x: number): number {
	return clamp(x, 0, 1)
}

export function mix(a: number, b: number, t: number): number {
	return a + (b - a) * t
}

/** 0 before `edge0`, 1 after `edge1`, Hermite in between (the GLSL function). */
export function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = clamp01((x - edge0) / (edge1 - edge0))
	return t * t * (3 - 2 * t)
}

/** Position of `x` inside `[a, b]`, clamped to 0..1. */
export function unlerp(a: number, b: number, x: number): number {
	return a === b ? 0 : clamp01((x - a) / (b - a))
}

export function easeInOutCubic(t: number): number {
	const x = clamp01(t)
	return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

export function easeOutCubic(t: number): number {
	return 1 - (1 - clamp01(t)) ** 3
}

export function easeInOutSine(t: number): number {
	return -(Math.cos(Math.PI * clamp01(t)) - 1) / 2
}

export const DEG = Math.PI / 180

export function degToRad(degrees: number): number {
	return degrees * DEG
}
