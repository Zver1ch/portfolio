import type { Vec2 } from './vec3'

/** Corner order everywhere: top-left, top-right, bottom-right, bottom-left. */
export type Quad = readonly [Vec2, Vec2, Vec2, Vec2]

/**
 * The CSS `matrix3d` that maps a `width × height` box with its origin at the
 * top-left corner onto `quad` (plan §3.5), or null when the quad is
 * degenerate. Column-major, as CSS wants it.
 */
export function quadToMatrix3d(
	quad: Quad,
	width: number,
	height: number,
): number[] | null {
	const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad
	const dx1 = x1 - x2
	const dx2 = x3 - x2
	const dx3 = x0 - x1 + x2 - x3
	const dy1 = y1 - y2
	const dy2 = y3 - y2
	const dy3 = y0 - y1 + y2 - y3
	const den = dx1 * dy2 - dx2 * dy1
	if (Math.abs(den) < 1e-9 || width <= 0 || height <= 0) return null
	const g = (dx3 * dy2 - dx2 * dy3) / den
	const h = (dx1 * dy3 - dx3 * dy1) / den
	const a = x1 - x0 + g * x1
	const b = x3 - x0 + h * x3
	const d = y1 - y0 + g * y1
	const e = y3 - y0 + h * y3
	return [
		a / width,
		d / width,
		0,
		g / width,
		b / height,
		e / height,
		0,
		h / height,
		0,
		0,
		1,
		0,
		x0,
		y0,
		0,
		1,
	]
}

/** Where the matrix sends a point of the box; for tests and the docking check. */
export function applyMatrix3d(matrix: number[], x: number, y: number): Vec2 {
	const px = matrix[0] * x + matrix[4] * y + matrix[12]
	const py = matrix[1] * x + matrix[5] * y + matrix[13]
	const pw = matrix[3] * x + matrix[7] * y + matrix[15]
	return [px / pw, py / pw]
}

/** The CSS value for a matrix. */
export function matrix3dValue(matrix: number[]): string {
	return `matrix3d(${matrix.map((v) => +v.toFixed(6)).join(',')})`
}
