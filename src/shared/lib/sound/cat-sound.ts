import { CAT_SOUND_SRC } from '@/shared/config/sounds'
import { getSoundEnabled } from './sound-enabled'

const MAX_VOICES = 4
const MIN_RATE = 0.92
const MAX_RATE = 1.12

type WindowWithWebkitAudio = Window & {
	webkitAudioContext?: typeof AudioContext
}

let context: AudioContext | undefined
let buffer: Promise<AudioBuffer | null> | undefined
let voices = 0

function getContext(): AudioContext | undefined {
	if (!context) {
		const Ctor =
			window.AudioContext ??
			(window as WindowWithWebkitAudio).webkitAudioContext
		if (!Ctor) return undefined
		context = new Ctor()
	}
	return context
}

function loadBuffer(audio: AudioContext): Promise<AudioBuffer | null> {
	buffer ??= fetch(CAT_SOUND_SRC)
		.then((response) => {
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			return response.arrayBuffer()
		})
		.then((data) => audio.decodeAudioData(data))
		.catch((error: unknown) => {
			console.warn(
				`[звук] Не удалось загрузить звук кота (${CAT_SOUND_SRC}). Положите файл в public${CAT_SOUND_SRC} — до тех пор клики будут без звука.`,
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
		const audio = getContext()
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
