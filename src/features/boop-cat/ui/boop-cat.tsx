'use client'

import { useRef, useState } from 'react'
import { gsap, ScrollTrigger, useGSAP } from '@/shared/lib/gsap/register'
import { cn } from '@/shared/lib/utils'
import {
	BoykisserCat,
	type BoykisserCatExpression,
} from '@/shared/ui/boykisser-cat/boykisser-cat'
import { prefersReducedMotion, stampHearts } from '../lib/stamp-hearts'
import { boop } from '../model/boop'

const LOVE_MS = 1100
/** How far the pupils may travel inside the eye, in viewBox units. */
const GAZE_RANGE = 2.5

export function BoopCat({
	className,
	catClassName,
	expression = 'idle',
	idle = true,
	trackPointer = false,
	label = 'Погладить кота',
	decorative = false,
}: {
	className?: string
	catClassName?: string
	expression?: BoykisserCatExpression
	/** Pass false when the parent animates the cat's parts with GSAP. */
	idle?: boolean
	trackPointer?: boolean
	label?: string
	/**
	 * Pointer-only clickable, skipped by keyboard and screen readers.
	 * One labelled cat per page is enough in the tab order.
	 */
	decorative?: boolean
}) {
	const buttonRef = useRef<HTMLButtonElement>(null)
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
	const [loving, setLoving] = useState(false)

	const { contextSafe } = useGSAP(
		() => {
			const clearTimer = () => clearTimeout(timer.current)
			const button = buttonRef.current
			if (!trackPointer || !button) return clearTimer
			const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
			if (!fine.matches || prefersReducedMotion()) return clearTimer

			// Pupils move through GSAP, so a pointer move never re-renders the cat.
			const pupils = button.querySelectorAll('[data-part^="pupil-"]')
			const toX = gsap.quickTo(pupils, 'x', { duration: 0.3 })
			const toY = gsap.quickTo(pupils, 'y', { duration: 0.3 })
			let onScreen = false
			ScrollTrigger.create({
				trigger: button,
				start: 'top bottom',
				end: 'bottom top',
				onToggle: ({ isActive }) => {
					onScreen = isActive
					if (!isActive) {
						toX(0)
						toY(0)
					}
				},
			})
			const onMove = (event: PointerEvent) => {
				if (!onScreen) return
				const rect = button.getBoundingClientRect()
				const x = gsap.utils.clamp(
					-1,
					1,
					(event.clientX - (rect.left + rect.width / 2)) / 400,
				)
				const y = gsap.utils.clamp(
					-1,
					1,
					(event.clientY - (rect.top + rect.height * 0.4)) / 300,
				)
				const length = Math.hypot(x, y)
				const unit = length > 1 ? 1 / length : 1
				toX(x * unit * GAZE_RANGE)
				toY(y * unit * GAZE_RANGE)
			}
			window.addEventListener('pointermove', onMove, { passive: true })
			return () => {
				clearTimer()
				window.removeEventListener('pointermove', onMove)
			}
		},
		{ scope: buttonRef, dependencies: [trackPointer] },
	)

	const onClick = contextSafe(() => {
		boop()
		const button = buttonRef.current
		if (button) {
			const rect = button.getBoundingClientRect()
			stampHearts({
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height * 0.35,
			})
		}
		setLoving(true)
		clearTimeout(timer.current)
		timer.current = setTimeout(() => setLoving(false), LOVE_MS)
		if (button && !prefersReducedMotion()) {
			gsap.timeline()
				.to(button, {
					scaleY: 0.9,
					scaleX: 1.05,
					duration: 0.1,
					transformOrigin: '50% 100%',
				})
				.to(button, {
					scale: 1,
					duration: 0.7,
					ease: 'elastic.out(1.1, 0.4)',
				})
		}
	})

	return (
		<button
			ref={buttonRef}
			type='button'
			aria-label={decorative ? undefined : label}
			aria-hidden={decorative || undefined}
			tabIndex={decorative ? -1 : undefined}
			onClick={onClick}
			className={cn(
				'relative block cursor-pointer rounded-[2rem] outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background',
				className,
			)}
		>
			<BoykisserCat
				expression={loving ? 'love' : expression}
				idle={idle}
				className={cn('h-auto w-full overflow-visible', catClassName)}
			/>
		</button>
	)
}
