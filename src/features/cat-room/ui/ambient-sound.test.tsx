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
		setSoundEnabled(true)
	})
	afterEach(cleanup)

	it('starts with sound on and the room ready, follows the phase, stops on mute and restarts on unmute', async () => {
		render(<AmbientSound />)
		await flush()
		expect(engine.startAmbient).not.toHaveBeenCalled()

		act(() => {
			startRoom()
			roomReady()
		})
		await flush()
		expect(engine.startAmbient).toHaveBeenCalledTimes(1)

		act(() => setRoomPhase('finale'))
		expect(engine.setAmbientMood).toHaveBeenLastCalledWith(1)
		act(() => setRoomPhase('room'))
		expect(engine.setAmbientMood).toHaveBeenLastCalledWith(0)

		act(() => setSoundEnabled(false))
		await flush()
		expect(engine.stopAmbient).toHaveBeenCalled()

		act(() => setSoundEnabled(true))
		await flush()
		expect(engine.startAmbient).toHaveBeenCalledTimes(2)
	})

	it('stays off when the stored choice is muted', async () => {
		act(() => {
			startRoom()
			roomReady()
			setSoundEnabled(false)
		})
		render(<AmbientSound />)
		await flush()
		expect(engine.startAmbient).not.toHaveBeenCalled()
	})

	it('waits for a gesture when the browser keeps the context suspended', async () => {
		engine.startAmbient.mockResolvedValueOnce(false)
		act(() => {
			startRoom()
			roomReady()
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

	it('arms the gesture listeners while a resume stays pending', async () => {
		engine.startAmbient.mockReturnValueOnce(new Promise(() => {}))
		act(() => {
			startRoom()
			roomReady()
		})
		render(<AmbientSound />)
		await flush()
		expect(engine.startAmbient).toHaveBeenCalledTimes(1)
		act(() => {
			window.dispatchEvent(new Event('pointerup'))
		})
		await flush()
		expect(engine.startAmbient).toHaveBeenCalledTimes(2)
	})

	it('removes the gesture listeners once the start succeeds', async () => {
		const add = vi.spyOn(window, 'addEventListener')
		const remove = vi.spyOn(window, 'removeEventListener')
		act(() => {
			startRoom()
			roomReady()
		})
		render(<AmbientSound />)
		await flush()

		for (const type of ['pointerdown', 'pointerup', 'keydown']) {
			const armed = add.mock.calls.find(([name]) => name === type)
			expect(armed).toBeDefined()
			expect(remove).toHaveBeenCalledWith(type, armed?.[1])
		}
		add.mockRestore()
		remove.mockRestore()
	})
})
