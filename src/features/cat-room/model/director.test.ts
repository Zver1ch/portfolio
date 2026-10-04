import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gsap } from '@/shared/lib/gsap/register'
import { GAGS } from '../config/tuning'
import { dawnFactor, liteFinaleCamera } from '../lib/camera-path'
import { createDprGovernor } from '../lib/dpr-governor'
import { createPortal } from '../lib/portal'
import type { Rect } from '../lib/scene/cat/cat'
import type { RoomScene } from '../lib/scene/create-room-scene'
import { createDirector, type Director } from './director'
import type { DirectorFrame } from './frame'
import { getPortal, registerPortal, resetPortals } from './portals'
import { getRoomState, resetRoomStore } from './room-store'
import { createTimeline } from './timeline'

const VIEWPORT = { width: 1440, height: 900 }
/** The gag scheduler's wall clock, advanced by hand. */
const wallClock = { now: 100 }

function fakeScene() {
	const frames: DirectorFrame[] = []
	const calls = {
		render: vi.fn((frame: DirectorFrame) => {
			frames.push(frame)
		}),
		resize: vi.fn(),
		trigger: vi.fn(),
		measure: vi.fn((): { cat: Rect | null; head: Rect | null } => ({
			cat: { x: 10, y: 20, width: 100, height: 80 },
			head: { x: 40, y: 800, width: 120, height: 90 },
		})),
		dispose: vi.fn(),
		renderer: { clear: vi.fn() },
	}
	return { scene: calls as unknown as RoomScene, frames, calls }
}

