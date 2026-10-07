import { useSyncExternalStore } from 'react'
import { clamp01 } from '@/shared/lib/math/ease'
import { holdScrollPlace } from '../lib/scroll-anchor'
import type { Phase } from './frame'

export type RoomStatus = 'idle' | 'loading' | 'ready' | 'failed'

export type RoomState = {
	status: RoomStatus
	/** 0..1, monotonic while loading (plan §3.11). */
	progress: number
	/** Latched for the rest of the visit: the page stays static after any failure. */
	failed: boolean
	reason: string | null
	/** What the director is showing, for the parts of the page that depend on it (the proxy's label). */
	phase: Phase
	/** Lite mode: the dive has landed on the first section at least once (the typing line waits for it). */
	landed: boolean
}

const INITIAL: RoomState = {
	status: 'idle',
	progress: 0,
	failed: false,
	reason: null,
	phase: 'off',
	landed: false,
}

let state: RoomState = INITIAL
const listeners = new Set<() => void>()

function emit(next: Partial<RoomState>) {
	state = { ...state, ...next }
	for (const listener of listeners) listener()
}

export function getRoomState(): RoomState {
	return state
}

export function startRoom() {
	if (state.failed) return
	// A mode change rebuilds the scene: the room is loading again.
	emit({
		status: 'loading',
		progress:
			state.status === 'ready' ? 0.05 : Math.max(state.progress, 0.05),
	})
}

export function setRoomProgress(progress: number) {
	if (state.status !== 'loading') return
	const next = clamp01(progress)
	if (next > state.progress) emit({ progress: next })
}

export function roomReady() {
	if (state.failed) return
	emit({ status: 'ready', progress: 1 })
}

/** A failure of any kind (chunk, model, timeout, renderer, context loss) switches to static for good. */
export function failRoom(reason: string) {
	if (state.failed) return
	// The static layout drops the spacers and the pins above the reader: note their place first.
	holdScrollPlace()
	emit({ status: 'failed', failed: true, reason })
}

/** Written by the director on every phase change; `off` again when it is disposed. */
export function setRoomPhase(phase: Phase) {
	if (state.phase === phase) return
	emit({ phase })
}

/** The lite dive has landed: the page is the page from here on, until the room comes back over it. */
export function landRoom() {
	if (state.landed) return
	emit({ landed: true })
}

/** Test hook. */
export function resetRoomStore() {
	state = INITIAL
	for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

const getServerState = () => INITIAL

export function useRoomState(): RoomState {
	return useSyncExternalStore(subscribe, getRoomState, getServerState)
}
