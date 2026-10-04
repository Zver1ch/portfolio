import { Quaternion, Vector3 } from 'three'
import { clamp01, easeInOutSine } from '@/shared/lib/math/ease'
import type { Pose, PoseName } from '../../../config/poses'
import type { CatRig, CompiledPose } from './rig'

type Overlay = {
	name: PoseName
	start: number
	fadeIn: number
	hold: number
	fadeOut: number
	/** Bones the overlay drives; others keep the base pose. */
	mask?: Set<number>
}

export type OverlayOptions = {
	fadeIn?: number
	hold?: number
	fadeOut?: number
	bones?: string[]
}

/**
 * Blends compiled poses: a base pose with a timed cross-fade, plus one-shot
 * overlays (the stretch on a pet, a tail raise) faded in and out on top.
 * Everything is a function of the animation clock, so a frame rendered at a
 * given time is reproducible.
 */
export class PoseMixer {
	private readonly compiled = new Map<PoseName, CompiledPose>()
	private base: PoseName
	private previous: PoseName | null = null
	private switchedAt = 0
	private switchDuration = 0.6
	private overlays: Overlay[] = []

	constructor(
		private readonly rig: CatRig,
		private readonly poses: Record<PoseName, Pose>,
		initial: PoseName,
	) {
		this.base = initial
	}

	get basePose(): PoseName {
		return this.base
	}

	setBase(name: PoseName, time: number, duration = 0.6) {
		if (name === this.base) return
		this.previous = this.base
		this.base = name
		this.switchedAt = time
		this.switchDuration = duration
	}

	/** Plays a pose once over the base, for `fadeIn + hold + fadeOut` seconds. */
	play(
		name: PoseName,
		time: number,
		{
			fadeIn = 0.22,
			hold = 0.9,
			fadeOut = 0.55,
			bones,
		}: OverlayOptions = {},
	) {
		this.overlays.push({
			name,
			start: time,
			fadeIn,
			hold,
			fadeOut,
			mask: bones
				? new Set(bones.map((key) => this.rig.indexOf(key)))
				: undefined,
		})
	}

	private get(name: PoseName): CompiledPose {
		let pose = this.compiled.get(name)
		if (!pose) {
			pose = this.rig.compile(this.poses[name])
			this.compiled.set(name, pose)
		}
		return pose
	}

	evaluate(time: number): CompiledPose {
		const current = this.get(this.base)
		let result = clonePose(current)
		if (this.previous) {
			const t = clamp01((time - this.switchedAt) / this.switchDuration)
			if (t >= 1) this.previous = null
			else
				blendInto(
					result,
					this.get(this.previous),
					result,
					1 - easeInOutSine(t),
				)
		}
		this.overlays = this.overlays.filter(
			(overlay) =>
				time <
				overlay.start + overlay.fadeIn + overlay.hold + overlay.fadeOut,
		)
		for (const overlay of this.overlays) {
			const local = time - overlay.start
			const weight =
				local < overlay.fadeIn
					? easeInOutSine(local / overlay.fadeIn)
					: local < overlay.fadeIn + overlay.hold
						? 1
						: 1 -
							easeInOutSine(
								(local - overlay.fadeIn - overlay.hold) /
									overlay.fadeOut,
							)
			result = blendInto(
				result,
				this.get(overlay.name),
				result,
				weight,
				overlay.mask,
			)
		}
		return result
	}
}

function clonePose(pose: CompiledPose): CompiledPose {
	return {
		local: pose.local.map((q) => q.clone()),
		hips: pose.hips.clone(),
		rootPosition: pose.rootPosition.clone(),
		rootQuaternion: pose.rootQuaternion.clone(),
	}
}

/** `target = from blended towards to by weight`; `from` and `target` may be the same object. */
function blendInto(
	from: CompiledPose,
	to: CompiledPose,
	target: CompiledPose,
	weight: number,
	mask?: Set<number>,
): CompiledPose {
	if (weight <= 0) return target
	for (let i = 0; i < from.local.length; i++) {
		if (mask && !mask.has(i)) continue
		target.local[i].copy(from.local[i]).slerp(to.local[i], weight)
	}
	if (!mask) {
		target.hips.copy(from.hips).lerp(to.hips, weight)
		target.rootPosition
			.copy(from.rootPosition)
			.lerp(to.rootPosition, weight)
		target.rootQuaternion
			.copy(from.rootQuaternion)
			.slerp(to.rootQuaternion, weight)
	}
	return target
}

export { Quaternion, Vector3 }
