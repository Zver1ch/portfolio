import { DIVE, FINALE } from '../config/camera-tracks'
import type { Phase } from './frame'
import type { RoomMode } from './room-mode'

export type PhaseInput = {
	mode: RoomMode
	/** Scroll progress of the dive and the finale, 0..1. */
	dive: number
	finale: number
	heroInView: boolean
	finaleInView: boolean
}

/** Plan §3.3: which camera, room and cat the director runs this frame. */
export function resolvePhase({
	mode,
	dive,
	finale,
	heroInView,
	finaleInView,
}: PhaseInput): Phase {
	if (mode === 'static') return 'off'
	if (mode === 'lite') {
		if (finaleInView) return 'finale'
		return heroInView ? 'room' : 'off'
	}
	if (finale > FINALE.phaseStart) return 'finale'
	if (heroInView && dive < DIVE.inside) return 'room'
	return 'inside'
}
