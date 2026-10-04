import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const engine = vi.hoisted(() => ({
	startAmbient: vi.fn(async () => true),
	stopAmbient: vi.fn(),
	setAmbientMood: vi.fn(),
}))
vi.mock('@/shared/lib/sound/ambient-engine', () => engine)

import { setSoundEnabled } from '@/shared/lib/sound/sound-enabled'
import {
	resetRoomStore,
	roomReady,
	setRoomPhase,
	startRoom,
} from '../model/room-store'
import { AmbientSound } from './ambient-sound'

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

describe('AmbientSound', () => {
	beforeEach(() => {
		resetRoomStore()
		window.localStorage.clear()
		setSoundEnabled(false)
		window.localStorage.clear()
	})
	afterEach(cleanup)

	it('starts only after the opt-in with the room ready, follows the phase, and stops on mute', async () => {
		render(<AmbientSound />)
		await flush()
		expect(engine.startAmbient).not.toHaveBeenCalled()

		act(() => {
			startRoom()
			roomReady()
		})
		await flush()
		expect(engine.startAmbient).not.toHaveBeenCalled()

		act(() => setSoundEnabled(true))
		await flush()
		expect(engine.startAmbient).toHaveBeenCalledTimes(1)

		act(() => setRoomPhase('finale'))
		expect(engine.setAmbientMood).toHaveBeenLastCalledWith(1)
		act(() => setRoomPhase('room'))
		expect(engine.setAmbientMood).toHaveBeenLastCalledWith(0)

		act(() => setSoundEnabled(false))
		await flush()
		expect(engine.stopAmbient).toHaveBeenCalled()
	})

	it('waits for a gesture when the browser keeps the context suspended', async () => {
		engine.startAmbient.mockResolvedValueOnce(false)
		act(() => {
			startRoom()
			roomReady()
			setSoundEnabled(true)
		})
		render(<AmbientSound />)
		await flush()
		expect(engine.startAmbient).toHaveBeenCalledTimes(1)
		act(() => {
			window.dispatchEvent(new Event('pointerdown'))
		})
		await flush()
		expect(engine.startAmbient).toHaveBeenCalledTimes(2)
	})
})
