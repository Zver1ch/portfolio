import { gsap } from '@/shared/lib/gsap/register'
import { smoothstep } from '@/shared/lib/math/ease'
import { type CameraPose, unprojectPoint } from '@/shared/lib/math/projection'
import { GAGS, OVERLAY, POINTER_LOOK_DEPTH } from '../config/tuning'
import {
	cameraAt,
	dawnFactor,
	finaleUndock,
	liteFinaleCamera,
	liteHeroCamera,
} from '../lib/camera-path'
import type { DprGovernor } from '../lib/dpr-governor'
import { createFish, type Fish, stepFish } from '../lib/fish'
import {
	createGagState,
	endGag,
	maybeType,
	onSectionEntry,
	requestFish,
	cancelGags as silenceGags,
	tickGags,
} from '../lib/gags'
import {
	type OverlayPlacement,
	overlayScale,
	overlayToWorld,
	risingPlacement,
} from '../lib/overlay'
import type { Rect } from '../lib/scene/cat/cat'
import type { RoomScene } from '../lib/scene/create-room-scene'
import { advance } from '../lib/scene-time'
import { projectScreen } from '../lib/screen-quad'
import type { DirectorFrame, Phase } from './frame'
import { type PhaseInput, resolvePhase } from './phase'
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
	/** The pointer-only button kept over a peeking head. */
	gagProxy: HTMLElement | null
	governor: DprGovernor
	/** The animation frame after the first render. */
	onFirstFrame(): void
	/** The per-frame tick threw; the director has already disposed itself. */
	onError?(error: unknown): void
	/** A fish was snatched (the chomp, plan §3.12). */
	onFishCaught?(): void
	/** Wall-clock seconds for the gag scheduler; injectable for tests. */
	now?(): number
	seed?: number
}

export type Director = {
	/** Resume ticking after something changed (scroll, resize, visibility). */
	wake(): void
	stop(): void
	dispose(): void
	readonly phase: Phase
	/** A section came on screen: maybe a peek (full mode, inside the monitor). */
	enterSection(): void
	/** Drop a fish at a viewport point; false when no fish can fall right now. */
	feed(drop: { x: number; y: number }): boolean
	/** Escape: stop the current gag and silence automatic ones for a while. */
	cancelGags(): void
}

/** What a peeking head must not land on (plan §3.10). */
const INTERACTIVE =
	'a, button, input, select, textarea, label, summary, [role="button"], [tabindex]:not([tabindex="-1"])'

/**
 * A measured cat rect worth a button: on screen, and not blown up by bones
 * beside the camera (the cat passes the camera on both tracks).
 */
