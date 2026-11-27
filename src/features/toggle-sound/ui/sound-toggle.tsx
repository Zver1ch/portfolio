'use client'

import { Volume2, VolumeX } from 'lucide-react'
import {
	setSoundEnabled,
	useSoundOptIn,
} from '@/shared/lib/sound/sound-enabled'
import { Button } from '@/shared/ui/button'

export function SoundToggle({ className }: { className?: string }) {
	// Opt-in, not the on-by-default flag: the ambient only plays after an
	// explicit choice, so an unchosen state must not read as sound on.
	const enabled = useSoundOptIn()

	return (
		<Button
			variant='ghost'
			size='icon'
			className={className}
			aria-pressed={enabled}
			aria-label='Sound'
			onClick={() => setSoundEnabled(!enabled)}
		>
			{enabled ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
		</Button>
	)
}
