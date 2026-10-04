import { Quaternion } from 'three'
import { DEG } from '@/shared/lib/math/ease'
import type { Vec3 } from '@/shared/lib/math/vec3'
import { solveTwoBone } from '../../ik'
import type { CatRig } from './rig'

/**
 * Points an arm at a target in character space: the shoulder joint is read
 * from the current pose, the two bone lengths from the rest pose, and the
 * solved directions are applied as aims to the upper arm and the forearm.
 * The shortest-arc aim leaves the forearm's roll arbitrary, so `twistDeg`
 * rolls it about its own axis afterwards: that is what turns the palm.
 */
export function applyArmIk(
	rig: CatRig,
	local: Quaternion[],
	side: 'l' | 'r',
	target: Vec3,
	pole: Vec3,
	rootScale: number,
	twistDeg = 0,
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
	if (twistDeg)
		local[elbow].multiply(
			new Quaternion().setFromAxisAngle(rig.axis[elbow], twistDeg * DEG),
		)
	return solution
}
