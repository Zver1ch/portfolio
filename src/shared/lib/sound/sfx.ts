import { getAudioContext, peekAudioContext, resumeAudio } from './audio-context'
import { getSoundEnabled } from './sound-enabled'

/**
 * Small synthesised effects (plan §3.12): a key tick for the typing line, a
 * plop for the dropped fish, a chomp for the catch. On unless muted, like
 * the meow; a context the browser keeps suspended simply stays silent.
 */

const SFX = {
	tick: { gain: 0.05, seconds: 0.03 },
	plop: { gain: 0.14, fromHz: 620, toHz: 140, seconds: 0.14 },
	chomp: { gain: 0.16, bites: 2, biteSeconds: 0.05, gapSeconds: 0.09 },
} as const

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>()

/** A tenth of a second of white noise, shared per context. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
	let buffer = noiseBuffers.get(ctx)
	if (!buffer) {
		buffer = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate * 0.1),
			ctx.sampleRate,
		)
		const data = buffer.getChannelData(0)
		for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
		noiseBuffers.set(ctx, buffer)
	}
	return buffer
}

/**
 * The context to play on, or null for silence. Only an effect fired by a
 * user gesture may create the context; the others wait for one to exist,
 * so a page nobody touched yet never asks the browser for audio.
 */
async function ready(gesture = false): Promise<AudioContext | null> {
	if (typeof window === 'undefined' || !getSoundEnabled()) return null
	const audio = gesture ? getAudioContext() : peekAudioContext()
	if (!audio) return null
	return (await resumeAudio(audio)) ? audio : null
}

function burst(
	ctx: BaseAudioContext,
	at: number,
	seconds: number,
	gain: number,
	filterHz: number,
	out: AudioNode,
) {
	const source = ctx.createBufferSource()
	source.buffer = noiseBuffer(ctx)
	const filter = ctx.createBiquadFilter()
	filter.type = 'bandpass'
	filter.frequency.value = filterHz
	filter.Q.value = 1.2
	const envelope = ctx.createGain()
	envelope.gain.setValueAtTime(gain, at)
	envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds)
	source.connect(filter).connect(envelope).connect(out)
	source.start(at)
	source.stop(at + seconds + 0.02)
}

/** A key under a paw: a tiny filtered click. */
export async function playTick(): Promise<void> {
	const ctx = await ready()
	if (!ctx) return
	try {
		const at = ctx.currentTime
		burst(ctx, at, SFX.tick.seconds, SFX.tick.gain, 2600, ctx.destination)
	} catch {
		// Decorative.
	}
}

/** The fish is dropped (always by a tap or a key): a pitch drop. */
export async function playPlop(): Promise<void> {
	const ctx = await ready(true)
	if (!ctx) return
	try {
		const { gain, fromHz, toHz, seconds } = SFX.plop
		const at = ctx.currentTime
		const oscillator = ctx.createOscillator()
		oscillator.frequency.setValueAtTime(fromHz, at)
		oscillator.frequency.exponentialRampToValueAtTime(toHz, at + seconds)
		const envelope = ctx.createGain()
		envelope.gain.setValueAtTime(gain, at)
		envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds)
		oscillator.connect(envelope).connect(ctx.destination)
		oscillator.start(at)
		oscillator.stop(at + seconds + 0.02)
	} catch {
		// Decorative.
	}
}

/** The catch: two quick bites with a low thump under the first. */
export async function playChomp(): Promise<void> {
	const ctx = await ready()
	if (!ctx) return
	try {
		const { gain, bites, biteSeconds, gapSeconds } = SFX.chomp
		const at = ctx.currentTime
		for (let i = 0; i < bites; i++)
			burst(
				ctx,
				at + i * gapSeconds,
				biteSeconds,
				gain,
				900,
				ctx.destination,
			)
		const thump = ctx.createOscillator()
		thump.frequency.setValueAtTime(110, at)
		thump.frequency.exponentialRampToValueAtTime(60, at + 0.12)
		const envelope = ctx.createGain()
		envelope.gain.setValueAtTime(gain, at)
		envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.12)
		thump.connect(envelope).connect(ctx.destination)
		thump.start(at)
		thump.stop(at + 0.14)
	} catch {
		// Decorative.
	}
}
