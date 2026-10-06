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
	enterSection: vi.fn(),
	feed: vi.fn(() => true),
	cancelGags: vi.fn(),
}))
vi.mock('../model/director', () => ({
	createDirector: vi.fn((deps: { onFirstFrame: () => void }) => {
		deps.onFirstFrame()
		return director
	}),
}))

import { ROOM_LOAD } from '../config/tuning'
import { createDirector, type Director } from '../model/director'
import { requestFeed } from '../model/feed-bus'
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

		// The same button is the finale's pet target, under the same name.
		act(() => setRoomPhase('finale'))
		expect(proxy).toHaveAttribute('aria-label', 'Pet the cat')
		act(() => setRoomPhase('room'))

		// A scroll handler writing the timeline wakes an idle director.
		director.wake.mockClear()
		touchTimeline()
		expect(director.wake).toHaveBeenCalledTimes(1)
	})

	it('keeps the room when nothing on screen draws the first frame before the load timeout', async () => {
		let deps: Parameters<typeof createDirector>[0] | null = null
		vi.mocked(createDirector).mockImplementationOnce((given) => {
			deps = given
			return director as unknown as Director
		})
		try {
			// Only the load timeout is faked: the idle callback stub must stay.
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
			render(<RoomLayer onPet={vi.fn()} />)
			await act(() => vi.advanceTimersByTimeAsync(0))
			// The scene exists: ready, even though no stage has been drawn yet.
			expect(getRoomState()).toMatchObject({
				status: 'ready',
				failed: false,
			})
			expect(document.documentElement.dataset.sceneReady).toBeUndefined()
			// A deep link or a background tab: the timeout must not fire.
			await act(() =>
				vi.advanceTimersByTimeAsync(ROOM_LOAD.timeoutMs + 1000),
			)
			expect(getRoomState()).toMatchObject({
				status: 'ready',
				failed: false,
			})
			// The first drawn frame still swaps the veil and the posters.
			act(() => deps?.onFirstFrame())
			expect(document.documentElement.dataset.sceneReady).toBe('true')
		} finally {
			vi.useRealTimers()
		}
	})

	it('drops a fish on a clean tap in main, never on a link or a drag, and on request; Escape cancels', async () => {
		render(
			<>
				<main>
					<p data-testid='empty'>empty</p>
					<a href='#top' data-testid='link'>
						Back to top
					</a>
				</main>
				<RoomLayer onPet={() => {}} />
			</>,
		)
		await flush()
		const empty = screen.getByTestId('empty')
		const link = screen.getByTestId('link')
		const tap = (
			target: Element,
			from: [number, number],
			to: [number, number],
		) => {
			fireEvent.pointerDown(target, {
				button: 0,
				clientX: from[0],
				clientY: from[1],
			})
			fireEvent.pointerUp(target, {
				button: 0,
				clientX: to[0],
				clientY: to[1],
			})
		}
		tap(empty, [100, 200], [102, 201])
		expect(director.feed).toHaveBeenCalledWith({ x: 102, y: 201 })
		director.feed.mockClear()
		tap(link, [100, 200], [100, 200])
		tap(empty, [100, 200], [140, 200])
		expect(director.feed).not.toHaveBeenCalled()
		requestFeed()
		expect(director.feed).toHaveBeenCalledTimes(1)
		requestFeed({ x: 5, y: 6 })
		expect(director.feed).toHaveBeenLastCalledWith({ x: 5, y: 6 })
		fireEvent.keyDown(window, { key: 'Escape' })
		expect(director.cancelGags).toHaveBeenCalledTimes(1)
		const gagProxy = document.querySelector('[data-gag-proxy]')
		expect(gagProxy).toHaveAttribute('aria-hidden', 'true')
		expect(gagProxy).toHaveAttribute('tabindex', '-1')
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
