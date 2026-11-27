import { GAGS } from '../config/tuning'

/** A dropped fish in CSS px: free fall until the paw's catch line. */
export type Fish = {
	x: number
	y: number
	/** px per second, downwards. */
	vy: number
	caught: boolean
}

export function createFish(drop: { x: number; y: number }): Fish {
	return { x: drop.x, y: drop.y, vy: 0, caught: false }
}

/** One step of the fall; the fish is caught the moment it reaches `catchY`. */
export function stepFish(
	fish: Fish,
	dt: number,
	catchY: number,
	gravity: number = GAGS.fish.gravity,
): Fish {
	if (fish.caught) return fish
	if (fish.y >= catchY) return { ...fish, y: catchY, vy: 0, caught: true }
	const vy = fish.vy + gravity * dt
	const y = fish.y + ((fish.vy + vy) / 2) * dt
	if (y >= catchY) return { x: fish.x, y: catchY, vy: 0, caught: true }
	return { x: fish.x, y, vy, caught: false }
}
