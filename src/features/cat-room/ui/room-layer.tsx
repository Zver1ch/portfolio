'use client'

import { useEffect, useRef } from 'react'
import { playChomp, playPlop } from '@/shared/lib/sound/sfx'
import { CAT_GLB } from '../config/cat-rig.gen'
import { DPR_CAP, ROOM_LOAD } from '../config/tuning'
import { createDprGovernor } from '../lib/dpr-governor'
import { loadRoomScene } from '../lib/load-room-scene'
import type { RoomScene } from '../lib/scene/create-room-scene'
import { isBoopClick } from '../lib/tap-gesture'
import { createDirector, type Director } from '../model/director'
import { onFeedRequest } from '../model/feed-bus'
import { useRoomMode } from '../model/room-mode'
import {
	failRoom,
	roomReady,
	setRoomProgress,
	startRoom,
	useRoomState,
} from '../model/room-store'
import { onTimelineTouch, timeline } from '../model/timeline'
import { GagProxy } from './gag-proxy'
import { type PetOrigin, PetProxy } from './pet-proxy'

/** A tap on any of these is not a request for a fish (plan §3.10). */
const NO_FISH =
	'a, button, input, select, textarea, label, summary, [data-no-fish], [data-pet-proxy], [data-gag-proxy]'
/** Sections whose arrival in the middle of the viewport may start a gag. */
const SECTIONS = 'main section[id], [data-manifesto]'

/**
 * The fixed transparent canvas above the page (plan §3.2, §3.11). Decides
 * the mode, writes it on <html>, loads the scene chunk and the model with
 * progress, hands the frames to the director and degrades to the static
 * page on any failure. The canvas is created imperatively inside the effect,
 * so StrictMode's double mount gets a fresh one each time.
 */
