import {
	BufferGeometry,
	Float32BufferAttribute,
	Group,
	type Material,
	Mesh,
	type SkinnedMesh,
	Vector3,
} from 'three'
import { fitQuadratic2 } from '@/shared/lib/math/fit'
import { bounds2, type Vec2 } from '@/shared/lib/math/vec3'
import { EYELIDS } from '../../../config/tuning'
import { type PatchOptions, patchMaterial } from '../materials'
import type { CatModel } from './load-cat'
import type { CatRig } from './rig'
import { skinnedWorldPosition } from './skinned'

const EYES = ['lefteye', 'righteye'] as const

export type Eyelids = {
	/** 0 awake … 1 asleep; collapses the outlines and grows the strokes. */
	setClosed(closed: number): void
	dispose(): void
}

/**
 * Closed eyes for the sleep pose.
 *
 * The model has no eyelids: the pupils are the only geometry skinned to the
 * eye bones, and each eye's black outline (a ring and a crease above it)
 * belongs to the head. The sleep pose rolls the eye bones 180°, which turns
 * the pupils into the head; this module does the rest, driven by that roll:
 *
 * - the outline and pupil vertices get a `sleepShift` attribute that the
 *   patched black material adds times `uEyesClosed`, collapsing them to a
 *   point inside the head;
 * - a dark `︶` stroke per eye, a child of the head bone, grows from the
 *   same point to its place just in front of where the eye was.
 *
 * Everything is measured from the loaded model in its rest pose.
 */
