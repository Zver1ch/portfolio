import { playCatSound } from '@/shared/lib/sound/cat-sound'
import { incrementBoops } from './boop-store'

/** Call from a user gesture: plays the meow and bumps the persisted counter. */
export function boop(): number {
	playCatSound()
	return incrementBoops()
}
