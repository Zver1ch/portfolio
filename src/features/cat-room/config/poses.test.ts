import { describe, expect, it } from 'vitest'
import { CAT_RIG_BONES } from './cat-rig.gen'
import { POSES } from './poses'

const keys = new Set<string>(CAT_RIG_BONES.map((bone) => bone.key))

describe('poses', () => {
	it('reference only bones of the shipped rig that may be animated', () => {
		for (const [name, pose] of Object.entries(POSES)) {
			for (const key of Object.keys(pose.bones)) {
				expect(keys.has(key), `${name}: ${key} is not a bone`).toBe(
					true,
				)
				expect(key, `${name}: ${key} is never animated`).not.toMatch(
					/^popka|^shoulder_|_end$|^_rootjoint$/,
				)
			}
		}
	})

	it('contain only finite numbers', () => {
		for (const pose of Object.values(POSES)) {
			const numbers = [
				...(pose.root
					? [...pose.root.position, ...pose.root.rotation]
					: []),
				...(pose.hips ?? []),
				...Object.values(pose.bones).flatMap((bone) => [
					...(bone.rot ?? []),
					...(bone.aim ?? []),
					...(bone.aimWorld ?? []),
					...(bone.post ?? []),
					bone.twist ?? 0,
				]),
			]
			expect(numbers.every(Number.isFinite)).toBe(true)
		}
	})

	it('never aim a bone at the zero vector', () => {
		for (const pose of Object.values(POSES))
			for (const bone of Object.values(pose.bones))
				if (bone.aim)
					expect(Math.hypot(...bone.aim)).toBeGreaterThan(0.1)
	})
})
