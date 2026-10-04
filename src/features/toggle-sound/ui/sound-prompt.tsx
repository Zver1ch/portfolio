'use client'

import { Volume2 } from 'lucide-react'
import {
	setSoundEnabled,
	useHasSoundChoice,
} from '@/shared/lib/sound/sound-enabled'
import { cn } from '@/shared/lib/utils'

/**
 * "Enable sound" (plan §3.12): shown until a choice is stored, in either
 * direction. The click is the explicit opt-in the ambient needs, and the
 * user gesture that lets the browser start the audio context.
 */
export function SoundPrompt({ className }: { className?: string }) {
	const chosen = useHasSoundChoice()
	if (chosen) return null
	return (
		<button
			type='button'
			data-sound-prompt
			onClick={() => setSoundEnabled(true)}
			className={cn(
				'flex items-center gap-1.5 rounded-full border border-border bg-ink-2/90 px-3.5 py-2 font-mono text-xs tracking-wide text-blush shadow-lg backdrop-blur-md transition-colors outline-none hover:text-snow focus-visible:ring-3 focus-visible:ring-ring',
				className,
			)}
		>
			<Volume2 aria-hidden className='size-3.5 text-rose' />
			Enable sound
		</button>
	)
}
