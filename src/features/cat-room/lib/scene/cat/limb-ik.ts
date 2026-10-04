import type { Quaternion } from 'three'
import type { Vec3 } from '@/shared/lib/math/vec3'
import { solveTwoBone } from '../../ik'
import type { CatRig } from './rig'

/**
 * Points an arm at a target in character space: the shoulder joint is read
 * from the current pose, the two bone lengths from the rest pose, and the
 * solved directions are applied as aims to the upper arm and the forearm.
 */
export function applyArmIk(
	rig: CatRig,
	local: Quaternion[],
	side: 'l' | 'r',
	target: Vec3,
	pole: Vec3,
	rootScale: number,
) {
	const arm = rig.indexOf(`arm_${side}`)
	const elbow = rig.indexOf(`elbow_${side}`)
	const wrist = rig.indexOf(`wrist_${side}`)
	const shoulder = rig.characterPosition(arm, local, rootScale)
	const upperLength = rig
		.characterPosition(elbow, local, rootScale)
		.distanceTo(shoulder)
	const lowerLength = rig
		.characterPosition(wrist, local, rootScale)
		.distanceTo(rig.characterPosition(elbow, local, rootScale))
	const solution = solveTwoBone(
		[shoulder.x, shoulder.y, shoulder.z],
		target,
		upperLength,
		lowerLength,
		pole,
	)
	rig.aim(local, arm, solution.upper)
	rig.aim(local, elbow, solution.lower)
	return solution
}
