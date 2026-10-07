import { CAT_SOUND_SRC } from '@/shared/config/sounds'
import { getAudioContext, peekAudioContext } from './audio-context'
import { getSoundEnabled } from './sound-enabled'

const MAX_VOICES = 4
const MIN_RATE = 0.92
const MAX_RATE = 1.12
/** The meow starts where the signal first reaches this share of its peak (−34 dB)… */
const ONSET_SHARE = 0.02
/** …less this lead, so the attack stays whole. */
const ONSET_LEAD = 0.01
/** A boop that comes before the meow is decoded still plays it if it arrives this soon. */
const LATE_LIMIT_MS = 250
const DECODE_RATE = 48_000

type Meow = { buffer: AudioBuffer; offset: number }

type WindowWithWebkitOfflineAudio = Window & {
	webkitOfflineAudioContext?: typeof OfflineAudioContext
}

let loading: Promise<Meow | null> | undefined
let meow: Meow | null | undefined
let voices = 0

/** Seconds of near silence before the meow: the file opens with about 0.7 s of it. */
function onsetOf(buffer: AudioBuffer): number {
	const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
		buffer.getChannelData(i),
	)
	let peak = 0
	for (const data of channels)
		for (const sample of data) peak = Math.max(peak, Math.abs(sample))
	if (peak === 0) return 0
	const threshold = peak * ONSET_SHARE
	for (let i = 0; i < buffer.length; i++)
		for (const data of channels)
			if (Math.abs(data[i] ?? 0) >= threshold)
				return Math.max(0, i / buffer.sampleRate - ONSET_LEAD)
	return 0
}

/**
 * Decodes off the page's context: none may exist before a gesture, and an
 * `AudioBuffer` plays in any context. Falls back to the live context.
 */
function decoder(): BaseAudioContext | undefined {
	const Offline =
		window.OfflineAudioContext ??
		(window as WindowWithWebkitOfflineAudio).webkitOfflineAudioContext
	if (Offline) return new Offline(1, 1, DECODE_RATE)
	return peekAudioContext()
}

function load(): Promise<Meow | null> {
	loading ??= fetch(CAT_SOUND_SRC)
		.then((response) => {
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			return response.arrayBuffer()
		})
		.then((data) => {
			const ctx = decoder()
			if (!ctx) throw new Error('No audio context to decode with')
			return ctx.decodeAudioData(data)
		})
		.then((buffer) => {
			meow = { buffer, offset: onsetOf(buffer) }
			return meow
		})
		.catch((error: unknown) => {
			console.warn(
				`[sound] Could not load the cat sound (${CAT_SOUND_SRC}). Put the file at public${CAT_SOUND_SRC}; until then clicks stay silent.`,
				error,
			)
			meow = null
			return null
		})
	return loading
}

/**
 * Fetches and decodes the meow ahead of the first boop, so the click only
 * starts a source. Never creates an AudioContext; a no-op on the server.
 */
export function prefetchCatSound(): Promise<void> {
	if (typeof window === 'undefined') return Promise.resolve()
	return load().then(() => {})
}

/** Prefetches at an idle moment (2 s at the latest); returns a cancel. */
export function prefetchCatSoundWhenIdle(): () => void {
	if (typeof window === 'undefined' || meow !== undefined) return () => {}
	const run = () => {
		void prefetchCatSound()
	}
	if (typeof window.requestIdleCallback === 'function') {
		const id = window.requestIdleCallback(run, { timeout: 2000 })
		return () => window.cancelIdleCallback(id)
	}
	const id = window.setTimeout(run, 200)
	return () => window.clearTimeout(id)
}

function play(audio: AudioContext, sound: Meow, volume: number) {
	if (voices >= MAX_VOICES || !getSoundEnabled()) return
	const source = audio.createBufferSource()
	source.buffer = sound.buffer
	source.playbackRate.value = MIN_RATE + Math.random() * (MAX_RATE - MIN_RATE)
	const gain = audio.createGain()
	gain.gain.value = Math.max(0, Math.min(1, volume))
	source.connect(gain).connect(audio.destination)

	voices += 1
	source.onended = () => {
		voices -= 1
		source.disconnect()
		gain.disconnect()
	}
	source.start(0, sound.offset)
}

export type PlayCatSoundOptions = {
	/** 0..1, defaults to 0.6. */
	volume?: number
}

/**
 * Call from a user gesture: the AudioContext is created on the first call.
 * Starts the prefetched meow at once, waiting on nothing; a boop before the
 * prefetch is done plays it on arrival, unless that comes too late to
 * belong to the click. Never throws; a missing file is reported once and
 * then stays silent.
 */
export function playCatSound(options: PlayCatSoundOptions = {}): void {
	if (typeof window === 'undefined' || !getSoundEnabled()) return
	try {
		const audio = getAudioContext()
		if (!audio) return
		if (audio.state === 'suspended') audio.resume().catch(() => {})
		const volume = options.volume ?? 0.6
		if (meow) {
			play(audio, meow, volume)
			return
		}
		if (meow === null) return
		const clicked = performance.now()
		void load().then((sound) => {
			if (sound && performance.now() - clicked <= LATE_LIMIT_MS)
				play(audio, sound, volume)
		})
	} catch {
		// Audio is decorative: a failing device must not break the click handler.
	}
}
