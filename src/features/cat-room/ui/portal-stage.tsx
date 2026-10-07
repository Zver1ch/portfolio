'use client'

import { type ReactNode, useRef } from 'react'
import { pinEnd } from '@/shared/lib/gsap/ranges'
import { gsap, ScrollTrigger, useGSAP } from '@/shared/lib/gsap/register'
import { smoothstep } from '@/shared/lib/math/ease'
import { PHONE_TRAITS, usePhoneVariant } from '../config/phone-variant'
import {
	cameraAt,
	phoneCardProgress,
	phoneDiveCamera,
	type Track,
} from '../lib/camera-path'
import { createPortal, type Portal } from '../lib/portal'
import { projectColumn, projectScreen } from '../lib/screen-quad'
import { registerPortal } from '../model/portals'
import { useRoomMode } from '../model/room-mode'
import { timeline, touchTimeline } from '../model/timeline'

/** Pinned scroll length of each stage, in viewport heights (plan §3.4). */
const PIN_HEIGHTS: Record<Track, number> = { dive: 2.2, finale: 1.8 }
/** The hero copy fades over the first part of the dive; the phone variants' tracks are short, so theirs is quicker. */
const HERO_COPY_FADE = { default: 0.45, phone: 0.3 } as const

/** The hero copy fades out over the first stretch of the dive, in both modes. */
function fadeHeroCopy(
	section: HTMLElement,
	share: number,
): gsap.core.Tween | null {
	const copy = section.querySelector('[data-hero-copy]')
	if (!copy) return null
	return gsap.to(copy, {
		autoAlpha: 0,
		ease: 'none',
		scrollTrigger: {
			trigger: section,
			start: 'top top',
			end: () => `+=${Math.round(window.innerHeight * share)}`,
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
	const chosen = usePhoneVariant()
	// The phone variants (Gate 2 round 6) are lite's alone.
	const variant = mode === 'lite' ? chosen : 'default'
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

			/**
			 * The warp before the scene, the same maths the director uses: the
			 * hero's page onto the projected screen in full mode, onto the page
			 * column in the phone variants that show the real page (`b`, `c`).
			 */
			const warp = (page: Portal, progress: number) => {
				const { width, height } = timeline.viewport
				const aspect = width / height
				if (mode === 'full')
					page.apply(
						projectScreen(
							cameraAt('dive', progress, aspect),
							width,
							height,
						),
						progress,
						width,
						height,
					)
				else if (variant !== 'default')
					page.apply(
						projectColumn(
							phoneDiveCamera(variant, progress, aspect),
							width,
							height,
						),
						PHONE_TRAITS[variant].card
							? phoneCardProgress('dive', progress)
							: progress,
						width,
						height,
					)
				// At rest the stylesheet owns the veil, so its fade on the
				// first frame still runs; the inline value takes over in the dive.
				if (veil)
					veil.style.opacity =
						progress > 0
							? String(1 - smoothstep(0.6, 0.9, progress))
							: ''
			}
			const warps =
				track === 'dive' &&
				portal &&
				(mode === 'full' || PHONE_TRAITS[variant].domPage)
					? portal
					: null

			if (mode === 'full') {
				const write = (self: ScrollTrigger) => {
					timeline[track] = self.progress
					touchTimeline()
					if (warps) warp(warps, self.progress)
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
					if (warps) warp(warps, self.progress)
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
				const fade = fadeHeroCopy(
					section,
					variant === 'default'
						? HERO_COPY_FADE.default
						: HERO_COPY_FADE.phone,
				)
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
		{
			scope: stage,
			dependencies: [mode, track, variant],
			revertOnUpdate: true,
		},
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
