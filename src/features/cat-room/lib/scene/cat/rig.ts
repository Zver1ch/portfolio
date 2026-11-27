import {
	type Bone,
	Euler,
	Matrix4,
	type Object3D,
	Quaternion,
	Vector3,
} from 'three'
import { DEG } from '@/shared/lib/math/ease'
import type { Vec3 } from '@/shared/lib/math/vec3'
import { CAT_RIG_BONES } from '../../../config/cat-rig.gen'
import type { Pose } from '../../../config/poses'
import type { CatModel } from './load-cat'

export type CompiledPose = {
	/** Local quaternion per bone, skin order. */
	local: Quaternion[]
	/** Offset of the pelvis bone in character metres. */
	hips: Vector3
	rootPosition: Vector3
	rootQuaternion: Quaternion
}

const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)
export const AXES = { x: X, y: Y, z: Z } as const

/**
 * Bone bookkeeping for posing in character space: rest transforms, bone axes
 * and the orientation of the skeleton's parent chain, so that `aim`
 * directions written in +Y up / +Z forward resolve to local rotations.
 */
export class CatRig {
	readonly bones: Bone[]
	readonly keys: string[]
	readonly parent: Int16Array
	/** Bone indices with every parent before its children. */
	readonly order: number[]
	readonly restLocal: Quaternion[]
	readonly restPosition: Vector3[]
	/** Local direction a bone points: towards its first child, else +Y. */
	readonly axis: Vector3[]
	/** Character-space orientation of the skeleton root's parent. */
	readonly baseQuaternion: Quaternion
	/** Character-space matrix of the skeleton root's parent (character metres). */
	readonly baseMatrix: Matrix4
	/** Uniform scale from a bone's local units to character metres. */
	readonly boneUnit: number
	private readonly index = new Map<string, number>()

	constructor(model: CatModel) {
		this.bones = model.bones
		this.keys = CAT_RIG_BONES.map((bone) => bone.key)
		this.keys.forEach((key, i) => {
			this.index.set(key, i)
		})
		this.parent = new Int16Array(this.bones.length)
		this.bones.forEach((bone, i) => {
			const parent = bone.parent as Bone | null
			this.parent[i] = parent?.isBone ? this.bones.indexOf(parent) : -1
		})
		this.order = [...this.bones.keys()].sort(
			(a, b) => depth(this.bones[a]) - depth(this.bones[b]),
		)
		this.restLocal = this.bones.map((bone) => bone.quaternion.clone())
		this.restPosition = this.bones.map((bone) => bone.position.clone())
		this.axis = this.bones.map((bone) => {
			// The child that continues the bone: the one closest to local +Y
			// (Blender bones point along +Y; the head also parents ears, eyes
			// and hair, the pelvis the legs and the tail).
			let best: Vector3 | null = null
			let bestDot = -Infinity
			for (const child of bone.children) {
				if (
					!(child as Bone).isBone ||
					child.position.lengthSq() < 1e-12
				)
					continue
				const direction = child.position.clone().normalize()
				if (direction.y > bestDot) {
					bestDot = direction.y
					best = direction
				}
			}
			return best ?? new Vector3(0, 1, 0)
		})
		// Orientation and matrix of everything above the first bone, relative to the character root.
		const base = new Matrix4()
		const chain: Object3D[] = []
		for (
			let node = this.bones[0].parent;
			node && node !== model.root;
			node = node.parent
		)
			chain.unshift(node)
		for (const node of chain) base.multiply(node.matrix)
		this.baseMatrix = base
		// decompose() strips the chain's scale; setFromRotationMatrix would not.
		const baseQuaternion = new Quaternion()
		const baseScale = new Vector3()
		base.decompose(new Vector3(), baseQuaternion, baseScale)
		this.baseQuaternion = baseQuaternion
		this.boneUnit = baseScale.x * model.root.scale.x
	}

	indexOf(key: string): number {
		const i = this.index.get(key)
		if (i === undefined) throw new Error(`Unknown bone key "${key}"`)
		return i
	}

	/** Character-space orientation of bone `i` given local quaternions. */
	characterQuaternion(
		i: number,
		local: Quaternion[],
		target = new Quaternion(),
	): Quaternion {
		const parent = this.parent[i]
		if (parent < 0)
			return target.copy(this.baseQuaternion).multiply(local[i])
		return this.characterQuaternion(parent, local, target).multiply(
			local[i],
		)
	}

