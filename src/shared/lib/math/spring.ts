/** The largest step a damper or spring integrates at once (a 10 fps frame). */
export const MAX_SPRING_DT = 1 / 30

/**
 * Exponential approach: `current` moves towards `target` with rate `lambda`
 * per second, frame-rate independent and never overshooting.
 */
export function damp(
	current: number,
	target: number,
	lambda: number,
	dt: number,
): number {
	return (
		current + (target - current) * (1 - Math.exp(-lambda * Math.max(dt, 0)))
	)
}

export type SpringState = { value: number; velocity: number }

export type SpringParams = {
	/** Angular frequency in rad/s; higher is snappier. */
	stiffness: number
	/** 1 is critically damped, below 1 wobbles. */
	damping: number
}

/**
 * Semi-implicit Euler spring towards `target`. Long frames are cut into
 * sub-steps of at most {@link MAX_SPRING_DT}, so a tab coming back from the
 * background cannot make the state explode.
 */
export function springStep(
	state: SpringState,
	target: number,
	dt: number,
	{ stiffness, damping }: SpringParams,
): SpringState {
	let { value, velocity } = state
	let remaining = Math.max(dt, 0)
	while (remaining > 0) {
		const h = Math.min(remaining, MAX_SPRING_DT)
		remaining -= h
		const acceleration =
			stiffness * stiffness * (target - value) -
			2 * damping * stiffness * velocity
		velocity += acceleration * h
		value += velocity * h
	}
	return { value, velocity }
}
