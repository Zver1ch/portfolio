/**
 * Code-generated ambient sound (plan §3.12): room tone, the PC's hum, sparse
 * plucks, and at dawn a few chirps. Built on any BaseAudioContext, so the
 * same graph renders through an OfflineAudioContext for the loudness check.
 *
 * This module imports nothing on purpose: the e2e loudness test strips its
 * types and loads it into the browser as it is.
 */

export type AmbientGraph = {
	/** 0 night … 1 dawn; past 0.5 the hum halves and the chirps come. */
	setMood(mood: number): void
	/** Schedules the sparse events (plucks, chirps) up to this context time. */
	schedule(untilTime: number): void
	/** Ramps the master to `level` over `seconds`. */
	fadeTo(level: number, seconds: number): void
	dispose(): void
}

export const AMBIENT = {
	master: 0.5,
	fadeSeconds: 1.2,
	roomTone: { cutoffHz: 320, gain: 0.26 },
	hum: {
		frequenciesHz: [55, 110.5] as const,
		gains: [0.075, 0.03] as const,
		tremoloHz: 0.13,
		tremoloDepth: 0.3,
		/** The hum at dawn, as a share of the night level. */
		dawnShare: 0.5,
	},
	plucks: {
		/** A-minor pentatonic, Hz. */
		notesHz: [220, 261.63, 293.66, 329.63, 392, 440] as const,
		gapSeconds: [5, 11] as const,
		decaySeconds: 2.4,
		gain: 0.3,
		delaySeconds: 0.38,
		feedback: 0.35,
		wet: 0.4,
	},
	chirps: {
		fromHz: 2400,
		toHz: 3200,
		seconds: 0.08,
		gapSeconds: [1.5, 4] as const,
		gain: 0.12,
	},
} as const

