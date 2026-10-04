import { ROOM_FULL_QUERY } from '@/shared/config/motion'
import {
	useMediaQuery,
	useReducedMotion,
	useSaveData,
	useWebGLSupport,
} from '../lib/render-mode'
import { useRoomState } from './room-store'

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
