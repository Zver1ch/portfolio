import { clamp } from '@/shared/lib/math/ease'
import {
	add,
	cross,
	dot,
	length,
	normalize,
	scale,
	sub,
	type Vec3,
} from '@/shared/lib/math/vec3'

export type TwoBoneSolution = {
	/** Unit direction of the upper bone (root → middle joint). */
	upper: Vec3
	/** Unit direction of the lower bone (middle joint → end). */
	lower: Vec3
	/** Where the middle joint lands. */
	joint: Vec3
	/** False when the target was out of reach and the chain points at it fully extended. */
	reached: boolean
}

/**
 * Two-bone inverse kinematics by the law of cosines. The bend happens in the
 * plane spanned by the root→target axis and the pole hint; the middle joint
 * leans towards the hint. Lengths are always preserved: an unreachable target
 * straightens the chain, one closer than the bones allow folds it.
 */
export function solveTwoBone(
	root: Vec3,
	target: Vec3,
	upperLength: number,
	lowerLength: number,
	pole: Vec3,
): TwoBoneSolution {
	const toTarget = sub(target, root)
	const rawDistance = length(toTarget)
	const epsilon = 1e-4
	const distance = clamp(
		rawDistance,
		Math.abs(upperLength - lowerLength) + epsilon,
		upperLength + lowerLength - epsilon,
	)
	const axis =
		rawDistance > 1e-9 ? scale(toTarget, 1 / rawDistance) : normalize(pole)
	// Component of the pole hint perpendicular to the axis.
	let bend = sub(pole, scale(axis, dot(pole, axis)))
	if (length(bend) < 1e-6) {
		// The hint is parallel to the axis: pick any perpendicular direction.
		const helper: Vec3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
		bend = cross(axis, helper)
	}
	bend = normalize(bend)
	const cosRoot = clamp(
		(upperLength * upperLength +
			distance * distance -
			lowerLength * lowerLength) /
			(2 * upperLength * distance),
		-1,
		1,
	)
	const angle = Math.acos(cosRoot)
	const upper = normalize(
		add(scale(axis, Math.cos(angle)), scale(bend, Math.sin(angle))),
	)
	const joint = add(root, scale(upper, upperLength))
	const end = add(root, scale(axis, distance))
	const lower = normalize(sub(end, joint))
	return {
		upper,
		lower,
		joint,
		reached:
			rawDistance <= upperLength + lowerLength &&
			rawDistance >= Math.abs(upperLength - lowerLength),
	}
}