/** Deterministic 0..1 noise; mulberry32 on a mutable seed. */
function random(state: { seed: number }): number {
	state.seed = (state.seed + 0x6d2b79f5) | 0
	let t = state.seed
	t = Math.imul(t ^ (t >>> 15), t | 1)
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Four seconds of brown noise, normalised to a peak of 1, for looping. */
function brownNoise(ctx: BaseAudioContext, rng: { seed: number }): AudioBuffer {
	const seconds = 4
	const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
	const data = buffer.getChannelData(0)
	let brown = 0
	let peak = 0
	for (let i = 0; i < data.length; i++) {
		const white = random(rng) * 2 - 1
		brown += (white - brown) * 0.02
		data[i] = brown
		peak = Math.max(peak, Math.abs(brown))
	}
	const norm = peak > 0 ? 1 / peak : 1
	for (let i = 0; i < data.length; i++) data[i] *= norm
	// A short cross-fade at the loop seam.
	const seam = Math.floor(ctx.sampleRate * 0.05)
	for (let i = 0; i < seam; i++) {
		const t = i / seam
		data[i] *= t
		data[data.length - 1 - i] *= t
	}
	return buffer
}

export function createAmbientGraph(
	ctx: BaseAudioContext,
	out: AudioNode,
	seed = 7,
): AmbientGraph {
	const rng = { seed }
	const now = () => ctx.currentTime
	const master = ctx.createGain()
	master.gain.value = 0
	master.connect(out)

	// Room tone: looped brown noise, low-passed.
	const noise = ctx.createBufferSource()
	noise.buffer = brownNoise(ctx, rng)
	noise.loop = true
	const lowpass = ctx.createBiquadFilter()
	lowpass.type = 'lowpass'
	lowpass.frequency.value = AMBIENT.roomTone.cutoffHz
	const roomGain = ctx.createGain()
	roomGain.gain.value = AMBIENT.roomTone.gain
	noise.connect(lowpass).connect(roomGain).connect(master)
	noise.start()

	// The PC's hum: two sines under a slow tremolo.
	const humGain = ctx.createGain()
	humGain.gain.value = 1 - AMBIENT.hum.tremoloDepth / 2
	const tremolo = ctx.createOscillator()
	tremolo.frequency.value = AMBIENT.hum.tremoloHz
	const tremoloDepth = ctx.createGain()
	tremoloDepth.gain.value = AMBIENT.hum.tremoloDepth / 2
	tremolo.connect(tremoloDepth).connect(humGain.gain)
	tremolo.start()
	const humMood = ctx.createGain()
	humMood.gain.value = 1
	humGain.connect(humMood).connect(master)
	const humOscillators = AMBIENT.hum.frequenciesHz.map((hz, i) => {
		const oscillator = ctx.createOscillator()
		oscillator.frequency.value = hz
		const gain = ctx.createGain()
		gain.gain.value = AMBIENT.hum.gains[i]
		oscillator.connect(gain).connect(humGain)
		oscillator.start()
		return oscillator
	})

	// Plucks through a feedback delay.
	const pluckBus = ctx.createGain()
	pluckBus.gain.value = 1
	const delay = ctx.createDelay(1)
	delay.delayTime.value = AMBIENT.plucks.delaySeconds
	const feedback = ctx.createGain()
	feedback.gain.value = AMBIENT.plucks.feedback
	const wet = ctx.createGain()
	wet.gain.value = AMBIENT.plucks.wet
	pluckBus.connect(master)
	pluckBus.connect(delay)
	delay.connect(feedback).connect(delay)
	delay.connect(wet).connect(master)

	let mood = 0
	let nextPluck = now() + 2
	let nextChirp = now() + 1
	const scheduled: AudioScheduledSourceNode[] = []

	const pluck = (at: number) => {
		const notes = AMBIENT.plucks.notesHz
		const oscillator = ctx.createOscillator()
		oscillator.frequency.value =
			notes[Math.floor(random(rng) * notes.length)]
		const envelope = ctx.createGain()
		envelope.gain.setValueAtTime(0.0001, at)
		envelope.gain.exponentialRampToValueAtTime(
			AMBIENT.plucks.gain,
			at + 0.012,
		)
		envelope.gain.exponentialRampToValueAtTime(
			0.0001,
			at + AMBIENT.plucks.decaySeconds,
		)
		oscillator.connect(envelope).connect(pluckBus)
		oscillator.start(at)
		oscillator.stop(at + AMBIENT.plucks.decaySeconds + 0.1)
		scheduled.push(oscillator)
	}

	const chirp = (at: number) => {
		const { fromHz, toHz, seconds, gain } = AMBIENT.chirps
		const oscillator = ctx.createOscillator()
		oscillator.frequency.setValueAtTime(fromHz, at)
		oscillator.frequency.linearRampToValueAtTime(toHz, at + seconds)
		const envelope = ctx.createGain()
		envelope.gain.setValueAtTime(0.0001, at)
		envelope.gain.exponentialRampToValueAtTime(gain, at + 0.01)
		envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds)
		oscillator.connect(envelope).connect(master)
		oscillator.start(at)
		oscillator.stop(at + seconds + 0.05)
		scheduled.push(oscillator)
	}

	const between = ([from, to]: readonly [number, number]) =>
		from + random(rng) * (to - from)

	return {
		setMood(next) {
			mood = Math.min(Math.max(next, 0), 1)
			const dawn = mood > 0.5
			const at = now()
			humMood.gain.cancelScheduledValues(at)
			humMood.gain.setValueAtTime(humMood.gain.value, at)
			humMood.gain.linearRampToValueAtTime(
				dawn ? AMBIENT.hum.dawnShare : 1,
				at + 2,
			)
		},
		schedule(untilTime) {
			while (nextPluck < untilTime) {
				pluck(nextPluck)
				nextPluck += between(AMBIENT.plucks.gapSeconds)
			}
			while (nextChirp < untilTime) {
				if (mood > 0.5) chirp(nextChirp)
				nextChirp += between(AMBIENT.chirps.gapSeconds)
			}
		},
		fadeTo(level, seconds) {
			const at = now()
			master.gain.cancelScheduledValues(at)
			master.gain.setValueAtTime(master.gain.value, at)
			master.gain.linearRampToValueAtTime(level, at + seconds)
		},
		dispose() {
			for (const source of [
				noise,
				tremolo,
				...humOscillators,
				...scheduled,
			]) {
				try {
					source.stop()
				} catch {
					// Never started or already stopped.
				}
				source.disconnect()
			}
			master.disconnect()
		},
	}
}
