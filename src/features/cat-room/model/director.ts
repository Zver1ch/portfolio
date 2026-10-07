import { gsap } from '@/shared/lib/gsap/register'
import { smoothstep } from '@/shared/lib/math/ease'
import type { Quad } from '@/shared/lib/math/homography'
import { type CameraPose, unprojectPoint } from '@/shared/lib/math/projection'
import { PHONE_TRAITS, type PhoneVariant } from '../config/phone-variant'
import { GAGS, OVERLAY, POINTER_LOOK_DEPTH } from '../config/tuning'
import {
	cameraAt,
	dawnFactor,
	finaleUndock,
	liteDiveCamera,
	liteFade,
	liteFinaleCamera,
	phoneCardProgress,
	phoneDiveCamera,
	phoneFinaleCamera,
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
import { dockedQuad } from '../lib/portal'
import type { Rect } from '../lib/scene/cat/cat'
import type { RoomScene } from '../lib/scene/create-room-scene'
import { advance } from '../lib/scene-time'
import { projectColumn, projectScreen } from '../lib/screen-quad'
import type { DirectorFrame, Phase } from './frame'
import { type PhaseInput, resolvePhase } from './phase'
import { getPortal } from './portals'
import type { RoomMode } from './room-mode'
import { landRoom, setRoomPhase } from './room-store'
import type { Timeline } from './timeline'

export type DirectorDeps = {
	scene: RoomScene
	timeline: Timeline
	mode: Exclude<RoomMode, 'static'>
	/** Lite mode's phone variant (Gate 2 round 6); the round-5 lite when absent. */
	variant?: PhoneVariant
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
	/** The layer changed size: the canvas follows in the next frame it draws (a resize clears it), at once while hidden. */
	resize(): void
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

/**
 * Where a lite portal's untransformed box sits in the viewport: `top: 0`
 * sticky inside its stage, so at the top until the stage's end pushes it up.
 */
function stuckTop(portal: HTMLElement): number {
	const stage = portal.parentElement
	if (!stage) return 0
	const rect = stage.getBoundingClientRect()
	return Math.max(rect.top, Math.min(0, rect.bottom - portal.offsetHeight))
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
 * Lite mode runs the same two tracks on its own cameras with the page
 * painted on the monitor, and crossfades the layer with the real page at
 * the end of the dive and the start of the finale instead of warping it.
 */
export function createDirector(deps: DirectorDeps): Director {
	const { scene, timeline, mode, layer, proxy, gagProxy, governor } = deps
	// The phone variants are lite's alone; full mode never branches on them.
	const variant: PhoneVariant =
		mode === 'lite' ? (deps.variant ?? 'default') : 'default'
	const traits = PHONE_TRAITS[variant]
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
	let pendingResize = false

	const showLayer = (visible: boolean) => {
		if (shown === visible) return
		shown = visible
		layer.style.visibility = visible ? 'visible' : 'hidden'
	}

	/** A resize clears the canvas: only under no drawn frame, before a render or while the layer is hidden. */
	const syncSize = () => {
		if (!pendingResize) return
		pendingResize = false
		scene.resize(
			timeline.viewport.width,
			timeline.viewport.height,
			governor.dpr,
		)
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

	/** Variant `c`: the page card of the last frame, in CSS px. */
	let card: Quad | null = null

	/** The card lies over most of the cat: no pet target through it. */
	const underCard = (rect: Rect): boolean => {
		if (!card) return false
		const xs = card.map((corner) => corner[0])
		const ys = card.map((corner) => corner[1])
		const width =
			Math.min(rect.x + rect.width, Math.max(...xs)) -
			Math.max(rect.x, Math.min(...xs))
		const height =
			Math.min(rect.y + rect.height, Math.max(...ys)) -
			Math.max(rect.y, Math.min(...ys))
		return (
			Math.max(0, width) * Math.max(0, height) >
			0.5 * rect.width * rect.height
		)
	}

	/**
	 * Variant `a`: the room lies under the page and the first section slides
	 * over it, so the proxy stops where that section begins; the credits are
	 * a sibling of the finale's stage and cover the cat the same way. Variant
	 * `c` hides the proxy while the card covers the cat.
	 */
	const uncovered = (rect: Rect | null): Rect | null => {
		if (!rect) return rect
		if (traits.card) return underCard(rect) ? null : rect
		if (!traits.backdrop) return rect
		const cover =
			phase === 'finale'
				? document.querySelector('[data-credits-roll]')
				: getPortal('dive')?.element
		if (!cover) return rect
		const bottom = Math.min(
			rect.y + rect.height,
			cover.getBoundingClientRect().top,
		)
		const height = bottom - rect.y
		return height < rect.height * 0.3 ? null : { ...rect, height }
	}

	const placeProxy = () => {
		placeRect(
			proxy,
			phase === 'room' || phase === 'finale'
				? uncovered(scene.measure().cat)
				: null,
		)
	}

	const roomCamera = (aspect: number): CameraPose =>
		mode === 'full'
			? cameraAt('dive', timeline.dive, aspect)
			: variant === 'default'
				? liteDiveCamera(timeline.dive, aspect)
				: phoneDiveCamera(variant, timeline.dive, aspect)

	const finaleCamera = (aspect: number): CameraPose =>
		mode === 'full'
			? cameraAt('finale', timeline.finale, aspect)
			: variant === 'default'
				? liteFinaleCamera(timeline.finale, aspect)
				: phoneFinaleCamera(variant, timeline.finale, aspect)

	/** Lite mode crossfades the layer with the page over each stage (plan §3.4); full mode and the phone variants never fade. */
	const layerOpacity = (finale: boolean): number =>
		mode === 'full' || variant !== 'default'
			? 1
			: finale
				? liteFade('finale', timeline.finale)
				: liteFade('dive', timeline.dive)

	/**
	 * The page on the monitor: in full mode the portal follows the projected
	 * screen, docking at the end of the dive and undocking at the start of
	 * the finale. Variants `b` and `c` do the same with the page column of
	 * the stuck section; `c` keeps the camera still and moves the card
	 * instead, with a hole in the canvas following it.
	 */
	const warpPage = (
		finale: boolean,
		camera: CameraPose,
		width: number,
		height: number,
	): DirectorFrame['hole'] => {
		if (mode !== 'full' && !traits.domPage) return undefined
		const quad =
			mode === 'full'
				? projectScreen(camera, width, height)
				: projectColumn(camera, width, height)
		const track = finale ? 'finale' : 'dive'
		const progress = traits.card
			? phoneCardProgress(track, timeline[track])
			: finale
				? finaleUndock(timeline.finale)
				: timeline.dive
		const portal = getPortal(track)
		// Lite's portal sticks instead of pinning: once its stage has scrolled
		// on (the credits pushing the finale up), its box is above the
		// viewport, and the quad is aimed from where the box is.
		const lift =
			mode === 'full' || !quad || !portal ? 0 : stuckTop(portal.element)
		portal?.apply(
			quad && lift
				? (quad.map(([x, y]) => [x, y - lift]) as unknown as Quad)
				: quad,
			progress,
			width,
			height,
		)
		if (!traits.card || !quad) return undefined
		return progress >= 1
			? [
					[0, 0],
					[width, 0],
					[width, height],
					[0, height],
				]
			: dockedQuad(quad, progress, width, height)
	}

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
		// Lite: the room leaves the first section only once the dive has landed.
		if (mode === 'lite' && phase === 'room' && next === 'off') landRoom()
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
		if (phase === 'inside' || traits.domPage) getPortal('dive')?.dock()
		getPortal('finale')?.dock()
		card = null
		placeProxy()
		placeRect(gagProxy, null)
		syncSize()
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
		syncSize()
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
		// Before the frame: the hole must match the card drawn in it.
		const hole = warpPage(finale, camera, width, height)
		card = hole ?? null
		const frame: DirectorFrame = {
			phase,
			camera,
			time,
			dawn: finale ? dawnFactor(timeline.finale) : 0,
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
			hole,
		}
		// A pixel-ratio change resizes, and so clears, the canvas: before the
		// frame, never after it (lite's opaque layer would flash its ink).
		syncSize()
		const dpr = governor.sample(dt)
		if (dpr !== null) scene.resize(width, height, dpr)
		scene.render(frame, dt)
		layer.style.opacity = String(layerOpacity(finale))
		showLayer(true)
		placeProxy()
		placeRect(gagProxy, null)
	}

	const teardown = () => {
		disposed = true
		stop()
		// The layer outlives the director (a mode switch brings a new one that
		// starts from "hidden"): leave it hidden and unfaded, or lite's opaque
		// ink would stay over the page until a stage draws again.
		layer.style.visibility = 'hidden'
		layer.style.removeProperty('opacity')
		shown = false
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
		resize() {
			pendingResize = true
			if (shown) start()
			else syncSize()
		},
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
