import { useSyncExternalStore } from 'react'
import { clamp01 } from '@/shared/lib/math/ease'

export type RoomStatus = 'idle' | 'loading' | 'ready' | 'failed'

export type RoomState = {
	status: RoomStatus
	/** 0..1, monotonic while loading (plan §3.11). */
	progress: number
	/** Latched for the rest of the visit: the page stays static after any failure. */
	failed: boolean
	reason: string | null
}

const INITIAL: RoomState = {
	status: 'idle',
	progress: 0,
	failed: false,
	reason: null,
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
	if (state.failed || state.status === 'ready') return
	emit({ status: 'loading', progress: Math.max(state.progress, 0.05) })
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
	emit({ status: 'failed', failed: true, reason })
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
