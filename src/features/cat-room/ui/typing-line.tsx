'use client'

import { useEffect, useRef, useState } from 'react'
import { REDUCED_MOTION_QUERY } from '@/shared/config/motion'
import { playTick } from '@/shared/lib/sound/sfx'
import { cn } from '@/shared/lib/utils'
import { useInView } from '../lib/use-in-view'

const ERASE_MS = 55
const TYPE_MS = 95
const TYPE_JITTER_MS = 70

/**
 * The gibberish the cat types (plan §3.10). Server-rendered with the full
 * text, so it reads the same without JS; once on screen with motion
 * allowed it erases and types it again, like a paw walking over the keys.
 * Decorative: `aria-hidden`. A `cat-typing` event on `window` replays it.
 */
export function TypingLine({
	text = 'asdfghjkl',
	className,
}: {
	text?: string
	className?: string
}) {
	const line = useRef<HTMLSpanElement>(null)
	const { entered } = useInView(line, '0px')
	const [shown, setShown] = useState(text)
	// The caret blinks while nothing happens and holds steady while the paw types.
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		if (!entered) return
		if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return
		let timer = 0
		const run = () => {
			window.clearTimeout(timer)
			let length = text.length
			let phase: 'erase' | 'type' = 'erase'
			const step = () => {
				setBusy(true)
				if (phase === 'erase') {
					length -= 1
					setShown(text.slice(0, length))
					if (length === 0) phase = 'type'
					timer = window.setTimeout(step, ERASE_MS)
					return
				}
				length += 1
				setShown(text.slice(0, length))
				void playTick()
				if (length < text.length)
					timer = window.setTimeout(
						step,
						TYPE_MS + Math.random() * TYPE_JITTER_MS,
					)
				else setBusy(false)
			}
			timer = window.setTimeout(step, 400)
		}
		run()
		window.addEventListener('cat-typing', run)
		return () => {
			window.clearTimeout(timer)
			window.removeEventListener('cat-typing', run)
			setShown(text)
			setBusy(false)
		}
	}, [entered, text])

	return (
		<span
			ref={line}
			data-typing-line
			data-busy={busy ? '' : undefined}
			aria-hidden
			className={cn(
				'inline-block min-w-[10ch] text-right font-mono tracking-normal normal-case after:ml-px after:inline-block after:h-[1em] after:w-[0.5ch] after:translate-y-[0.15em] after:bg-rose/80 after:content-[""]',
				className,
			)}
		>
			{shown}
		</span>
	)
}
