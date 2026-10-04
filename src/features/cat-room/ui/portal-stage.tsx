'use client'

import { type ReactNode, useRef } from 'react'
import { pinEnd } from '@/shared/lib/gsap/ranges'
import { gsap, ScrollTrigger, useGSAP } from '@/shared/lib/gsap/register'
import { smoothstep } from '@/shared/lib/math/ease'
import { cameraAt, type Track } from '../lib/camera-path'
import { createPortal } from '../lib/portal'
import { projectScreen } from '../lib/screen-quad'
import { registerPortal } from '../model/portals'
import { useRoomMode } from '../model/room-mode'
import { timeline } from '../model/timeline'

/** Pinned scroll length of each stage, in viewport heights (plan §3.4). */
const PIN_HEIGHTS: Record<Track, number> = { dive: 2.2, finale: 1.8 }
/** The hero copy fades over the first part of the dive. */
const HERO_COPY_FADE = 0.45
/** Lite mode pushes the camera a third of the way in while the hero scrolls out. */
const LITE_DIVE = 0.35

let scrollRestorationSet = false

/**
 * A stage: the box the room's camera is tied to (plan §3.4). In full mode
 * it pins for the length of its track and writes the scroll progress to the
 * timeline; in lite mode nothing pins and the layer fades instead. The
 * portal inside it is registered for the director; the hero's own scroll
 * handler also warps it, so the dive works before the scene has arrived.
 */
export function PortalStage({
	track,
	className,
	children,
}: {
	track: Track
	className?: string
	children: ReactNode
}) {
	const mode = useRoomMode()
	const stage = useRef<HTMLDivElement>(null)

	useGSAP(
		() => {
			const element = stage.current
			if (!element || mode === 'static') return
			const section = element.closest<HTMLElement>('section, footer')
			if (!section) return
			const portalElement =
				element.querySelector<HTMLElement>('[data-portal]')
			const portal = portalElement ? createPortal(portalElement) : null
			const unregister = portal ? registerPortal(track, portal) : () => {}
			const veil =
				element.querySelector<HTMLElement>('[data-loader-veil]')
			// Killed by hand on cleanup as well: a pin must never outlive its mode.
			const triggers: ScrollTrigger[] = []
			const tweens: gsap.core.Tween[] = []

			if (mode === 'full') {
				if (!scrollRestorationSet) {
					scrollRestorationSet = true
					history.scrollRestoration = 'manual'
					const onRefresh = () => {
						ScrollTrigger.removeEventListener('refresh', onRefresh)
						const hash = window.location.hash
						if (!hash) return
						try {
							document.querySelector(hash)?.scrollIntoView()
						} catch {
							// Not a selector; nothing to scroll to.
						}
					}
					ScrollTrigger.addEventListener('refresh', onRefresh)
				}
				const write = (self: ScrollTrigger) => {
					timeline[track] = self.progress
					if (track !== 'dive' || !portal) return
					// The warp before the scene: the same maths the director uses.
					const { width, height } = timeline.viewport
					portal.apply(
						projectScreen(
							cameraAt('dive', self.progress, width / height),
							width,
							height,
						),
						self.progress,
						width,
						height,
					)
					if (veil)
						veil.style.opacity = String(
							1 - smoothstep(0.6, 0.9, self.progress),
						)
				}
				triggers.push(
					ScrollTrigger.create({
						trigger: section,
						start: 'top top',
						end: pinEnd(PIN_HEIGHTS[track]),
						pin: element,
						anticipatePin: 1,
						onUpdate: write,
						onRefresh: write,
					}),
				)
				if (track === 'dive') {
					const copy = section.querySelector('[data-hero-copy]')
					if (copy)
						tweens.push(
							gsap.to(copy, {
								autoAlpha: 0,
								ease: 'none',
								scrollTrigger: {
									trigger: section,
									start: 'top top',
									end: () =>
										`+=${Math.round(window.innerHeight * HERO_COPY_FADE)}`,
									scrub: true,
								},
							}),
						)
				}
			} else if (track === 'dive') {
				// The poster box is the hero here; the canvas is gone by the time
				// it has scrolled out and the first section is uncovered.
				const slot = element.querySelector<HTMLElement>('[data-slot]')
				const write = (self: ScrollTrigger) => {
					timeline.dive = LITE_DIVE * self.progress
					timeline.layerOpacity =
						1 - smoothstep(0.15, 0.75, self.progress)
				}
				triggers.push(
					ScrollTrigger.create({
						trigger: slot ?? section,
						start: 'top top',
						end: 'bottom top',
						onUpdate: write,
						onRefresh: write,
					}),
				)
			} else {
				const write = (self: ScrollTrigger) => {
					timeline.layerOpacity = smoothstep(
						0.25,
						0.85,
						self.progress,
					)
				}
				triggers.push(
					ScrollTrigger.create({
						trigger: section,
						start: 'top bottom',
						end: 'bottom bottom',
						onUpdate: write,
						onRefresh: write,
					}),
				)
			}

			return () => {
				for (const tween of tweens) {
					tween.scrollTrigger?.kill(true)
					tween.kill()
				}
				for (const trigger of triggers) trigger.kill(true)
				unregister()
				portal?.dock()
				if (veil) veil.style.removeProperty('opacity')
				timeline[track] = 0
				timeline.layerOpacity = 1
			}
		},
		// Revert on every mode change: a pin from the full mode must not survive
		// a fall to static (useGSAP only reverts on unmount by default).
		{ scope: stage, dependencies: [mode, track], revertOnUpdate: true },
	)

	return (
		<div
			ref={stage}
			data-stage={track === 'dive' ? 'hero' : 'finale'}
			className={className}
		>
			{children}
		</div>
	)
}