function isTarget(
	rect: Rect,
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

/** Rise over `rise` seconds, hold, sink over the last `rise` seconds. */
function riseEnvelope(elapsed: number, duration: number, rise: number): number {
	return Math.min(
		smoothstep(0, rise, elapsed),
		1 - smoothstep(duration - rise, duration, elapsed),
	)
}

/**
 * The only per-frame owner (plan §3.3). Runs on the GSAP ticker after Lenis
 * and ScrollTrigger, only while a frame is needed, and leaves one cleared
 * frame behind when it idles so the last picture never lingers. The `room`
 * phase is the night room on the dive track; the `finale` phase the dawn
 * room on the pull-back with the page shrinking back into the monitor, the
 * cat sitting as before (the sleeping cat went at Gate 2, round 3);
 * `inside` draws nothing but the gags of plan §3.10, through the overlay.
 */
export function createDirector(deps: DirectorDeps): Director {
	const { scene, timeline, mode, layer, proxy, gagProxy, governor } = deps
	const html = document.documentElement
	const clock = { current: 0 }
	const wall = deps.now ?? (() => performance.now() / 1000)
	const gags = createGagState(deps.seed)
	let fish: Fish | null = null
	let fishHeldAt: number | null = null
	/** Wall time of the last gag frame: the fish falls on the same clock as the envelopes. */
	let lastGagTick = 0
	let fishCount = 0
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

	const placeRect = (element: HTMLElement | null, rect: Rect | null) => {
		if (!element) return
		if (!rect || !isTarget(rect, timeline.viewport)) {
			element.style.display = 'none'
			return
		}
		element.style.display = 'block'
		element.style.transform = `translate(${rect.x.toFixed(1)}px, ${rect.y.toFixed(1)}px)`
		element.style.width = `${rect.width.toFixed(1)}px`
		element.style.height = `${rect.height.toFixed(1)}px`
	}

	const placeProxy = () => {
		placeRect(
			proxy,
			phase === 'room' || phase === 'finale' ? scene.measure().cat : null,
		)
	}

	const roomCamera = (aspect: number): CameraPose =>
		mode === 'full'
			? cameraAt('dive', timeline.dive, aspect)
			: liteHeroCamera(aspect)

	const finaleCamera = (aspect: number): CameraPose =>
		mode === 'full'
			? cameraAt('finale', timeline.finale, aspect)
			: liteFinaleCamera(aspect)

	const phaseInput = (): PhaseInput => ({
		mode,
		dive: timeline.dive,
		finale: timeline.finale,
		heroInView: timeline.heroInView,
		finaleInView: timeline.finaleInView,
	})

	const setGagAttribute = (kind: string | null) => {
		if (kind) html.dataset.roomGag = kind
		else delete html.dataset.roomGag
	}

	/** Forget the running gag without a silence (the phase moved on, or it is over). */
	const clearGag = (now: number) => {
		endGag(gags, now)
		fish = null
		fishHeldAt = null
		placeRect(gagProxy, null)
		setGagAttribute(null)
	}

	const setPhase = (next: Phase) => {
		if (phase === next) return
		phase = next
		html.dataset.roomPhase = next
		setRoomPhase(next)
		if (next !== 'inside' && gags.active) clearGag(wall())
	}

	/** The visual reset: a cleared frame, the layer hidden, the page at identity, no buttons. */
	const park = () => {
		if (shown) {
			// One cleared frame, so the canvas is empty when it is shown again.
			scene.renderer.clear()
			showLayer(false)
		}
		if (phase === 'inside') getPortal('dive')?.dock()
		getPortal('finale')?.dock()
		placeProxy()
		placeRect(gagProxy, null)
	}

	const idle = () => {
		park()
		stop()
	}

	/** The typing line is on screen, so a peek may end at the keyboard. */
	const typingLineVisible = () => {
		const line = document.querySelector('[data-typing-line]')
		if (!line) return false
		const rect = line.getBoundingClientRect()
		return (
			rect.width > 0 &&
			rect.bottom > 0 &&
			rect.top < timeline.viewport.height
		)
	}

	/** A peeking head at this share of the width would cover nothing interactive. */
	const headIsFree = (xShare: number): boolean => {
		const { width, height } = timeline.viewport
		const scale = overlayScale(height)
		const x = xShare * width
		const y = height - GAGS.peek.show * 0.5 * scale
		if (typeof document.elementFromPoint !== 'function') return true
		for (const dx of [-0.08, 0, 0.08]) {
			const element = document.elementFromPoint(x + dx * scale, y)
			if (element?.closest(INTERACTIVE)) return false
		}
		return true
	}

	const overlayFrame = (
		placement: OverlayPlacement,
		time: number,
		pose: DirectorFrame['pose'],
		reach: DirectorFrame['reach'],
		fishState: DirectorFrame['fish'],
	): DirectorFrame => {
		const { width, height } = timeline.viewport
		return {
			phase: 'inside',
			camera: roomCamera(width / height),
			time,
			dawn: 0,
			dive: 0,
			viewport: timeline.viewport,
			pointer: timeline.pointer,
			pose,
			lookAt: timeline.pointer
				? overlayToWorld(timeline.pointer, placement, OVERLAY.lookDepth)
				: null,
			cut: !shown,
			overlay: placement,
			reach,
			fish: fishState,
			stepped: false,
		}
	}

	/** Inside the monitor: draws the running gag, keeps time for a DOM-only one, or has nothing to do. */
	const runGags = (dt: number): 'drawn' | 'ticking' | 'idle' => {
		const now = wall()
		const ended = tickGags(gags, now)
		if (ended) {
			fish = null
			fishHeldAt = null
			if (maybeType(gags, now, ended, typingLineVisible()))
				window.dispatchEvent(new Event('cat-typing'))
		}
		const gag = gags.active
		setGagAttribute(gag?.kind ?? null)
		if (!gag) return 'idle'
		if (gag.kind === 'typing') return 'ticking'
		const elapsed = now - gag.startedAt
		const wallDt = Math.min(Math.max(now - lastGagTick, 0), 0.1)
		lastGagTick = now
		const { width, height } = timeline.viewport
		const time = advance(clock, dt)
		let frame: DirectorFrame
		if (gag.kind === 'peek') {
			const placement = risingPlacement(
				gag.xShare,
				riseEnvelope(elapsed, gag.duration, GAGS.peek.rise),
				GAGS.peek.show,
				timeline.viewport,
			)
			frame = overlayFrame(placement, time, 'peek', null, null)
		} else {
			const { rise, hold, sink, show, catchAbove } = GAGS.fish
			const scale = overlayScale(height)
			fish = stepFish(
				fish ?? createFish(gag.drop ?? { x: gag.xShare * width, y: 0 }),
				wallDt,
				height - catchAbove * scale,
			)
			// The fish waits on the catch line until the paw is up there.
			if (fish.caught && elapsed >= rise && fishHeldAt === null) {
				fishHeldAt = now
				fishCount += 1
				html.dataset.fishCount = String(fishCount)
				deps.onFishCaught?.()
			}
			const sinceHeld = fishHeldAt === null ? -1 : now - fishHeldAt
			if (sinceHeld >= hold + sink) {
				clearGag(now)
				return 'idle'
			}
			const up =
				sinceHeld < hold
					? smoothstep(0, rise, elapsed)
					: 1 - smoothstep(hold, hold + sink, sinceHeld)
			const placement = risingPlacement(
				gag.xShare,
				up,
				show,
				timeline.viewport,
			)
			const position = overlayToWorld(fish, placement, OVERLAY.depth)
			const held = fishHeldAt !== null
			frame = overlayFrame(
				placement,
				time,
				'reach',
				held ? null : position,
				{ position, held },
			)
		}
		scene.render(frame, dt)
		layer.style.opacity = '1'
		showLayer(true)
		placeRect(gagProxy, gag.kind === 'peek' ? scene.measure().head : null)
		return 'drawn'
	}

	/** The room on its stage: the night room on the dive, the dawn room on the pull-back. */
	const renderStage = (dt: number) => {
		const finale = phase === 'finale'
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
			// The first frame after idling: the pose switches without a blend.
			cut: !shown,
			overlay: null,
			reach: null,
			fish: null,
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
		placeRect(gagProxy, null)
		const dpr = governor.sample(dt)
		if (dpr !== null) scene.resize(width, height, dpr)
	}

	const teardown = () => {
		disposed = true
		stop()
		if (proxy) proxy.style.display = 'none'
		if (gagProxy) gagProxy.style.display = 'none'
		delete html.dataset.roomPhase
		delete html.dataset.roomGag
		delete html.dataset.fishCount
		setRoomPhase('off')
	}

	const step = (deltaMs: number) => {
		setPhase(resolvePhase(phaseInput()))
		const dt = Math.min(Math.max(deltaMs / 1000, 0), 0.1)
		if (phase === 'inside') {
			const result = mode === 'full' ? runGags(dt) : 'idle'
			if (result === 'idle') {
				idle()
				return
			}
			if (result === 'ticking') {
				park()
				return
			}
		} else if (phase === 'room' || phase === 'finale') {
			renderStage(dt)
		} else {
			idle()
			return
		}
		if (firstFrame) {
			firstFrame = false
			requestAnimationFrame(() => {
				if (!disposed) deps.onFirstFrame()
			})
		}
	}

	const tick = (_time: number, deltaMs: number) => {
		if (disposed) return
		try {
			step(deltaMs)
		} catch (error) {
			// A frame that throws would throw again on the next one: stop the
			// loop here and let the layer degrade to static.
			teardown()
			deps.onError?.(error)
		}
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
		enterSection() {
			// Resolve afresh: the stage observers may not have ticked yet.
			if (disposed || mode !== 'full') return
			if (resolvePhase(phaseInput()) !== 'inside') return
			const now = wall()
			if (onSectionEntry(gags, now, headIsFree)) {
				lastGagTick = now
				start()
			}
		},
		feed(drop) {
			if (disposed || mode !== 'full') return false
			if (resolvePhase(phaseInput()) !== 'inside') return false
			const now = wall()
			requestFish(gags, now, drop, timeline.viewport.width)
			fish = null
			fishHeldAt = null
			lastGagTick = now
			start()
			return true
		},
		cancelGags() {
			if (disposed) return
			silenceGags(gags, wall())
			fish = null
			fishHeldAt = null
			placeRect(gagProxy, null)
			setGagAttribute(null)
			start()
		},
		dispose: teardown,
	}
}
