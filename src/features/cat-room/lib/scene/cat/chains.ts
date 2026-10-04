import { type Bone, type Object3D, Quaternion, Vector3 } from 'three'
import { DEG } from '@/shared/lib/math/ease'
import { CHAINS, type ChainParams } from '../../../config/tuning'
import type { CatRig } from './rig'

type Particle = { position: Vector3; previous: Vector3 }

export type Chain = {
	name: string
	/** Bone indices from root to the last bone; `tip` is the bone it points at. */
	bones: number[]
	tip: number
	params: ChainParams
	particles: Particle[]
	/** World height the particles may not sink below. */
	floor?: number
}

/**
 * Secondary motion for the tail, the ears and the hair tufts: each bone's
 * tip is a verlet particle that trails the posed tip, pulled back by a
 * spring and a little gravity, then the bone is turned to point at it.
 * Fixed sub-steps keep it stable whatever the frame rate.
 */
export class SpringChains {
	readonly chains: Chain[] = []
	private accumulator = 0
	private readonly up = new Vector3(0, 1, 0)

	constructor(private readonly rig: CatRig) {}

	/** `floor`: world height the chain's particles may not sink below (a tail on the desk). */
	add(
		name: string,
		keys: string[],
		tipKey: string,
		params: ChainParams,
		floor?: number,
	) {
		this.chains.push({
			name,
			bones: keys.map((key) => this.rig.indexOf(key)),
			tip: this.rig.indexOf(tipKey),
			params,
			particles: [],
			floor,
		})
	}

	/** Every hair bone attached to the head starts a chain down to its leaf. */
	addHairChains(params: ChainParams) {
		const head = this.rig.indexOf('head')
		this.rig.keys.forEach((key, i) => {
			if (!key.startsWith('hair') || this.rig.parent[i] !== head) return
			const bones: number[] = []
			let current = i
			for (;;) {
				bones.push(current)
				const child = this.rig.bones.findIndex(
					(bone) =>
						this.rig.parent[this.rig.bones.indexOf(bone)] ===
						current,
				)
				if (child < 0) break
				if (this.rig.keys[child].endsWith('_end')) {
					this.add(
						key,
						bones.map((b) => this.rig.keys[b]),
						this.rig.keys[child],
						params,
					)
					return
				}
				current = child
			}
		})
	}

	reset() {
		for (const chain of this.chains) chain.particles = []
		this.accumulator = 0
	}

	/** Call after the bones hold their posed rotations and `root.updateMatrixWorld(true)` ran. */
	update(dt: number) {
		this.accumulator = Math.min(
			this.accumulator + Math.max(dt, 0),
			CHAINS.subStep * CHAINS.maxSubSteps,
		)
		const steps = Math.floor(this.accumulator / CHAINS.subStep)
		if (steps === 0) return
		this.accumulator -= steps * CHAINS.subStep
		for (const chain of this.chains) this.updateChain(chain, steps)
	}

	private updateChain(chain: Chain, steps: number) {
		const { params } = chain
		const h = CHAINS.subStep
		for (let k = 0; k < chain.bones.length; k++) {
			const bone = this.rig.bones[chain.bones[k]]
			const tipBone =
				this.rig.bones[
					k + 1 < chain.bones.length ? chain.bones[k + 1] : chain.tip
				]
			const head = bone.getWorldPosition(new Vector3())
			const posedTip = tipBone.getWorldPosition(new Vector3())
			const length = posedTip.distanceTo(head)
			if (length < 1e-6) continue
			let particle = chain.particles[k]
			if (!particle) {
				particle = {
					position: posedTip.clone(),
					previous: posedTip.clone(),
				}
				chain.particles[k] = particle
			}
			const posedDirection = posedTip.clone().sub(head).normalize()
			for (let s = 0; s < steps; s++) {
				const velocity = particle.position
					.clone()
					.sub(particle.previous)
					.multiplyScalar(params.inertia)
				const spring = posedTip
					.clone()
					.sub(particle.position)
					.multiplyScalar(params.stiffness * h * h)
				particle.previous.copy(particle.position)
				particle.position
					.add(velocity)
					.add(spring)
					.addScaledVector(this.up, -params.gravity * h * h)
				// Keep the bone length and limit how far the spring may bend it.
				const toParticle = particle.position.clone().sub(head)
				let direction =
					toParticle.lengthSq() > 1e-12
						? toParticle.normalize()
						: posedDirection.clone()
				const angle = Math.acos(
					Math.min(1, Math.max(-1, direction.dot(posedDirection))),
				)
				const maxAngle = params.maxBendDeg * DEG
				if (angle > maxAngle) {
					const axis = posedDirection.clone().cross(direction)
					if (axis.lengthSq() > 1e-12)
						direction = posedDirection
							.clone()
							.applyQuaternion(
								new Quaternion().setFromAxisAngle(
									axis.normalize(),
									maxAngle,
								),
							)
				}
				particle.position.copy(head).addScaledVector(direction, length)
				if (
					chain.floor !== undefined &&
					particle.position.y < chain.floor
				) {
					// Slide along the floor: keep the length, lift the tip.
					particle.position.y = chain.floor
					const flat = particle.position.clone().sub(head)
					if (flat.lengthSq() > 1e-12)
						particle.position
							.copy(head)
							.addScaledVector(flat.normalize(), length)
					particle.position.y = Math.max(
						particle.position.y,
						chain.floor,
					)
				}
			}
			const actualDirection = particle.position
				.clone()
				.sub(head)
				.normalize()
			const rotation = new Quaternion().setFromUnitVectors(
				posedDirection,
				actualDirection,
			)
			applyWorldRotation(bone, rotation)
			bone.updateMatrixWorld(true)
		}
	}
}

/** Pre-multiplies a world-space rotation onto an object's local quaternion. */
function applyWorldRotation(object: Object3D, rotation: Quaternion) {
	const parentQuaternion = object.parent
		? object.parent.getWorldQuaternion(new Quaternion())
		: new Quaternion()
	const inverse = parentQuaternion.clone().invert()
	object.quaternion
		.premultiply(parentQuaternion)
		.premultiply(rotation)
		.premultiply(inverse)
}

export type { Bone }
