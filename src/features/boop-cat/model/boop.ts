import { useEffect } from 'react'
import {
	playCatSound,
	prefetchCatSoundWhenIdle,
} from '@/shared/lib/sound/cat-sound'
import { useSoundEnabled } from '@/shared/lib/sound/sound-enabled'
import { incrementBoops } from './boop-store'

/** Call from a user gesture: plays the meow and bumps the persisted counter. */
export function boop(): number {
	playCatSound()
	return incrementBoops()
}

/**
 * Fetches and decodes the meow at an idle moment after hydration while
 * sound is on, so the first boop plays it at once.
 */
export function usePrefetchMeow(): void {
	const enabled = useSoundEnabled()
	useEffect(
		() => (enabled ? prefetchCatSoundWhenIdle() : undefined),
		[enabled],
	)
}
