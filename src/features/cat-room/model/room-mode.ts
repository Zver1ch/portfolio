import { REDUCED_MOTION_QUERY, ROOM_FULL_QUERY } from '@/shared/config/motion'
import {
	useMediaQuery,
	useReducedMotion,
	useSaveData,
	useWebGLSupport,
} from '../lib/render-mode'
import { holdScrollPlace } from '../lib/scroll-anchor'
import { useRoomState } from './room-store'

/**
 * The queries whose change changes the mode, and so the layout above the
 * reader: their place is noted before React's commit. MediaQueryLists fire
 * in the order they were created and a microtask checkpoint, where React
 * flushes its re-render, follows each listener, so the lists here are made
 * at module load, ahead of the ones React subscribes to after hydration.
 */
export function watchModeQueries(
	matchMedia: (query: string) => MediaQueryList = window.matchMedia,
): () => void {
	const hold = () => holdScrollPlace()
	const lists = [ROOM_FULL_QUERY, REDUCED_MOTION_QUERY].map((query) =>
		matchMedia(query),
	)
	for (const list of lists) list.addEventListener('change', hold)
	return () => {
		for (const list of lists) list.removeEventListener('change', hold)
	}
}

// Once per page, whatever the bundler does to this module in development.
const WATCHED = Symbol.for('cat-room.mode-queries-watched')
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
	const scope = window as unknown as Record<symbol, boolean | undefined>
	if (!scope[WATCHED]) {
		scope[WATCHED] = true
		watchModeQueries()
	}
}

export type RoomMode = 'static' | 'lite' | 'full'

export type RoomModeInput = {
	reducedMotion: boolean
	webgl: boolean
	saveData: boolean
	/** The room store's latch: something failed earlier in this visit. */
	failed: boolean
	/** `ROOM_FULL_QUERY` matches: wide, tall and landscape enough to pin the stages. */
	fullViewport: boolean
}

/** Plan §2: the server always renders `static`; the client decides. */
export function selectRoomMode(input: RoomModeInput): RoomMode {
	if (input.reducedMotion || !input.webgl || input.saveData || input.failed)
		return 'static'
	return input.fullViewport ? 'full' : 'lite'
}

export function useRoomMode(): RoomMode {
	const reducedMotion = useReducedMotion()
	// Reduced motion already forces static: no probe context for nothing.
	const webgl = useWebGLSupport(!reducedMotion)
	const saveData = useSaveData()
	const fullViewport = useMediaQuery(ROOM_FULL_QUERY, false)
	const { failed } = useRoomState()
	return selectRoomMode({
		reducedMotion,
		webgl,
		saveData,
		failed,
		fullViewport,
	})
}
