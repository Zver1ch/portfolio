/**
 * What the scroll and the pointer did, for the director to read every frame
 * (plan §3.3). A plain mutable object: ScrollTriggers and listeners write
 * it, nothing re-renders because of it.
 */
export type Timeline = {
	dive: number
	finale: number
	/** Lite mode fades the canvas in and out over the stages. */
	layerOpacity: number
	pointer: { x: number; y: number } | null
	viewport: { width: number; height: number }
	heroInView: boolean
	finaleInView: boolean
}

export function createTimeline(): Timeline {
	return {
		dive: 0,
		finale: 0,
		layerOpacity: 1,
		pointer: null,
		viewport: { width: 1, height: 1 },
		heroInView: true,
		finaleInView: false,
	}
}

/** The page's one timeline; the stages and the layer share it. */
export const timeline: Timeline = createTimeline()

/** Test hook. */
export function resetTimeline() {
	Object.assign(timeline, createTimeline())
}
