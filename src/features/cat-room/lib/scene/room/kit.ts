import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { Vec3 } from '@/shared/lib/math/vec3'
import { ROOM_TONES } from '../../../config/tuning'
import { type Paint, toLinear } from '../materials'

/**
 * Geometry builders for the room. Everything is non-indexed with two colour
 * attributes per vertex, `color` (night) and `colorDawn`, so the whole static
 * set merges into one mesh. Light is painted: each face gets a tone from its
 * normal, computed once here, never from a runtime light.
 */

type Tri = readonly [Vec3, Vec3, Vec3]

export type FaceOptions = {
	/** Override the tone derived from the normal (1 keeps the colour as is). */
	tone?: number
}

/** Tone of a face from its outward normal: top brightest, undersides darkest. */
export function toneFor(normal: Vec3): number {
	const [x, y, z] = normal
	if (y > 0.5) return ROOM_TONES.top
	if (y < -0.5) return ROOM_TONES.away
	if (z > 0.5) return ROOM_TONES.front
	if (z < -0.5) return ROOM_TONES.away
	return Math.abs(x) > 0.5 ? ROOM_TONES.side : ROOM_TONES.front
}

function normalOf([a, b, c]: Tri): Vec3 {
	const ux = b[0] - a[0]
	const uy = b[1] - a[1]
	const uz = b[2] - a[2]
	const vx = c[0] - a[0]
	const vy = c[1] - a[1]
	const vz = c[2] - a[2]
	const nx = uy * vz - uz * vy
	const ny = uz * vx - ux * vz
	const nz = ux * vy - uy * vx
	const len = Math.hypot(nx, ny, nz) || 1
	return [nx / len, ny / len, nz / len]
}

function rotateY([x, y, z]: Vec3, degrees: number, [cx, , cz]: Vec3): Vec3 {
	if (!degrees) return [x, y, z]
	const a = (degrees * Math.PI) / 180
	const dx = x - cx
	const dz = z - cz
	return [
		cx + dx * Math.cos(a) + dz * Math.sin(a),
		y,
		cz - dx * Math.sin(a) + dz * Math.cos(a),
	]
}