	/** Character-space position of bone `i` in character metres. */
	characterPosition(
		i: number,
		local: Quaternion[],
		rootScale: number,
		target = new Vector3(),
	): Vector3 {
		return target
			.setFromMatrixPosition(this.characterMatrix(i, local))
			.multiplyScalar(rootScale)
	}

	private characterMatrix(i: number, local: Quaternion[]): Matrix4 {
		const own = new Matrix4().compose(
			this.restPosition[i],
			local[i],
			new Vector3(1, 1, 1),
		)
		const parent = this.parent[i]
		if (parent < 0) return this.baseMatrix.clone().multiply(own)
		return this.characterMatrix(parent, local).multiply(own)
	}

	/** Rotates bone `i` by `rotation` expressed in character space, on top of its local quaternion. */
	rotateInCharacterSpace(
		local: Quaternion[],
		i: number,
		rotation: Quaternion,
	) {
		const parent = this.parent[i]
		const qp =
			parent < 0
				? this.baseQuaternion.clone()
				: this.characterQuaternion(parent, local)
		const inverse = qp.clone().invert()
		local[i].premultiply(qp).premultiply(rotation).premultiply(inverse)
	}

	/** Turns bone `i` so its axis points along `direction` (character space) by the shortest arc. */
	aim(local: Quaternion[], i: number, direction: Vec3) {
		const target = new Vector3(...direction)
		if (target.lengthSq() < 1e-12) return
		target.normalize()
		const current = this.axis[i]
			.clone()
			.applyQuaternion(this.characterQuaternion(i, local))
		const rotation = new Quaternion().setFromUnitVectors(current, target)
		this.rotateInCharacterSpace(local, i, rotation)
	}

	/** Resolves a pose into local quaternions, parent-first. */
	compile(pose: Pose): CompiledPose {
		const local = this.restLocal.map((q) => q.clone())
		const rotation = pose.root?.rotation ?? [0, 0, 0]
		const rootQuaternion = new Quaternion().setFromEuler(
			new Euler(
				rotation[0] * DEG,
				rotation[1] * DEG,
				rotation[2] * DEG,
				'XYZ',
			),
		)
		const rootInverse = rootQuaternion.clone().invert()
		for (const i of this.order) {
			const entry = pose.bones[this.keys[i] as keyof typeof pose.bones]
			if (!entry) continue
			if (entry.rot)
				local[i].multiply(
					new Quaternion().setFromEuler(
						new Euler(
							entry.rot[0] * DEG,
							entry.rot[1] * DEG,
							entry.rot[2] * DEG,
							'XYZ',
						),
					),
				)
			if (entry.aim) this.aim(local, i, entry.aim)
			if (entry.aimWorld) {
				const direction = new Vector3(
					...entry.aimWorld,
				).applyQuaternion(rootInverse)
				this.aim(local, i, [direction.x, direction.y, direction.z])
			}
			if (entry.twist)
				local[i].multiply(
					new Quaternion().setFromAxisAngle(
						this.axis[i],
						entry.twist * DEG,
					),
				)
			if (entry.post)
				local[i].multiply(
					new Quaternion().setFromEuler(
						new Euler(
							entry.post[0] * DEG,
							entry.post[1] * DEG,
							entry.post[2] * DEG,
							'XYZ',
						),
					),
				)
		}
		return {
			local,
			hips: new Vector3(...(pose.hips ?? [0, 0, 0])),
			rootPosition: new Vector3(...(pose.root?.position ?? [0, 0, 0])),
			rootQuaternion,
		}
	}

	/** Writes local quaternions and the pelvis offset to the bones. */
	apply(local: Quaternion[], hips: Vector3) {
		this.bones.forEach((bone, i) => {
			bone.quaternion.copy(local[i])
		})
		const pelvis = this.bones[1]
		const parentQuaternion = this.characterQuaternion(0, local)
		// Character metres → the pelvis parent's local units.
		const offset = hips
			.clone()
			.applyQuaternion(parentQuaternion.invert())
			.divideScalar(this.boneUnit)
		pelvis.position.copy(this.restPosition[1]).add(offset)
	}
}

function depth(bone: Object3D): number {
	let n = 0
	for (let node = bone.parent; node; node = node.parent) n++
	return n
}
