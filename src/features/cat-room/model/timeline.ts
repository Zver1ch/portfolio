/**
 * What the scroll and the pointer did, for the director to read every frame
 * (plan §3.3). A plain mutable object: ScrollTriggers and listeners write
 * it, nothing re-renders because of it.
 */
export type Timeline = {
	/** Scroll progress of the dive and the finale, 0..1 (lite mode too, over the stage's extra height). */
	dive: number
	finale: number
	pointer: { x: number; y: number } | null
	viewport: { width: number; height: number }
	heroInView: boolean
	finaleInView: boolean
}

export function createTimeline(): Timeline {
	return {
		dive: 0,
		finale: 0,
		pointer: null,
		viewport: { width: 1, height: 1 },
		heroInView: true,
		finaleInView: false,
	}
}

/** The page's one timeline; the stages and the layer share it. */
export const timeline: Timeline = createTimeline()

const touchListeners = new Set<() => void>()

/**
 * The director listens here: a scroll handler wrote the timeline, so a frame
 * may be needed. Without it the director, idle inside the monitor, would
 * never notice a stage's progress changing under it.
 */
export function onTimelineTouch(listener: () => void): () => void {
	touchListeners.add(listener)
	return () => {
		touchListeners.delete(listener)
	}
}

export function touchTimeline() {
	for (const listener of touchListeners) listener()
}

/** Test hook. */
export function resetTimeline() {
	Object.assign(timeline, createTimeline())
	touchListeners.clear()
}