function sub3(a: Vec3, b: Vec3): Vec3 {
	return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function dot3(a: Vec3, b: Vec3): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function cross3(a: Vec3, b: Vec3): Vec3 {
	return [
		a[1] * b[2] - a[2] * b[1],
		a[2] * b[0] - a[0] * b[2],
		a[0] * b[1] - a[1] * b[0],
	]
}

function unit(a: Vec3): Vec3 {
	const len = Math.hypot(a[0], a[1], a[2]) || 1
	return [a[0] / len, a[1] / len, a[2] / len]
}

function centroid(points: readonly Vec3[]): Vec3 {
	const sum: [number, number, number] = [0, 0, 0]
	for (const p of points) {
		sum[0] += p[0]
		sum[1] += p[1]
		sum[2] += p[2]
	}
	return [
		sum[0] / points.length,
		sum[1] / points.length,
		sum[2] / points.length,
	]
}

/** Two unit vectors perpendicular to `axis` and to each other. */
export function frameOf(axis: Vec3): [Vec3, Vec3] {
	const a = unit(axis)
	const helper: Vec3 = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
	const u = unit(cross3(helper, a))
	const v = cross3(a, u)
	return [u, v]
}

/** Turns a point about the Y axis through `pivot`. */
export function yawAround(
	[x, y, z]: Vec3,
	degrees: number,
	[cx, , cz]: Vec3,
): Vec3 {
	if (!degrees) return [x, y, z]
	const a = (degrees * Math.PI) / 180
	const dx = x - cx
	const dz = z - cz
	return [
		cx + dx * Math.cos(a) + dz * Math.sin(a),
		y,
		cz - dx * Math.sin(a) + dz * Math.cos(a),
	]
}

/** Points of an ellipse around `center` in the plane spanned by `u` and `v`. */
export function ring(
	center: Vec3,
	u: Vec3,
	v: Vec3,
	radiusU: number,
	radiusV: number,
	segments: number,
	phase = 0,
): Vec3[] {
	const points: Vec3[] = []
	for (let i = 0; i < segments; i++) {
		const a = phase + (i / segments) * Math.PI * 2
		const c = Math.cos(a) * radiusU
		const d = Math.sin(a) * radiusV
		points.push([
			center[0] + u[0] * c + v[0] * d,
			center[1] + u[1] * c + v[1] * d,
			center[2] + u[2] * c + v[2] * d,
		])
	}
	return points
}

const X_AXIS: Vec3 = [1, 0, 0]
const Z_AXIS: Vec3 = [0, 0, 1]

/** A horizontal ellipse at height `y` (for lofted props standing on a surface). */
export function flatRing(
	center: Vec3,
	radiusX: number,
	radiusZ: number,
	segments: number,
): Vec3[] {
	return ring(center, X_AXIS, Z_AXIS, radiusX, radiusZ, segments)
}

/** Accumulates triangles; `alpha` builders write RGBA colours for glow quads. */
export class Kit {
	private readonly positions: number[] = []
	private readonly colors: number[] = []
	private readonly colorsDawn: number[] = []
	readonly channels: 3 | 4

	constructor(alpha = false) {
		this.channels = alpha ? 4 : 3
	}

	get triangles(): number {
		return this.positions.length / 9
	}

	/** One triangle with a flat colour; alpha only matters on alpha kits. */
	tri(
		[a, b, c]: Tri,
		paint: Paint,
		{
			tone,
			alpha = 1,
			alphaDawn = alpha,
		}: FaceOptions & { alpha?: number; alphaDawn?: number } = {},
	) {
		const t = tone ?? toneFor(normalOf([a, b, c]))
		const night = toLinear(paint.night, t)
		const dawn = toLinear(paint.dawn, t)
		for (const p of [a, b, c]) {
			this.positions.push(p[0], p[1], p[2])
			this.colors.push(...night)
			this.colorsDawn.push(...dawn)
			if (this.channels === 4) {
				this.colors.push(alpha)
				this.colorsDawn.push(alphaDawn)
			}
		}
	}

	/** A quad from four corners in order (any winding), split into two triangles. */
	quad(
		corners: readonly [Vec3, Vec3, Vec3, Vec3],
		paint: Paint,
		options?: FaceOptions,
	) {
		const [a, b, c, d] = corners
		this.tri([a, b, c], paint, options)
		this.tri([a, c, d], paint, options)
	}

	/**
	 * A quad whose corners carry their own colours and alphas: gradients for
	 * the window sky, the screen glow, the painted light pools.
	 */
	gradientQuad(
		corners: readonly [Vec3, Vec3, Vec3, Vec3],
		paints: readonly [Paint, Paint, Paint, Paint],
		alphas: readonly [number, number, number, number] = [1, 1, 1, 1],
		alphasDawn: readonly [number, number, number, number] = alphas,
		tone = 1,
	) {
		const push = (i: number) => {
			const p = corners[i]
			this.positions.push(p[0], p[1], p[2])
			this.colors.push(...toLinear(paints[i].night, tone))
			this.colorsDawn.push(...toLinear(paints[i].dawn, tone))
			if (this.channels === 4) {
				this.colors.push(alphas[i])
				this.colorsDawn.push(alphasDawn[i])
			}
		}
		for (const i of [0, 1, 2, 0, 2, 3]) push(i)
	}

	/** An axis-aligned box (optionally turned about Y) with per-face tones. */
	box(
		center: Vec3,
		size: Vec3,
		paint: Paint,
		{ yaw = 0, tone }: { yaw?: number; tone?: number } = {},
	) {
		const [cx, cy, cz] = center
		const [hx, hy, hz] = [size[0] / 2, size[1] / 2, size[2] / 2]
		const v = (sx: number, sy: number, sz: number): Vec3 =>
			rotateY([cx + sx * hx, cy + sy * hy, cz + sz * hz], yaw, center)
		const faces: [Vec3, Vec3, Vec3, Vec3][] = [
			[v(-1, 1, 1), v(1, 1, 1), v(1, 1, -1), v(-1, 1, -1)], // top
			[v(-1, -1, -1), v(1, -1, -1), v(1, -1, 1), v(-1, -1, 1)], // bottom
			[v(-1, -1, 1), v(1, -1, 1), v(1, 1, 1), v(-1, 1, 1)], // front +z
			[v(1, -1, -1), v(-1, -1, -1), v(-1, 1, -1), v(1, 1, -1)], // back -z
			[v(1, -1, 1), v(1, -1, -1), v(1, 1, -1), v(1, 1, 1)], // right +x
			[v(-1, -1, -1), v(-1, -1, 1), v(-1, 1, 1), v(-1, 1, -1)], // left -x
		]
		for (const face of faces) this.quad(face, paint, { tone })
	}

	/** A (possibly tapered) cylinder standing on `base`, with caps. */
	cylinder(
		base: Vec3,
		radiusBottom: number,
		radiusTop: number,
		height: number,
		segments: number,
		paint: Paint,
		{ caps = true }: { caps?: boolean } = {},
	) {
		const [cx, cy, cz] = base
		const ring = (r: number, y: number, i: number): Vec3 => {
			const a = (i / segments) * Math.PI * 2
			return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]
		}
		for (let i = 0; i < segments; i++) {
			const b0 = ring(radiusBottom, cy, i)
			const b1 = ring(radiusBottom, cy, i + 1)
			const t0 = ring(radiusTop, cy + height, i)
			const t1 = ring(radiusTop, cy + height, i + 1)
			this.quad([b1, b0, t0, t1], paint)
			if (caps) {
				if (radiusTop > 0)
					this.tri([[cx, cy + height, cz], t0, t1], paint, {
						tone: ROOM_TONES.top,
					})
				if (radiusBottom > 0)
					this.tri([[cx, cy, cz], b1, b0], paint, {
						tone: ROOM_TONES.away,
					})
			}
		}
	}

	/** A flat disc facing +Y (or any axis via `up`), used for the moon and paw prints. */
	disc(
		center: Vec3,
		radius: number,
		segments: number,
		paint: Paint,
		up: 'y' | 'z' = 'y',
		tone = 1,
	) {
		const [cx, cy, cz] = center
		const point = (i: number): Vec3 => {
			const a = (i / segments) * Math.PI * 2
			return up === 'y'
				? [cx + Math.cos(a) * radius, cy, cz - Math.sin(a) * radius]
				: [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, cz]
		}
		for (let i = 0; i < segments; i++)
			this.tri([center, point(i), point(i + 1)], paint, { tone })
	}

	/**
	 * A triangular prism lying along Z: a wedge with a sloping top, used for
	 * the socks. `size` is width, height, length; the ridge sits at `ridge`
	 * (0..1 across the width).
	 */
	prism(
		center: Vec3,
		size: Vec3,
		paint: Paint,
		{ yaw = 0, ridge = 0.5 }: { yaw?: number; ridge?: number } = {},
	) {
		const [cx, cy, cz] = center
		const [w, h, l] = size
		const p = (x: number, y: number, z: number): Vec3 =>
			rotateY([cx + x, cy + y, cz + z], yaw, center)
		const rx = -w / 2 + w * ridge
		const bl0 = p(-w / 2, 0, -l / 2)
		const br0 = p(w / 2, 0, -l / 2)
		const bl1 = p(-w / 2, 0, l / 2)
		const br1 = p(w / 2, 0, l / 2)
		const t0 = p(rx, h, -l / 2)
		const t1 = p(rx, h, l / 2)
		this.quad([bl1, t1, t0, bl0], paint) // left slope
		this.quad([br0, t0, t1, br1], paint) // right slope
		this.tri([bl0, t0, br0], paint) // back end
		this.tri([br1, t1, bl1], paint) // front end
		this.quad([bl0, br0, br1, bl1], paint, { tone: ROOM_TONES.away }) // bottom
	}

	/** A quad whose normal points away from `inside` (winding fixed up for the tone). */
	outwardQuad(
		corners: readonly [Vec3, Vec3, Vec3, Vec3],
		inside: Vec3,
		paint: Paint,
		tone?: number,
	) {
		const [a, b, c, d] = corners
		const normal = normalOf([a, b, c])
		const faceCentre = centroid(corners)
		const ordered: readonly [Vec3, Vec3, Vec3, Vec3] =
			dot3(normal, sub3(faceCentre, inside)) < 0 ? [d, c, b, a] : corners
		this.quad(ordered, paint, { tone })
	}

	/** A fan from `apex` over `ring`, facing away from `awayFrom`. */
	fan(
		apex: Vec3,
		ringPoints: readonly Vec3[],
		awayFrom: Vec3,
		paint: Paint,
		tone?: number,
	) {
		const n = ringPoints.length
		for (let i = 0; i < n; i++) {
			const j = (i + 1) % n
			const tri: Tri = [apex, ringPoints[i], ringPoints[j]]
			const flipped = dot3(normalOf(tri), sub3(apex, awayFrom)) < 0
			this.tri(
				flipped ? [apex, ringPoints[j], ringPoints[i]] : tri,
				paint,
				{ tone },
			)
		}
	}

	/**
	 * Connects consecutive rings (same point count) with quads, normals facing
	 * away from the rings' centre; the ends can be closed with fans.
	 */
	loft(
		rings: readonly (readonly Vec3[])[],
		paint: Paint,
		{
			closeStart = false,
			closeEnd = true,
			tone,
		}: { closeStart?: boolean; closeEnd?: boolean; tone?: number } = {},
	) {
		for (let r = 0; r < rings.length - 1; r++) {
			const a = rings[r]
			const b = rings[r + 1]
			const inside = centroid([...a, ...b])
			for (let i = 0; i < a.length; i++) {
				const j = (i + 1) % a.length
				this.outwardQuad([a[i], a[j], b[j], b[i]], inside, paint, tone)
			}
		}
		const first = rings[0]
		const last = rings[rings.length - 1]
		if (closeStart)
			this.fan(centroid(first), first, centroid(last), paint, tone)
		if (closeEnd)
			this.fan(centroid(last), last, centroid(first), paint, tone)
	}

	/** A cylinder or cone between two points, in any orientation. */
	tube(
		from: Vec3,
		to: Vec3,
		radiusFrom: number,
		radiusTo: number,
		segments: number,
		paint: Paint,
		{
			capFrom = false,
			capTo = false,
			tone,
		}: { capFrom?: boolean; capTo?: boolean; tone?: number } = {},
	) {
		const [u, v] = frameOf(sub3(to, from))
		this.loft(
			[
				ring(from, u, v, radiusFrom, radiusFrom, segments),
				ring(to, u, v, radiusTo, radiusTo, segments),
			],
			paint,
			{ closeStart: capFrom, closeEnd: capTo, tone },
		)
	}

	/** A low-poly sphere from latitude rings. */
	sphere(
		center: Vec3,
		radius: number,
		paint: Paint,
		segments = 8,
		bands = 4,
	) {
		const rings: Vec3[][] = []
		for (let k = 1; k < bands; k++) {
			const phi = (k / bands) * Math.PI
			rings.push(
				flatRing(
					[center[0], center[1] + Math.cos(phi) * radius, center[2]],
					Math.sin(phi) * radius,
					Math.sin(phi) * radius,
					segments,
				),
			)
		}
		const top: Vec3 = [center[0], center[1] + radius, center[2]]
		const bottom: Vec3 = [center[0], center[1] - radius, center[2]]
		this.fan(top, rings[0], center, paint)
		this.loft(rings, paint, { closeStart: false, closeEnd: false })
		this.fan(bottom, rings[rings.length - 1], center, paint)
	}

	/** A radial pool of light: full alpha at the centre fading to none at the rim (alpha kits). */
	glowDisc(
		center: Vec3,
		radius: number,
		segments: number,
		paint: Paint,
		alpha: number,
		alphaDawn: number,
		scaleZ = 1,
	) {
		const [cx, cy, cz] = center
		const rim = (i: number): Vec3 => {
			const a = (i / segments) * Math.PI * 2
			return [
				cx + Math.cos(a) * radius,
				cy,
				cz - Math.sin(a) * radius * scaleZ,
			]
		}
		const night = toLinear(paint.night)
		const dawn = toLinear(paint.dawn)
		for (let i = 0; i < segments; i++) {
			for (const [p, a, ad] of [
				[center, alpha, alphaDawn],
				[rim(i), 0, 0],
				[rim(i + 1), 0, 0],
			] as const) {
				this.positions.push(p[0], p[1], p[2])
				this.colors.push(...night, a)
				this.colorsDawn.push(...dawn, ad)
			}
		}
	}

	build(): BufferGeometry {
		const geometry = new BufferGeometry()
		geometry.setAttribute(
			'position',
			new Float32BufferAttribute(this.positions, 3),
		)
		geometry.setAttribute(
			'color',
			new Float32BufferAttribute(this.colors, this.channels),
		)
		geometry.setAttribute(
			'colorDawn',
			new Float32BufferAttribute(this.colorsDawn, this.channels),
		)
		geometry.computeBoundingSphere()
		return geometry
	}
}
