/** Pointer travel (px) above which a click counts as a drag. */
export const DRAG_THRESHOLD_PX = 6

export function isBoopClick(
	travelPx: number,
	threshold = DRAG_THRESHOLD_PX,
): boolean {
	return Number.isFinite(travelPx) && travelPx >= 0 && travelPx <= threshold
}
