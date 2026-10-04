import { gsap } from '@/shared/lib/gsap/register'
import { type CameraPose, unprojectPoint } from '@/shared/lib/math/projection'
import { POINTER_LOOK_DEPTH } from '../config/tuning'
import { cameraAt, liteHeroCamera } from '../lib/camera-path'
import type { DprGovernor } from '../lib/dpr-governor'
import type { RoomScene } from '../lib/scene/create-room-scene'
import { advance } from '../lib/scene-time'
import type { DirectorFrame, Phase } from './frame'
import { resolvePhase } from './phase'
import type { RoomMode } from './room-mode'
import type { Timeline } from './timeline'

export type DirectorDeps = {
	scene: RoomScene
	timeline: Timeline
	mode: Exclude<RoomMode, 'static'>
	/** The fixed layer: hidden whenever no frame is needed. */
	layer: HTMLElement
	/** The pet proxy button to keep over the cat, when there is one. */
	proxy: HTMLElement | null
	governor: DprGovernor
	/** The animation frame after the first render. */
	onFirstFrame(): void
}

export type Director = {
	/** Resume ticking after something changed (scroll, resize, visibility). */
	wake(): void
	stop(): void
	dispose(): void
	readonly phase: Phase
}

/**
 * The only per-frame owner (plan §3.3). Runs on the GSAP ticker after Lenis
 * and ScrollTrigger, only while a frame is needed, and leaves one cleared
 * frame behind when it idles so the last picture never lingers.
 */
export function createDirector(deps: DirectorDeps): Director {
	const { scene, timeline, mode, layer, proxy, governor } = deps
	const clock = { current: 0 }
	let ticking = false
	let shown = false
	let firstFrame = true
	let phase: Phase = 'off'
	let disposed = false

	const showLayer = (visible: boolean) => {
		if (shown === visible) return
		shown = visible
		layer.style.visibility = visible ? 'visible' : 'hidden'
	}

	const placeProxy = () => {
		if (!proxy) return
		const rect = phase === 'room' ? scene.measure().cat : null
		if (!rect) {
			proxy.style.display = 'none'
			return
		}
		proxy.style.display = 'block'
		proxy.style.transform = `translate(${rect.x.toFixed(1)}px, ${rect.y.toFixed(1)}px)`
		proxy.style.width = `${rect.width.toFixed(1)}px`
		proxy.style.height = `${rect.height.toFixed(1)}px`
	}

	const cameraFor = (aspect: number): CameraPose =>
		mode === 'full'
			? cameraAt('dive', timeline.dive, aspect)
			: liteHeroCamera(aspect)

	const idle = () => {
		if (shown) {
			// One cleared frame, so the canvas is empty when it is shown again.
			scene.renderer.clear()
			showLayer(false)
		}
		placeProxy()
		stop()
	}

	const tick = (_time: number, deltaMs: number) => {
		if (disposed) return
		phase = resolvePhase({
			mode,
			dive: timeline.dive,
			finale: timeline.finale,
			heroInView: timeline.heroInView,
			finaleInView: timeline.finaleInView,
		})
		if (phase !== 'room') {
			idle()
			return
		}
		const dt = Math.min(Math.max(deltaMs / 1000, 0), 0.1)
		const time = advance(clock, dt)
		const { width, height } = timeline.viewport
		const camera = cameraFor(width / height)
		const frame: DirectorFrame = {
			phase,
			camera,
			time,
			dawn: 0,
			dive: timeline.dive,
			viewport: timeline.viewport,
			pointer: timeline.pointer,
			pose: 'sit',
			lookAt: timeline.pointer
				? unprojectPoint(
						[timeline.pointer.x, timeline.pointer.y],
						camera,
						width,
						height,
						POINTER_LOOK_DEPTH,
					)
				: null,
			stepped: false,
		}
		scene.render(frame, dt)
		layer.style.opacity = String(timeline.layerOpacity)
		showLayer(true)
		placeProxy()
		if (firstFrame) {
			firstFrame = false
			requestAnimationFrame(() => {
				if (!disposed) deps.onFirstFrame()
			})
		}
		const dpr = governor.sample(dt)
		if (dpr !== null) scene.resize(width, height, dpr)
	}

	const start = () => {
		if (ticking || disposed) return
		ticking = true
		gsap.ticker.add(tick)
	}
	const stop = () => {
		if (!ticking) return
		ticking = false
		gsap.ticker.remove(tick)
	}

	start()
	return {
		get phase() {
			return phase
		},
		wake: start,
		stop,
		dispose() {
			disposed = true
			stop()
			if (proxy) proxy.style.display = 'none'
		},
	}
}
