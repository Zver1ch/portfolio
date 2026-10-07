import { beforeEach, describe, expect, it } from 'vitest'
import {
	failRoom,
	getRoomState,
	landRoom,
	resetRoomStore,
	roomReady,
	setRoomPhase,
	setRoomProgress,
	startRoom,
} from './room-store'

describe('room store', () => {
	beforeEach(resetRoomStore)

	it('starts idle, loads with monotonic progress and becomes ready at 1', () => {
		expect(getRoomState()).toMatchObject({ status: 'idle', progress: 0 })
		setRoomProgress(0.5)
		expect(getRoomState().progress).toBe(0)
		startRoom()
		expect(getRoomState()).toMatchObject({
			status: 'loading',
			progress: 0.05,
		})
		setRoomProgress(0.6)
		setRoomProgress(0.4)
		expect(getRoomState().progress).toBe(0.6)
		setRoomProgress(2)
		expect(getRoomState().progress).toBe(1)
		roomReady()
		expect(getRoomState()).toMatchObject({ status: 'ready', progress: 1 })
	})

	it('latches a failure for the rest of the visit', () => {
		startRoom()
		failRoom('chunk')
		expect(getRoomState()).toMatchObject({
			status: 'failed',
			failed: true,
			reason: 'chunk',
		})
		startRoom()
		roomReady()
		failRoom('later')
		expect(getRoomState()).toMatchObject({
			status: 'failed',
			failed: true,
			reason: 'chunk',
		})
	})

	it('mirrors the phase the director reports, off at rest', () => {
		expect(getRoomState().phase).toBe('off')
		setRoomPhase('room')
		expect(getRoomState().phase).toBe('room')
		setRoomPhase('finale')
		expect(getRoomState().phase).toBe('finale')
		resetRoomStore()
		expect(getRoomState().phase).toBe('off')
	})

	it('notes the lite landing once, and forgets it with the rest', () => {
		expect(getRoomState().landed).toBe(false)
		landRoom()
		landRoom()
		expect(getRoomState().landed).toBe(true)
		resetRoomStore()
		expect(getRoomState().landed).toBe(false)
	})
})
