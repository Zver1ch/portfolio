import { describe, expect, it } from 'vitest'
import { type RoomModeInput, selectRoomMode } from './room-mode'

const ok: RoomModeInput = {
	reducedMotion: false,
	webgl: true,
	saveData: false,
	failed: false,
	fullViewport: true,
}

describe('selectRoomMode', () => {
	it.each([
		[{}, 'full'],
		[{ fullViewport: false }, 'lite'],
		[{ reducedMotion: true }, 'static'],
		[{ webgl: false }, 'static'],
		[{ saveData: true }, 'static'],
		[{ failed: true }, 'static'],
		[{ failed: true, fullViewport: false }, 'static'],
		[{ reducedMotion: true, webgl: false, saveData: true }, 'static'],
	] as const)('%o gives %s', (overrides, mode) => {
		expect(selectRoomMode({ ...ok, ...overrides })).toBe(mode)
	})
})
