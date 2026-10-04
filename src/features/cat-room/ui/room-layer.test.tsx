import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hooks = vi.hoisted(() => ({
	reducedMotion: false,
	webgl: true,
	fullViewport: true,
}))
vi.mock('../lib/render-mode', () => ({
	useReducedMotion: () => hooks.reducedMotion,
	useWebGLSupport: (enabled: boolean) => enabled && hooks.webgl,
	useSaveData: () => false,
	useMediaQuery: () => hooks.fullViewport,
}))

const scene = vi.hoisted(() => ({
	render: vi.fn(),
	resize: vi.fn(),
	trigger: vi.fn(),
	measure: vi.fn(() => ({ cat: null, head: null })),
	dispose: vi.fn(),
	renderer: { clear: vi.fn() },
}))
const createRoomScene = vi.hoisted(() =>
	vi.fn(async (options: { onProgress?: (f: number) => void }) => {
		options.onProgress?.(1)
		return scene
	}),
)
vi.mock('../lib/load-room-scene', () => ({
	loadRoomScene: () => loader.next(),
}))
const loader = vi.hoisted(() => ({
	next: () => Promise.resolve({ createRoomScene }),
}))

const director = vi.hoisted(() => ({
	dispose: vi.fn(),
	wake: vi.fn(),
	stop: vi.fn(),
}))
vi.mock('../model/director', () => ({
	createDirector: vi.fn((deps: { onFirstFrame: () => void }) => {
		deps.onFirstFrame()
		return director
	}),
}))

import { getRoomState, resetRoomStore, setRoomPhase } from '../model/room-store'
import { resetTimeline, touchTimeline } from '../model/timeline'
import { RoomLayer } from './room-layer'

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)))

describe('RoomLayer', () => {
	beforeEach(() => {
		resetRoomStore()
		resetTimeline()
		hooks.reducedMotion = false
		hooks.webgl = true
		hooks.fullViewport = true
		loader.next = () => Promise.resolve({ createRoomScene })
		vi.stubGlobal(
			'IntersectionObserver',
			class {
				observe() {}
				disconnect() {}
			},
		)
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe() {}
				disconnect() {}
			},
		)
		Object.defineProperty(window, 'requestIdleCallback', {
			configurable: true,
			value: (callback: () => void) => {
				callback()
				return 1
			},
		})
		Object.defineProperty(window, 'cancelIdleCallback', {
			configurable: true,
			value: () => {},
		})
	})
	afterEach(() => {
		cleanup()
		vi.unstubAllGlobals()
		delete document.documentElement.dataset.roomMode
		delete document.documentElement.dataset.sceneReady
	})

	it('stays static under reduced motion and never loads the scene', async () => {
		hooks.reducedMotion = true
		render(<RoomLayer onPet={() => {}} />)
		await flush()
		expect(document.documentElement.dataset.roomMode).toBe('static')
		expect(createRoomScene).not.toHaveBeenCalled()
		expect(document.querySelector('canvas')).toBeNull()
		expect(screen.queryByRole('button')).toBeNull()
	})

	it('loads in full mode, reports the first frame and pets through the proxy', async () => {
		const onPet = vi.fn()
		render(<RoomLayer onPet={onPet} />)
		await flush()
		expect(document.documentElement.dataset.roomMode).toBe('full')
		expect(createRoomScene).toHaveBeenCalledWith(
			expect.objectContaining({ fakeScreen: false }),
		)
		expect(
			document.querySelector('[data-room-layer] canvas'),
		).not.toBeNull()
		expect(document.documentElement.dataset.sceneReady).toBe('true')
		expect(getRoomState()).toMatchObject({ status: 'ready', progress: 1 })

		// Hidden until the director places it over the cat; still the pet target.
		const proxy = document.querySelector(
			'[data-pet-proxy]',
		) as HTMLButtonElement
		expect(proxy).toHaveAttribute('aria-label', 'Pet the cat')
		expect(proxy).toBeEnabled()
		fireEvent.click(proxy)
		expect(onPet).toHaveBeenCalledTimes(1)
		expect(scene.trigger).toHaveBeenCalledWith({ type: 'pet' })

		// The same button is the finale's pet target, named for the sleeper.
		act(() => setRoomPhase('finale'))
		expect(proxy).toHaveAttribute('aria-label', 'Pet the sleeping cat')
		act(() => setRoomPhase('room'))
		expect(proxy).toHaveAttribute('aria-label', 'Pet the cat')

		// A scroll handler writing the timeline wakes an idle director.
		director.wake.mockClear()
		touchTimeline()
		expect(director.wake).toHaveBeenCalledTimes(1)
	})

	it('uses the painted screen in lite mode', async () => {
		hooks.fullViewport = false
		render(<RoomLayer onPet={() => {}} />)
		await flush()
		expect(document.documentElement.dataset.roomMode).toBe('lite')
	})

	it('falls back to static when the scene chunk is rejected', async () => {
		loader.next = () => Promise.reject(new Error('chunk failed'))
		render(<RoomLayer onPet={() => {}} />)
		await flush()
		expect(getRoomState()).toMatchObject({
			failed: true,
			reason: 'chunk failed',
		})
		expect(document.documentElement.dataset.roomMode).toBe('static')
		expect(document.querySelector('canvas')).toBeNull()
	})

	it('falls back to static when the context is lost and disposes on unmount', async () => {
		const { unmount } = render(<RoomLayer onPet={() => {}} />)
		await flush()
		const canvas = document.querySelector('canvas') as HTMLCanvasElement
		act(() => {
			canvas.dispatchEvent(new Event('webglcontextlost'))
		})
		await flush()
		expect(getRoomState().failed).toBe(true)
		expect(document.documentElement.dataset.roomMode).toBe('static')
		expect(scene.dispose).toHaveBeenCalled()
		expect(director.dispose).toHaveBeenCalled()

		resetRoomStore()
		await flush()
		unmount()
		expect(document.querySelector('canvas')).toBeNull()
		director.wake.mockClear()
		touchTimeline()
		expect(director.wake).not.toHaveBeenCalled()
	})
})
