import { Quaternion, Vector3 } from 'three'
import { clamp, DEG } from '@/shared/lib/math/ease'
import { BREATHING, EAR_TWITCH, LOOK_AT, MEOW } from '../../../config/tuning'
import { AXES, type CatRig } from './rig'

/**
 * Procedural layers applied after the pose mixer, in character space:
 * breathing, look-at with the pupils following, ear twitches, the jaw on a
 * meow. All of them read the animation clock, none a wall clock.
 */

export type LayerState = {
	/** Current head turn, damped towards the target. */
	look: Quaternion
	nextTwitchAt: number
	twitchSide: 'l' | 'r'
	twitchStartedAt: number
	jawOpenedAt: number
	seed: number
}

export function createLayerState(seed = 7): LayerState {
	return {
		look: new Quaternion(),
		nextTwitchAt: 2.5,
		twitchSide: 'l',
		twitchStartedAt: -1,
		jawOpenedAt: -1,
		seed,
	}
}

/** Deterministic 0..1 noise from the seed; mulberry32, one step per call. */
function nextRandom(state: LayerState): number {
	state.seed = (state.seed + 0x6d2b79f5) | 0
	let t = state.seed
	t = Math.imul(t ^ (t >>> 15), t | 1)
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function applyBreathing(rig: CatRig, local: Quaternion[], time: number) {
	const angle =
		Math.sin(time * BREATHING.hz * Math.PI * 2) * BREATHING.pitchDeg * DEG
	rig.rotateInCharacterSpace(
		local,
		rig.indexOf('chest'),
		new Quaternion().setFromAxisAngle(AXES.x, angle),
	)
}

/** Rest-pose face direction of the head bone in its own local frame, cached per rig. */
const faceAxis = new WeakMap<CatRig, Vector3>()

function headFaceAxis(rig: CatRig): Vector3 {
	let axis = faceAxis.get(rig)
	if (!axis) {
		const restCharacter = rig.characterQuaternion(
			rig.indexOf('head'),
			rig.restLocal,
		)
		axis = new Vector3(0, 0, 1).applyQuaternion(restCharacter.invert())
		faceAxis.set(rig, axis)
	}
	return axis
}

/**
 * Turns neck and head towards `target` (character space, metres), split
 * 35/65, limited in yaw and pitch, damped with `lambda`; the pupils lead a
 * little through the eye bones. `dt` is the frame delta for the damping.
 */
export function applyLookAt(
	rig: CatRig,
	local: Quaternion[],
	state: LayerState,
	target: Vector3 | null,
	rootScale: number,
	dt: number,
) {
	const head = rig.indexOf('head')
	const neck = rig.indexOf('neck')
	let desired = new Quaternion()
	if (target) {
		const headPosition = rig.characterPosition(head, local, rootScale)
		const headQuaternion = rig.characterQuaternion(head, local)
		const forward = headFaceAxis(rig)
			.clone()
			.applyQuaternion(headQuaternion)
		const toTarget = target.clone().sub(headPosition)
		if (toTarget.lengthSq() > 1e-6) {
			toTarget.normalize()
			// Split the needed turn into yaw about the head's up axis and pitch
			// about its lateral axis, so each can be limited separately.
			// `right` = forward × up points to the cat's right (-X at rest);
			// a positive rotation about it lifts the face, so a target above
			// the current gaze (positive `pitch`) turns the head up.
			const up = new Vector3(0, 1, 0).applyQuaternion(headQuaternion)
			const yawTarget = toTarget.clone().projectOnPlane(up)
			const yawForward = forward.clone().projectOnPlane(up)
			let yaw = 0
			if (yawTarget.lengthSq() > 1e-6 && yawForward.lengthSq() > 1e-6) {
				yawTarget.normalize()
				yawForward.normalize()
				yaw = Math.atan2(
					yawForward.clone().cross(yawTarget).dot(up),
					yawForward.dot(yawTarget),
				)
			}
			const pitch =
				Math.asin(clamp(toTarget.dot(up), -1, 1)) -
				Math.asin(clamp(forward.dot(up), -1, 1))
			const right = forward.clone().cross(up).normalize()
			desired = new Quaternion()
				.setFromAxisAngle(
					up,
					clamp(yaw, -LOOK_AT.yawDeg * DEG, LOOK_AT.yawDeg * DEG),
				)
				.multiply(
					new Quaternion().setFromAxisAngle(
						right,
						clamp(
							pitch,
							-LOOK_AT.pitchDeg * DEG,
							LOOK_AT.pitchDeg * DEG,
						),
					),
				)
		}
	}
	state.look.slerp(desired, 1 - Math.exp(-LOOK_AT.lambda * Math.max(dt, 0)))
	const identity = new Quaternion()
	rig.rotateInCharacterSpace(
		local,
		neck,
		identity.clone().slerp(state.look, LOOK_AT.neckShare),
	)
	rig.rotateInCharacterSpace(
		local,
		head,
		identity.clone().slerp(state.look, LOOK_AT.headShare),
	)
	const eyeTurn = identity.clone().slerp(state.look, 0.35)
	for (const key of ['lefteye', 'righteye'] as const)
		rig.rotateInCharacterSpace(local, rig.indexOf(key), eyeTurn)
}

export function applyEarTwitch(
	rig: CatRig,
	local: Quaternion[],
	state: LayerState,
	time: number,
) {
	if (time >= state.nextTwitchAt) {
		state.twitchStartedAt = time
		state.twitchSide = nextRandom(state) < 0.5 ? 'l' : 'r'
		state.nextTwitchAt =
			time +
			EAR_TWITCH.minGap +
			nextRandom(state) * (EAR_TWITCH.maxGap - EAR_TWITCH.minGap)
	}
	const since = time - state.twitchStartedAt
	if (since < 0 || since > EAR_TWITCH.duration) return
	const envelope = Math.sin((since / EAR_TWITCH.duration) * Math.PI)
	const sign = state.twitchSide === 'l' ? 1 : -1
	const angle = envelope * EAR_TWITCH.deg * DEG * sign
	const base = rig.indexOf(`ear_${state.twitchSide}`)
	const tip = rig.indexOf(`ear_${state.twitchSide}001`)
	rig.rotateInCharacterSpace(
		local,
		base,
		new Quaternion().setFromAxisAngle(AXES.z, angle),
	)
	rig.rotateInCharacterSpace(
		local,
		tip,
		new Quaternion().setFromAxisAngle(AXES.z, -angle * 0.5),
	)
}

export function openJaw(state: LayerState, time: number) {
	state.jawOpenedAt = time
}

export function applyJaw(
	rig: CatRig,
	local: Quaternion[],
	state: LayerState,
	time: number,
) {
	const since = time - state.jawOpenedAt
	const duration = MEOW.durationMs / 1000
	if (since < 0 || since > duration) return
	const envelope = Math.sin((since / duration) * Math.PI)
	rig.rotateInCharacterSpace(
		local,
		rig.indexOf('jaw'),
		new Quaternion().setFromAxisAngle(AXES.x, envelope * MEOW.jawDeg * DEG),
	)
}