export function RoomLayer({ onPet }: { onPet: (origin: PetOrigin) => void }) {
	const mode = useRoomMode()
	const { status } = useRoomState()
	const layerRef = useRef<HTMLDivElement>(null)
	const proxyRef = useRef<HTMLButtonElement>(null)
	const gagProxyRef = useRef<HTMLButtonElement>(null)
	const sceneRef = useRef<RoomScene | null>(null)

	useEffect(() => {
		document.documentElement.dataset.roomMode = mode
	}, [mode])

	useEffect(() => {
		const layer = layerRef.current
		if (mode === 'static' || !layer) return
		const html = document.documentElement
		let cancelled = false
		let director: Director | null = null
		let timeout = 0

		const canvas = document.createElement('canvas')
		canvas.className = 'block size-full'
		layer.append(canvas)
		const size = () => ({
			width: layer.clientWidth || window.innerWidth,
			height: layer.clientHeight || window.innerHeight,
		})
		timeline.viewport = size()
		const governor = createDprGovernor(
			Math.min(window.devicePixelRatio || 1, DPR_CAP[mode]),
		)

		const fail = (reason: string) => {
			if (!cancelled) failRoom(reason)
		}
		const onContextLost = (event: Event) => {
			event.preventDefault()
			fail('context lost')
		}
		canvas.addEventListener('webglcontextlost', onContextLost)

		// The stages on screen decide the phase; any change wakes the director.
		const stages = [
			['hero', document.querySelector('[data-stage="hero"]')],
			['finale', document.querySelector('[data-stage="finale"]')],
		] as const
		const inView = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				for (const [name, element] of stages) {
					if (entry.target !== element) continue
					if (name === 'hero')
						timeline.heroInView = entry.isIntersecting
					else timeline.finaleInView = entry.isIntersecting
				}
			}
			director?.wake()
		})
		for (const [, element] of stages) if (element) inView.observe(element)

		// A stage's scroll handler wrote the timeline: the director may be idle.
		const untouch = onTimelineTouch(() => director?.wake())

		// Gags (plan §3.10): a section crossing the middle of the viewport may
		// start one; a tap on an empty area of the page or the header button
		// drops a fish; Escape stops them.
		const sections = document.querySelectorAll(SECTIONS)
		const entries = new IntersectionObserver(
			(list) => {
				if (list.some((entry) => entry.isIntersecting))
					director?.enterSection()
			},
			{ rootMargin: '-40% 0px -40% 0px' },
		)
		for (const section of sections) entries.observe(section)
		const main = document.querySelector('main')
		const feed = (drop: { x: number; y: number }) => {
			if (director?.feed(drop)) void playPlop()
		}
		let press: { x: number; y: number } | null = null
		const onPointerDown = (event: PointerEvent) => {
			press =
				event.button === 0
					? { x: event.clientX, y: event.clientY }
					: null
		}
		const onPointerUp = (event: PointerEvent) => {
			const start = press
			press = null
			if (!start) return
			const travel = Math.hypot(
				event.clientX - start.x,
				event.clientY - start.y,
			)
			if (!isBoopClick(travel)) return
			const target = event.target instanceof Element ? event.target : null
			if (target?.closest(NO_FISH)) return
			if (window.getSelection()?.isCollapsed === false) return
			feed({ x: event.clientX, y: event.clientY })
		}
		main?.addEventListener('pointerdown', onPointerDown)
		main?.addEventListener('pointerup', onPointerUp)
		const unfeed = onFeedRequest((drop) =>
			feed(
				drop ?? {
					x: timeline.viewport.width * 0.72,
					y: timeline.viewport.height * 0.35,
				},
			),
		)
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') director?.cancelGags()
		}
		window.addEventListener('keydown', onKeyDown)

		const resize = new ResizeObserver(() => {
			timeline.viewport = size()
			sceneRef.current?.resize(
				timeline.viewport.width,
				timeline.viewport.height,
				governor.dpr,
			)
			director?.wake()
		})
		resize.observe(layer)

		const onPointerMove = (event: PointerEvent) => {
			timeline.pointer = { x: event.clientX, y: event.clientY }
		}
		const onPointerOut = (event: PointerEvent) => {
			if (!event.relatedTarget) timeline.pointer = null
		}
		const onVisibility = () => {
			if (document.hidden) director?.stop()
			else director?.wake()
		}
		window.addEventListener('pointermove', onPointerMove, { passive: true })
		window.addEventListener('pointerout', onPointerOut)
		document.addEventListener('visibilitychange', onVisibility)

		const build = async () => {
			startRoom()
			timeout = window.setTimeout(
				() => fail('timeout'),
				ROOM_LOAD.timeoutMs,
			)
			const module = await loadRoomScene()
			if (cancelled) return
			setRoomProgress(0.3)
			const { width, height } = timeline.viewport
			const scene = await module.createRoomScene({
				canvas,
				width,
				height,
				dpr: governor.dpr,
				fakeScreen: mode === 'lite',
				modelUrl: `${CAT_GLB.url}?v=${CAT_GLB.sha256}`,
				onProgress: (fraction) => setRoomProgress(0.3 + fraction * 0.6),
			})
			if (cancelled) {
				scene.dispose()
				return
			}
			sceneRef.current = scene
			setRoomProgress(0.9)
			director = createDirector({
				scene,
				timeline,
				mode,
				layer,
				proxy: proxyRef.current,
				gagProxy: gagProxyRef.current,
				governor,
				onFishCaught: () => void playChomp(),
				onFirstFrame: () => {
					window.clearTimeout(timeout)
					roomReady()
					html.dataset.sceneReady = 'true'
				},
			})
		}
		const start = () => {
			build().catch((error: unknown) =>
				fail(error instanceof Error ? error.message : String(error)),
			)
		}

		// Full mode loads at an idle moment after hydration; lite only once a
		// stage is within reach of the viewport (plan §3.11).
		let cancelSchedule = () => {}
		if (mode === 'full') {
			if (typeof window.requestIdleCallback === 'function') {
				const id = window.requestIdleCallback(start, { timeout: 2000 })
				cancelSchedule = () => window.cancelIdleCallback(id)
			} else {
				const id = window.setTimeout(start, 50)
				cancelSchedule = () => window.clearTimeout(id)
			}
		} else {
			const targets = stages.map(([, element]) => element).filter(Boolean)
			if (targets.length === 0) start()
			else {
				const near = new IntersectionObserver(
					(entries) => {
						if (!entries.some((entry) => entry.isIntersecting))
							return
						near.disconnect()
						start()
					},
					{ rootMargin: `${ROOM_LOAD.nearPx}px` },
				)
				for (const element of targets)
					if (element) near.observe(element)
				cancelSchedule = () => near.disconnect()
			}
		}

		return () => {
			cancelled = true
			cancelSchedule()
			window.clearTimeout(timeout)
			canvas.removeEventListener('webglcontextlost', onContextLost)
			inView.disconnect()
			untouch()
			entries.disconnect()
			main?.removeEventListener('pointerdown', onPointerDown)
			main?.removeEventListener('pointerup', onPointerUp)
			unfeed()
			window.removeEventListener('keydown', onKeyDown)
			resize.disconnect()
			window.removeEventListener('pointermove', onPointerMove)
			window.removeEventListener('pointerout', onPointerOut)
			document.removeEventListener('visibilitychange', onVisibility)
			director?.dispose()
			director = null
			sceneRef.current?.dispose()
			sceneRef.current = null
			canvas.remove()
			delete html.dataset.sceneReady
		}
	}, [mode])

	return (
		<>
			<div
				ref={layerRef}
				data-room-layer
				aria-hidden
				className='pointer-events-none fixed inset-x-0 top-0 z-30 h-lvh'
				style={{ visibility: 'hidden' }}
			/>
			{mode !== 'static' ? (
				<>
					<PetProxy
						ref={proxyRef}
						disabled={status !== 'ready'}
						onPet={(origin) => {
							onPet(origin)
							sceneRef.current?.trigger({ type: 'pet' })
						}}
					/>
					<GagProxy
						ref={gagProxyRef}
						onPet={(origin) => {
							onPet(origin)
							sceneRef.current?.trigger({ type: 'pet' })
						}}
					/>
				</>
			) : null}
		</>
	)
}
