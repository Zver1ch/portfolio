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
