import { describe, expect, it, vi } from 'vitest'

const scroll = vi.hoisted(() => ({ hold: vi.fn() }))
vi.mock('../lib/scroll-anchor', () => ({ holdScrollPlace: scroll.hold }))

import { REDUCED_MOTION_QUERY, ROOM_FULL_QUERY } from '@/shared/config/motion'
import {
	type RoomModeInput,
	selectRoomMode,
	watchModeQueries,
} from './room-mode'

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

describe('watchModeQueries', () => {
	it("holds the reader's place when a mode query changes, until unwatched", () => {
		const listeners = new Map<string, Set<() => void>>()
		const matchMedia = (query: string) => {
			const set = new Set<() => void>()
			listeners.set(query, set)
			return {
				matches: false,
				media: query,
				addEventListener: (_: string, listener: () => void) => {
					set.add(listener)
				},
				removeEventListener: (_: string, listener: () => void) => {
					set.delete(listener)
				},
			} as unknown as MediaQueryList
		}
		const unwatch = watchModeQueries(matchMedia)
		expect([...listeners.keys()]).toEqual([
			ROOM_FULL_QUERY,
			REDUCED_MOTION_QUERY,
		])
		for (const listener of listeners.get(ROOM_FULL_QUERY) ?? []) listener()
		expect(scroll.hold).toHaveBeenCalledTimes(1)
		for (const listener of listeners.get(REDUCED_MOTION_QUERY) ?? [])
			listener()
		expect(scroll.hold).toHaveBeenCalledTimes(2)
		unwatch()
		expect(listeners.get(ROOM_FULL_QUERY)?.size).toBe(0)
	})
})
