/**
 * Animation clocks accumulate frame deltas instead of reading a renderer
 * clock. A tab that was in the background delivers one huge delta on return;
 * clamp it so nothing teleports.
 */
export const MAX_FRAME_DELTA = 0.1

export function advance(clock: { current: number }, delta: number): number {
	clock.current += Math.min(Math.max(delta, 0), MAX_FRAME_DELTA)
	return clock.current
}
