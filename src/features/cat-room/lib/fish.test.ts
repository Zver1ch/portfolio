import { describe, expect, it } from 'vitest'
import { createFish, stepFish } from './fish'

describe('fish', () => {
	it('falls with the configured gravity', () => {
		let fish = createFish({ x: 300, y: 100 })
		for (let i = 0; i < 50; i++) fish = stepFish(fish, 0.01, 10_000, 2400)
		// s = ½ g t² after 0.5 s.
		expect(fish.y).toBeCloseTo(100 + 0.5 * 2400 * 0.25, 5)
		expect(fish.vy).toBeCloseTo(1200, 5)
		expect(fish.x).toBe(300)
		expect(fish.caught).toBe(false)
	})

	it('is caught exactly at the catch line and stays there', () => {
		let fish = createFish({ x: 10, y: 0 })
		for (let i = 0; i < 200 && !fish.caught; i++)
			fish = stepFish(fish, 1 / 60, 400)
		expect(fish.caught).toBe(true)
		expect(fish.y).toBe(400)
		expect(stepFish(fish, 1 / 60, 400)).toBe(fish)
	})

	it('a fish dropped below the line is caught at once', () => {
		const fish = stepFish(createFish({ x: 0, y: 700 }), 1 / 60, 600)
		expect(fish).toMatchObject({ y: 600, caught: true })
	})
})