export function createEyelids(
	model: CatModel,
	rig: CatRig,
	patch: Omit<PatchOptions, 'sleepShift'>,
): Eyelids {
	const eyes = EYES.map((key) => rig.indexOf(key))
	const head = rig.bones[rig.indexOf('head')]
	let outlineMesh: SkinnedMesh | null = null
	let pupils: number[][] = []
	for (const mesh of model.meshes) {
		const found = eyes.map((joint) => influencedVertices(mesh, joint))
		if (found.every((vertices) => vertices.length >= 3)) {
			outlineMesh = mesh
			pupils = found
			break
		}
	}
	if (!outlineMesh) {
		if (process.env.NODE_ENV !== 'production')
			throw new Error('cat.glb: no mesh carries both pupils')
		return { setClosed() {}, dispose() {} }
	}
	const mesh = outlineMesh
	const count = mesh.geometry.getAttribute('position').count
	const world = Array.from({ length: count }, (_, v) =>
		skinnedWorldPosition(mesh, v, new Vector3()),
	)
	const isPupil = new Uint8Array(count)
	for (const vertices of pupils) for (const v of vertices) isPupil[v] = 1

	// Per eye: pupil centre, size, the lid normal and the hide point behind it.
	const up = new Vector3(0, 1, 0)
	const eyeFrames = eyes.map((joint, k) => {
		const points = pupils[k].map((v) => world[v])
		const centre = points
			.reduce((sum, point) => sum.add(point), new Vector3())
			.divideScalar(points.length)
		const bone = rig.bones[joint]
		const normal = new Vector3(0, 1, 0).transformDirection(bone.matrixWorld)
		const origin = new Vector3().setFromMatrixPosition(bone.matrixWorld)
		if (centre.clone().sub(origin).dot(normal) < 0) normal.negate()
		const size = Math.max(
			...points.map((point) => point.distanceTo(centre)),
		)
		return {
			centre,
			normal,
			size: size * 2,
			hide: centre
				.clone()
				.addScaledVector(normal, -EYELIDS.hide * size * 2),
			pupil: points,
		}
	})

	// Connected pieces of the black mesh that are not pupils, by vertex.
	const piece = components(mesh, isPupil)
	const pieceVertices = new Map<number, number[]>()
	for (let v = 0; v < count; v++) {
		if (isPupil[v]) continue
		const list = pieceVertices.get(piece[v]) ?? []
		list.push(v)
		pieceVertices.set(piece[v], list)
	}
	// An eye's outline: the pieces within `reach` pupil sizes of its pupil.
	const outlines = eyeFrames.map(() => [] as number[][])
	for (const vertices of pieceVertices.values()) {
		let nearest = -1
		let nearestDistance = Infinity
		eyeFrames.forEach((eye, k) => {
			const distance = Math.min(
				...vertices.map((v) => world[v].distanceTo(eye.centre)),
			)
			if (distance < nearestDistance) {
				nearestDistance = distance
				nearest = k
			}
		})
		if (
			nearest >= 0 &&
			nearestDistance < EYELIDS.reach * eyeFrames[nearest].size
		)
			outlines[nearest].push(vertices)
	}

	// The shift attribute, in the mesh's bind space, and the patched material.
	const shift = new Float32Array(count * 3)
	const headIndex = rig.indexOf('head')
	const toBind = head.matrixWorld
		.clone()
		.multiply(mesh.skeleton.boneInverses[headIndex])
		.multiply(mesh.bindMatrix)
		.invert()
	const position = mesh.geometry.getAttribute('position')
	eyeFrames.forEach((eye, k) => {
		// At rest every joint maps bind space to the world the same way, so the
		// pupils (on the eye bones) can collapse through the head's mapping too:
		// the roll alone leaves slivers of the domed pupil poking through the face.
		const hide = eye.hide.clone().applyMatrix4(toBind)
		for (const vertices of [...outlines[k], pupils[k]])
			for (const v of vertices) {
				shift[v * 3] = hide.x - position.getX(v)
				shift[v * 3 + 1] = hide.y - position.getY(v)
				shift[v * 3 + 2] = hide.z - position.getZ(v)
			}
	})
	mesh.geometry.setAttribute(
		'sleepShift',
		new Float32BufferAttribute(shift, 3),
	)
	const outlineMaterial = patchMaterial((mesh.material as Material).clone(), {
		...patch,
		sleepShift: true,
	})
	mesh.material = outlineMaterial

	// The strokes: children of the head bone, scaled about their hide point.
	const pivots: Group[] = []
	const geometries: BufferGeometry[] = []
	const headInverse = head.matrixWorld.clone().invert()
	eyeFrames.forEach((eye, k) => {
		const ring = outlines[k].flat()
		const points = ring.length >= 3 ? ring.map((v) => world[v]) : eye.pupil
		const geometry = strokeGeometry(eye, points, up, eye.hide)
		const pivot = new Group()
		pivot.name = `eyelid_${EYES[k]}`
		pivot.position.copy(eye.hide.clone().applyMatrix4(headInverse))
		const stroke = new Mesh(geometry, outlineMaterial)
		// Pivot space: the head's frame, shifted to the hide point.
		stroke.geometry.applyMatrix4(headInverse)
		stroke.position.copy(pivot.position).negate()
		pivot.add(stroke)
		head.add(pivot)
		pivots.push(pivot)
		geometries.push(geometry)
	})

	return {
		setClosed(closed) {
			const scale = Math.max(closed, 1e-3)
			for (const pivot of pivots) {
				pivot.visible = closed > 0.01
				pivot.scale.setScalar(scale)
			}
		},
		dispose() {
			for (const pivot of pivots) pivot.removeFromParent()
			for (const geometry of geometries) geometry.dispose()
			outlineMaterial.dispose()
		},
	}
}

/** Vertices of `mesh` with any weight on `joint`. */
function influencedVertices(mesh: SkinnedMesh, joint: number): number[] {
	const skinIndex = mesh.geometry.getAttribute('skinIndex')
	const skinWeight = mesh.geometry.getAttribute('skinWeight')
	if (!skinIndex || !skinWeight) return []
	const vertices: number[] = []
	for (let v = 0; v < skinIndex.count; v++) {
		const joints = [
			skinIndex.getX(v),
			skinIndex.getY(v),
			skinIndex.getZ(v),
			skinIndex.getW(v),
		]
		const weights = [
			skinWeight.getX(v),
			skinWeight.getY(v),
			skinWeight.getZ(v),
			skinWeight.getW(v),
		]
		if (joints.some((j, k) => j === joint && weights[k] > 0))
			vertices.push(v)
	}
	return vertices
}

