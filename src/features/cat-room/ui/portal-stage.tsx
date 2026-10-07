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
import { timeline, touchTimeline } from '../model/timeline'

/** Pinned scroll length of each stage, in viewport heights (plan §3.4). */
const PIN_HEIGHTS: Record<Track, number> = { dive: 2.2, finale: 1.8 }
/** The hero copy fades over the first part of the dive. */
const HERO_COPY_FADE = 0.45

/** The hero copy fades out over the first stretch of the dive, in both modes. */
function fadeHeroCopy(section: HTMLElement): gsap.core.Tween | null {
	const copy = section.querySelector('[data-hero-copy]')
	if (!copy) return null
	return gsap.to(copy, {
		autoAlpha: 0,
		ease: 'none',
		scrollTrigger: {
			trigger: section,
			start: 'top top',
			end: () => `+=${Math.round(window.innerHeight * HERO_COPY_FADE)}`,
			scrub: true,
		},
	})
}

/**
 * A stage: the box the room's camera is tied to (plan §3.4). In full mode
 * it pins for the length of its track and writes the scroll progress to the
 * timeline. In lite mode nothing pins: the stage is taller than its portal
 * by a spacer, the portal sticks to the top of the viewport (CSS) under the
 * opaque canvas for that extra height, and the scroll through it is the
 * track's progress, so the mobile URL bar and touch momentum have nothing
 * to jump. The portal is registered for the director; in full mode the
 * hero's own scroll handler also warps it, so the dive works before the
 * scene has arrived.
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
				const write = (self: ScrollTrigger) => {
					timeline[track] = self.progress
					touchTimeline()
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
					// At rest the stylesheet owns the veil, so its fade on the
					// first frame still runs; the inline value takes over in the dive.
					if (veil)
						veil.style.opacity =
							self.progress > 0
								? String(
										1 - smoothstep(0.6, 0.9, self.progress),
									)
								: ''
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
			} else {
				// The track runs from the stage's top reaching the viewport's top
				// to the moment the stuck portal is released: the stage's height
				// beyond the portal's own.
				const write = (self: ScrollTrigger) => {
					timeline[track] = self.progress
					touchTimeline()
				}
				triggers.push(
					ScrollTrigger.create({
						trigger: element,
						start: 'top top',
						end: () =>
							`+=${Math.max(
								1,
								element.offsetHeight -
									(portalElement?.offsetHeight ?? 0),
							)}`,
						onUpdate: write,
						onRefresh: write,
					}),
				)
			}
			if (track === 'dive') {
				const fade = fadeHeroCopy(section)
				if (fade) tweens.push(fade)
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
