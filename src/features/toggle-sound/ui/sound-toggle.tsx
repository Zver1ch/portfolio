'use client'

import { Volume2, VolumeX } from 'lucide-react'
import {
	setSoundEnabled,
	useSoundEnabled,
} from '@/shared/lib/sound/sound-enabled'
import { Button } from '@/shared/ui/button'

export function SoundToggle({ className }: { className?: string }) {
	const enabled = useSoundEnabled()

	return (
		<Button
			variant='ghost'
			size='icon'
			className={className}
			aria-pressed={enabled}
			aria-label={enabled ? 'Выключить звук' : 'Включить звук'}
			onClick={() => setSoundEnabled(!enabled)}
		>
			{enabled ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
		</Button>
	)
}
