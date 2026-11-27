/**
 * The full room: wide and tall enough to pin the hero and finale stages,
 * landscape enough for the monitor to take the viewport's aspect, motion
 * allowed. Everything else that still allows motion is `lite` (plan §2).
 */
export const ROOM_FULL_QUERY =
	'(min-width: 64rem) and (min-height: 44rem) and (min-aspect-ratio: 6/5) and (prefers-reduced-motion: no-preference)'
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
export const FINE_POINTER_QUERY =
	'(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
