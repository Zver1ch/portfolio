'use client'

import { useRef, useState } from 'react'
import { gsap, useGSAP } from '@/shared/lib/gsap/register'
import { cn } from '@/shared/lib/utils'
import {
	BoykisserCat,
	type BoykisserCatExpression,
} from '@/shared/ui/boykisser-cat/boykisser-cat'
import { prefersReducedMotion, stampHearts } from '../lib/stamp-hearts'
import { boop } from '../model/boop'

const LOVE_MS = 1100

export function BoopCat({
	className,
	catClassName,
	expression = 'idle',
	idle = true,
	trackPointer = false,
}: {
	className?: string
	catClassName?: string
	expression?: BoykisserCatExpression
	/** Pass false when the parent animates the cat's parts with GSAP. */
	idle?: boolean
	trackPointer?: boolean
}) {
	const buttonRef = useRef<HTMLButtonElement>(null)
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
	const [loving, setLoving] = useState(false)
	const [look, setLook] = useState({ x: 0, y: 0 })

	const { contextSafe } = useGSAP(
		() => {
			const clearTimer = () => clearTimeout(timer.current)
			if (!trackPointer) return clearTimer
			const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
			if (!fine.matches || prefersReducedMotion()) return clearTimer
			let frame = 0
			const onMove = (event: PointerEvent) => {
				cancelAnimationFrame(frame)
				frame = requestAnimationFrame(() => {
					const rect = buttonRef.current?.getBoundingClientRect()
					if (!rect) return
					const dx = event.clientX - (rect.left + rect.width / 2)
					const dy = event.clientY - (rect.top + rect.height * 0.4)
					setLook({
						x: Math.max(-1, Math.min(1, dx / 400)),
						y: Math.max(-1, Math.min(1, dy / 300)),
					})
				})
			}
			window.addEventListener('pointermove', onMove)
			return () => {
				clearTimer()
				cancelAnimationFrame(frame)
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
			aria-label='Погладить кота'
			onClick={onClick}
			className={cn(
				'relative block cursor-pointer rounded-[2rem] outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background',
				className,
			)}
		>
			<BoykisserCat
				expression={loving ? 'love' : expression}
				look={look}
				idle={idle}
				className={cn('h-auto w-full overflow-visible', catClassName)}
			/>
		</button>
	)
}
