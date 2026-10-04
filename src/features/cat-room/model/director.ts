import { gsap } from '@/shared/lib/gsap/register'
import { type CameraPose, unprojectPoint } from '@/shared/lib/math/projection'
import { POINTER_LOOK_DEPTH } from '../config/tuning'
import {
	cameraAt,
	dawnFactor,
	finaleUndock,
	liteFinaleCamera,
	liteHeroCamera,
} from '../lib/camera-path'
import type { DprGovernor } from '../lib/dpr-governor'
import type { RoomScene } from '../lib/scene/create-room-scene'
import { advance } from '../lib/scene-time'
import { projectScreen } from '../lib/screen-quad'
import type { DirectorFrame, Phase } from './frame'
import { resolvePhase } from './phase'
import { getPortal } from './portals'
import type { RoomMode } from './room-mode'
import { setRoomPhase } from './room-store'
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
 * A measured cat rect worth a button: on screen, and not blown up by bones
 * beside the camera (the cat passes the camera on both tracks).
 */
function isTarget(
	rect: { x: number; y: number; width: number; height: number },
	viewport: { width: number; height: number },
): boolean {
	return (
		rect.width <= viewport.width * 1.5 &&
		rect.height <= viewport.height * 1.5 &&
		rect.x < viewport.width &&
		rect.y < viewport.height &&
		rect.x + rect.width > 0 &&
		rect.y + rect.height > 0
	)
}

/**
 * The only per-frame owner (plan §3.3). Runs on the GSAP ticker after Lenis
 * and ScrollTrigger, only while a frame is needed, and leaves one cleared
 * frame behind when it idles so the last picture never lingers. The `room`
 * phase is the night room on the dive track; the `finale` phase the dawn
 * room on the pull-back, with the page shrinking back into the monitor.
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
		const rect =
			phase === 'room' || phase === 'finale' ? scene.measure().cat : null
		if (!rect || !isTarget(rect, timeline.viewport)) {
			proxy.style.display = 'none'
			return
		}
		proxy.style.display = 'block'
		proxy.style.transform = `translate(${rect.x.toFixed(1)}px, ${rect.y.toFixed(1)}px)`
		proxy.style.width = `${rect.width.toFixed(1)}px`
		proxy.style.height = `${rect.height.toFixed(1)}px`
	}

	const roomCamera = (aspect: number): CameraPose =>
		mode === 'full'
			? cameraAt('dive', timeline.dive, aspect)
			: liteHeroCamera(aspect)

	const finaleCamera = (aspect: number): CameraPose =>
		mode === 'full'
			? cameraAt('finale', timeline.finale, aspect)
			: liteFinaleCamera(aspect)

	const setPhase = (next: Phase) => {
		if (phase === next) return
		phase = next
		document.documentElement.dataset.roomPhase = next
		setRoomPhase(next)
	}

	const idle = () => {
		if (shown) {
			// One cleared frame, so the canvas is empty when it is shown again.
			scene.renderer.clear()
			showLayer(false)
		}
		// Off the stages the page is the page: the portals sit at identity.
		if (phase === 'inside') getPortal('dive')?.dock()
		getPortal('finale')?.dock()
		placeProxy()
		stop()
	}

	const tick = (_time: number, deltaMs: number) => {
		if (disposed) return
		setPhase(
			resolvePhase({
				mode,
				dive: timeline.dive,
				finale: timeline.finale,
				heroInView: timeline.heroInView,
				finaleInView: timeline.finaleInView,
			}),
		)
		if (phase !== 'room' && phase !== 'finale') {
			idle()
			return
		}
		const finale = phase === 'finale'
		const dt = Math.min(Math.max(deltaMs / 1000, 0), 0.1)
		const time = advance(clock, dt)
		const { width, height } = timeline.viewport
		const camera = finale
			? finaleCamera(width / height)
			: roomCamera(width / height)
		const frame: DirectorFrame = {
			phase,
			camera,
			time,
			dawn: finale
				? mode === 'full'
					? dawnFactor(timeline.finale)
					: 1
				: 0,
			dive: finale ? 0 : timeline.dive,
			viewport: timeline.viewport,
			pointer: timeline.pointer,
			pose: finale ? 'sleep' : 'sit',
			lookAt:
				!finale && timeline.pointer
					? unprojectPoint(
							[timeline.pointer.x, timeline.pointer.y],
							camera,
							width,
							height,
							POINTER_LOOK_DEPTH,
						)
					: null,
			// The first frame after idling: the pose switches without a blend.
			cut: !shown,
			stepped: false,
		}
		scene.render(frame, dt)
		// The page on the monitor: the portal follows the projected screen,
		// docking at the end of the dive and undocking at the start of the finale.
		if (mode === 'full') {
			const quad = projectScreen(camera, width, height)
			if (finale)
				getPortal('finale')?.apply(
					quad,
					finaleUndock(timeline.finale),
					width,
					height,
				)
			else getPortal('dive')?.apply(quad, timeline.dive, width, height)
		}
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
			delete document.documentElement.dataset.roomPhase
			setRoomPhase('off')
		},
	}
}