/** Connected-component label per vertex over triangles that avoid `skip` vertices. */
function components(mesh: SkinnedMesh, skip: Uint8Array): Int32Array {
	const count = skip.length
	const parent = Int32Array.from({ length: count }, (_, i) => i)
	const find = (a: number): number => {
		let root = a
		while (parent[root] !== root) root = parent[root]
		while (parent[a] !== root) {
			const next = parent[a]
			parent[a] = root
			a = next
		}
		return root
	}
	const union = (a: number, b: number) => {
		parent[find(a)] = find(b)
	}
	const index = mesh.geometry.index
	const corner = (i: number) => (index ? index.getX(i) : i)
	const corners = index ? index.count : count
	for (let i = 0; i + 2 < corners; i += 3) {
		const a = corner(i)
		const b = corner(i + 1)
		const c = corner(i + 2)
		if (skip[a] || skip[b] || skip[c]) continue
		union(a, b)
		union(b, c)
	}
	return Int32Array.from({ length: count }, (_, v) => find(v))
}

type EyeFrame = { centre: Vector3; normal: Vector3; size: number }

/**
 * The `︶` stroke over an eye, in world space: ends above the outline's
 * centre, the middle sagging, tapered ends. It follows the eye surface
 * sampled from `surface` (outline and pupil vertices), lifted off it away
 * from `hide`, a point inside the head, so the lift stays outward where the
 * eye wraps around the side of the head.
 */
function strokeGeometry(
	eye: EyeFrame,
	surface: Vector3[],
	worldUp: Vector3,
	hide: Vector3,
): BufferGeometry {
	const up = worldUp.clone().projectOnPlane(eye.normal).normalize()
	const right = new Vector3().crossVectors(up, eye.normal).normalize()
	const flat: Vec2[] = []
	const depth: number[] = []
	for (const point of surface) {
		const d = point.clone().sub(eye.centre)
		flat.push([d.dot(right), d.dot(up)])
		depth.push(d.dot(eye.normal))
	}
	const [minX, minY, maxX, maxY] = bounds2(flat)
	const mid: Vec2 = [(minX + maxX) / 2, (minY + maxY) / 2]
	const width = maxX - minX
	const height = maxY - minY
	// A smooth quadratic fit of the eye surface: the samples are sparse and
	// faceted, and a ribbon that followed them directly would kink.
	const depthAt = fitQuadratic2(
		flat.map(([x, y], i) => [x, y, depth[i]] as const),
	)
	const toWorld = (point: Vec2): number[] => {
		const onSurface = eye.centre
			.clone()
			.addScaledVector(right, point[0])
			.addScaledVector(up, point[1])
			.addScaledVector(eye.normal, depthAt(point[0], point[1]))
		const outward = onSurface.clone().sub(hide).normalize()
		const world = onSurface.addScaledVector(outward, EYELIDS.lift)
		return [world.x, world.y, world.z]
	}
	const { line } = EYELIDS
	const edge = (t: number): [Vec2, Vec2] => {
		const x = mid[0] + t * (width / 2) * line.width
		const y = mid[1] + height * (line.top - line.sag * (1 - t * t))
		const half =
			(height * line.thickness * Math.sqrt(0.2 + 0.8 * (1 - t * t))) / 2
		return [
			[x, y - half],
			[x, y + half],
		]
	}
	const positions: number[] = []
	let previous = edge(-1)
	for (let i = 1; i <= line.segments; i++) {
		const next = edge(-1 + (2 * i) / line.segments)
		positions.push(
			...toWorld(previous[0]),
			...toWorld(next[0]),
			...toWorld(next[1]),
			...toWorld(previous[0]),
			...toWorld(next[1]),
			...toWorld(previous[1]),
		)
		previous = next
	}
	const geometry = new BufferGeometry()
	geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
	return geometry
}
