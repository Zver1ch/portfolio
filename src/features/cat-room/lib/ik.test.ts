import { describe, expect, it } from 'vitest'
import { add, distance, scale, type Vec3 } from '@/shared/lib/math/vec3'
import { solveTwoBone } from './ik'

const root: Vec3 = [0, 1, 0]
const pole: Vec3 = [0, 0, 1]

function endOf(solution: ReturnType<typeof solveTwoBone>, lower: number) {
	return add(solution.joint, scale(solution.lower, lower))
}

describe('solveTwoBone', () => {
	it('reaches a target inside the range with both lengths preserved', () => {
		const target: Vec3 = [0.5, 1.2, 0.3]
		const s = solveTwoBone(root, target, 0.4, 0.35, pole)
		expect(s.reached).toBe(true)
		expect(distance(root, s.joint)).toBeCloseTo(0.4)
		expect(distance(endOf(s, 0.35), target)).toBeLessThan(1e-6)
	})

	it('bends towards the pole hint', () => {
		const target: Vec3 = [0.6, 1, 0]
		const forward = solveTwoBone(root, target, 0.4, 0.4, [0, 0, 1])
		const backward = solveTwoBone(root, target, 0.4, 0.4, [0, 0, -1])
		expect(forward.joint[2]).toBeGreaterThan(0.1)
		expect(backward.joint[2]).toBeLessThan(-0.1)
	})

	it('straightens towards an unreachable target without stretching', () => {
		const target: Vec3 = [3, 1, 0]
		const s = solveTwoBone(root, target, 0.4, 0.35, pole)
		expect(s.reached).toBe(false)
		expect(distance(root, s.joint)).toBeCloseTo(0.4)
		expect(distance(root, endOf(s, 0.35))).toBeCloseTo(0.75, 3)
		expect(s.upper[0]).toBeCloseTo(1, 2)
		expect(s.lower[0]).toBeCloseTo(1, 2)
	})

	it('folds when the target is closer than the bones allow', () => {
		const s = solveTwoBone(root, [0.01, 1, 0], 0.4, 0.3, pole)
		expect(s.reached).toBe(false)
		expect(distance(root, s.joint)).toBeCloseTo(0.4)
		expect(distance(root, endOf(s, 0.3))).toBeCloseTo(0.1, 3)
	})

	it('copes with a pole hint parallel to the axis', () => {
		const s = solveTwoBone(root, [0.5, 1, 0], 0.4, 0.4, [1, 0, 0])
		expect(Number.isFinite(s.joint[1])).toBe(true)
		expect(distance(root, s.joint)).toBeCloseTo(0.4)
	})
})