describe('createDirector', () => {
	const timeline = createTimeline()
	let layer: HTMLDivElement
	let proxy: HTMLButtonElement
	let gagProxy: HTMLButtonElement
	let divePortal: HTMLDivElement
	let finalePortal: HTMLDivElement
	let director: Director | null = null

	beforeEach(() => {
		resetPortals()
		resetRoomStore()
		Object.assign(timeline, createTimeline(), { viewport: VIEWPORT })
		layer = document.createElement('div')
		// As in the markup: hidden until the director shows it.
		layer.style.visibility = 'hidden'
		proxy = document.createElement('button')
		gagProxy = document.createElement('button')
		divePortal = document.createElement('div')
		finalePortal = document.createElement('div')
		document.body.append(layer, proxy, gagProxy, divePortal, finalePortal)
		registerPortal('dive', createPortal(divePortal))
		registerPortal('finale', createPortal(finalePortal))
	})
	afterEach(() => {
		director?.dispose()
		director = null
		document.body.replaceChildren()
	})

	const start = (mode: 'full' | 'lite', fake = fakeScene()) => {
		director = createDirector({
			scene: fake.scene,
			timeline,
			mode,
			layer,
			proxy,
			gagProxy,
			governor: createDprGovernor(1),
			onFirstFrame: vi.fn(),
			now: () => wallClock.now,
		})
		return fake
	}

	it('runs the night room on the dive track and parks inside the monitor', () => {
		const { frames, calls } = start('full')
		gsap.ticker.tick()
		expect(director?.phase).toBe('room')
		expect(document.documentElement.dataset.roomPhase).toBe('room')
		expect(getRoomState().phase).toBe('room')
		const frame = frames.at(-1) as DirectorFrame
		expect(frame).toMatchObject({
			phase: 'room',
			pose: 'sit',
			dawn: 0,
			dive: 0,
			cut: true,
			lookAt: null,
		})
		expect(layer.style.visibility).toBe('visible')
		expect(proxy.style.display).toBe('block')
		expect(proxy.style.transform).toBe('translate(10.0px, 20.0px)')
		expect(divePortal.style.transform).toMatch(/^matrix3d\(/)

		// Mid-dive the cat looks at the pointer and the pose blends, no cut.
		timeline.pointer = { x: 700, y: 400 }
		timeline.dive = 0.5
		gsap.ticker.tick()
		const next = frames.at(-1) as DirectorFrame
		expect(next.cut).toBe(false)
		expect(next.lookAt).not.toBeNull()
		expect(next.dive).toBe(0.5)

		// Inside: one cleared frame, the layer hidden, the portal at identity.
		timeline.dive = 1
		timeline.heroInView = false
		gsap.ticker.tick()
		expect(director?.phase).toBe('inside')
		expect(calls.renderer.clear).toHaveBeenCalledTimes(1)
		expect(layer.style.visibility).toBe('hidden')
		expect(divePortal.style.transform).toBe('')
		expect(proxy.style.display).toBe('none')
		const rendered = calls.render.mock.calls.length
		gsap.ticker.tick()
		expect(calls.render.mock.calls.length).toBe(rendered)
	})

	it('runs the dawn room on the finale track with the page undocking from the monitor', () => {
		const { frames } = start('full')
		timeline.heroInView = false
		timeline.dive = 1
		gsap.ticker.tick()
		expect(director?.phase).toBe('inside')

		timeline.finale = 0.5
		timeline.finaleInView = true
		director?.wake()
		gsap.ticker.tick()
		expect(director?.phase).toBe('finale')
		expect(getRoomState().phase).toBe('finale')
		const frame = frames.at(-1) as DirectorFrame
		expect(frame).toMatchObject({
			phase: 'finale',
			pose: 'sleep',
			dive: 0,
			lookAt: null,
			cut: true,
		})
		expect(frame.dawn).toBeCloseTo(dawnFactor(0.5))
		expect(finalePortal.style.transform).toMatch(/^matrix3d\(/)
		expect(proxy.style.display).toBe('block')

		// Back above the stage: the finale portal is the page again.
		timeline.finale = 0.005
		gsap.ticker.tick()
		expect(director?.phase).toBe('inside')
		expect(getPortal('finale')?.element.style.transform).toBe('')
	})

	it('hides the proxy while the measured cat is off screen or blown up beside the camera', () => {
		const fake = fakeScene()
		const rects = [
			{ x: 10, y: 20, width: 100, height: 80 },
			{ x: -1418, y: 857, width: 4608, height: 1981 },
			{ x: 1500, y: 20, width: 100, height: 80 },
			{ x: 10, y: 20, width: 100, height: 80 },
		]
		fake.calls.measure.mockImplementation(() => ({
			cat: rects.shift() ?? null,
			head: null,
		}))
		start('full', fake)
		gsap.ticker.tick()
		expect(proxy.style.display).toBe('block')
		gsap.ticker.tick()
		expect(proxy.style.display).toBe('none')
		gsap.ticker.tick()
		expect(proxy.style.display).toBe('none')
		gsap.ticker.tick()
		expect(proxy.style.display).toBe('block')
	})

	it('lite mode shows the full dawn from the pulled-back camera and never warps', () => {
		const { frames } = start('lite')
		timeline.heroInView = false
		timeline.finaleInView = true
		gsap.ticker.tick()
		expect(director?.phase).toBe('finale')
		const frame = frames.at(-1) as DirectorFrame
		expect(frame.dawn).toBe(1)
		expect(frame.pose).toBe('sleep')
		expect(frame.camera).toEqual(
			liteFinaleCamera(VIEWPORT.width / VIEWPORT.height),
		)
		expect(finalePortal.style.transform).toBe('')
	})

	const goInside = () => {
		timeline.heroInView = false
		timeline.dive = 1
		gsap.ticker.tick()
		expect(director?.phase).toBe('inside')
	}
	const roomGag = () => document.documentElement.dataset.roomGag

	it('inside the monitor a section entry peeks through the overlay and ends on time', () => {
		const { frames, calls } = start('full')
		goInside()
		expect(layer.style.visibility).toBe('hidden')
		director?.enterSection()
		gsap.ticker.tick()
		expect(roomGag()).toBe('peek')
		const frame = frames.at(-1) as DirectorFrame
		expect(frame.phase).toBe('inside')
		expect(frame.pose).toBe('peek')
		expect(frame.overlay).not.toBeNull()
		expect(frame.cut).toBe(true)
		expect(layer.style.visibility).toBe('visible')
		expect(gagProxy.style.display).toBe('block')
		expect(proxy.style.display).toBe('none')

		wallClock.now += GAGS.peek.duration + 0.05
		gsap.ticker.tick()
		expect(roomGag()).toBeUndefined()
		expect(layer.style.visibility).toBe('hidden')
		expect(gagProxy.style.display).toBe('none')
		const rendered = calls.render.mock.calls.length
		gsap.ticker.tick()
		expect(calls.render.mock.calls.length).toBe(rendered)
	})

	it('a requested fish falls, is snatched once the paw is up, counted, and the gag ends', () => {
		const { frames } = start('full')
		goInside()
		expect(director?.feed({ x: 700, y: 100 })).toBe(true)
		gsap.ticker.tick()
		expect(roomGag()).toBe('fish')
		let frame = frames.at(-1) as DirectorFrame
		expect(frame.pose).toBe('reach')
		expect(frame.reach).not.toBeNull()
		expect(frame.fish).toMatchObject({ held: false })
		expect(document.documentElement.dataset.fishCount).toBeUndefined()
		for (let i = 0; i < 60; i++) {
			wallClock.now += 1 / 60
			gsap.ticker.tick()
		}
		expect(document.documentElement.dataset.fishCount).toBe('1')
		frame = frames.at(-1) as DirectorFrame
		expect(frame.fish).toMatchObject({ held: true })
		expect(frame.reach).toBeNull()
		wallClock.now += GAGS.fish.hold + GAGS.fish.sink + 0.1
		gsap.ticker.tick()
		expect(roomGag()).toBeUndefined()
		expect(layer.style.visibility).toBe('hidden')
	})

	it('Escape stops the gag and silences automatic ones; a fish still drops', () => {
		start('full')
		goInside()
		director?.enterSection()
		gsap.ticker.tick()
		expect(roomGag()).toBe('peek')
		director?.cancelGags()
		gsap.ticker.tick()
		expect(roomGag()).toBeUndefined()
		expect(layer.style.visibility).toBe('hidden')
		wallClock.now += GAGS.minGap + 1
		director?.enterSection()
		gsap.ticker.tick()
		expect(roomGag()).toBeUndefined()
		expect(director?.feed({ x: 300, y: 300 })).toBe(true)
		gsap.ticker.tick()
		expect(roomGag()).toBe('fish')
	})

	it('gags only inside the monitor in full mode, and leaving the monitor clears them', () => {
		start('full')
		gsap.ticker.tick()
		expect(director?.phase).toBe('room')
		expect(director?.feed({ x: 1, y: 1 })).toBe(false)
		director?.enterSection()
		gsap.ticker.tick()
		expect(roomGag()).toBeUndefined()
		goInside()
		director?.enterSection()
		gsap.ticker.tick()
		expect(roomGag()).toBe('peek')
		timeline.heroInView = true
		timeline.dive = 0
		gsap.ticker.tick()
		expect(director?.phase).toBe('room')
		expect(roomGag()).toBeUndefined()
		director?.dispose()

		start('lite')
		timeline.heroInView = false
		gsap.ticker.tick()
		expect(director?.feed({ x: 1, y: 1 })).toBe(false)
		director?.enterSection()
		gsap.ticker.tick()
		expect(roomGag()).toBeUndefined()
	})

	it('dispose hides the proxy and clears the phase', () => {
		start('full')
		gsap.ticker.tick()
		director?.dispose()
		director = null
		expect(document.documentElement.dataset.roomPhase).toBeUndefined()
		expect(getRoomState().phase).toBe('off')
		expect(proxy.style.display).toBe('none')
	})
})
