import { CAT_SOUND_SRC } from '@/shared/config/sounds'
import { getAudioContext } from './audio-context'
import { getSoundEnabled } from './sound-enabled'

const MAX_VOICES = 4
const MIN_RATE = 0.92
const MAX_RATE = 1.12

let buffer: Promise<AudioBuffer | null> | undefined
let voices = 0

function loadBuffer(audio: AudioContext): Promise<AudioBuffer | null> {
	buffer ??= fetch(CAT_SOUND_SRC)
		.then((response) => {
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			return response.arrayBuffer()
		})
		.then((data) => audio.decodeAudioData(data))
		.catch((error: unknown) => {
			console.warn(
				`[sound] Could not load the cat sound (${CAT_SOUND_SRC}). Put the file at public${CAT_SOUND_SRC}; until then clicks stay silent.`,
				error,
			)
			return null
		})
	return buffer
}

export type PlayCatSoundOptions = {
	/** 0..1, defaults to 0.6. */
	volume?: number
}

/**
 * Call from a user gesture: the AudioContext is created on the first call.
 * Never throws; a missing file is reported once and then stays silent.
 */
export async function playCatSound(
	options: PlayCatSoundOptions = {},
): Promise<void> {
	if (typeof window === 'undefined' || !getSoundEnabled()) return
	try {
		const audio = getAudioContext()
		if (!audio) return
		if (audio.state === 'suspended') audio.resume().catch(() => {})
		const decoded = await loadBuffer(audio)
		if (!decoded || voices >= MAX_VOICES || !getSoundEnabled()) return

		const source = audio.createBufferSource()
		source.buffer = decoded
		source.playbackRate.value =
			MIN_RATE + Math.random() * (MAX_RATE - MIN_RATE)
		const gain = audio.createGain()
		gain.gain.value = Math.max(0, Math.min(1, options.volume ?? 0.6))
		source.connect(gain).connect(audio.destination)

		voices += 1
		source.onended = () => {
			voices -= 1
			source.disconnect()
			gain.disconnect()
		}
		source.start()
	} catch {
		// Audio is decorative: a failing device must not break the click handler.
	}
}
