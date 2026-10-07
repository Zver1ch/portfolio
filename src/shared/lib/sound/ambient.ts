/**
 * Code-generated ambient (plan §3.12): a calm night in the room. Warm pads
 * walk a slow chord cycle in A minor, a felt piano drops sparse notes from
 * the chord over a low room tone, and all of it goes through one short
 * generated reverb with a hint of tape wow. At dawn the room tone eases off,
 * the harmony lifts to A major in higher voicings, the pads open up and a
 * distant bird calls now and then. Built on any
 * BaseAudioContext, so the same graph renders through an OfflineAudioContext
 * for the loudness check.
 *
 * This module imports nothing on purpose: the e2e loudness test strips its
 * types and loads it into the browser as it is.
 */

export type AmbientGraph = {
	/**
	 * 0 night … 1 dawn. The textures ramp over `moodSeconds`; past 0.5 the
	 * new set's tonic arrives at the next chord change (no earlier than 3 s,
	 * never inside the sounding chord's attack) and the birds start calling.
	 */
	setMood(mood: number): void
	/** Schedules the chords, the piano phrases and the birds up to this context time. */
	schedule(untilTime: number): void
	/** Ramps the master to `level` over `seconds`. */
	fadeTo(level: number, seconds: number): void
	/**
	 * Stops and disconnects every source and the master; the rest is left to
	 * the collector. The context is left alone.
	 */
	dispose(): void
}

export const AMBIENT = {
	master: 0.39,
	fadeSeconds: 1.2,
	/** How long the textures take to move between night and dawn. */
	moodSeconds: 8,
	/** Events due within this of the clock are late: a stalled call drops them. */
	marginSeconds: 0.1,
	reverb: {
		seconds: 2.6,
		preDelaySeconds: 0.02,
		/** The tail starts this dark and darkens further as it decays. */
		toneHz: 3400,
		wet: 0.35,
	},
	pads: {
		/**
		 * Peak gain of a note's main oscillator. Its partner sits `pairHz`
		 * away at `pairLevel`, on the other side: the pair beats once every
		 * few seconds at any pitch, and never all the way down.
		 */
		voice: 0.046,
		pairHz: 0.12,
		pairLevel: 0.5,
		attackSeconds: 4,
		firstAttackSeconds: 1.5,
		releaseSeconds: 6,
		tailSeconds: 2,
		/** A change of set (night to dawn or back) crosses over faster, so the thirds do not blur for long. */
		flipSeconds: 3,
		chordSeconds: { night: [14, 22], dawn: [12, 18] },
		cutoffHz: { night: 1100, dawn: 2600 },
		/** A very slow wander of the cutoff, so no two chords sound alike. */
		drift: { hz: 0.023, depthHz: 180 },
		/** Tape wow on every pad oscillator. */
		wow: { hz: 0.37, cents: 4 },
		drive: 2.2,
		send: 0.6,
	},
	keys: {
		gain: 0.14,
		attackSeconds: 0.03,
		decaySeconds: 4,
		/** The felt body: a brighter overtone wave that fades fast. */
		body: 0.5,
		bodySeconds: 0.6,
		/** The soft thump of the hammer: a few ms of the room's brown noise. */
		thump: 0.3,
		thumpSeconds: 0.05,
		cutoffHz: 2600,
		firstSeconds: [6, 10],
		phraseGapSeconds: [7, 16],
		noteGapSeconds: [0.9, 1.9],
		notesPerPhrase: [1, 3],
		/** The lowest key, night and dawn; the range spans 21 semitones. */
		lowMidi: { night: 60, dawn: 67 },
		send: 0.8,
	},
	room: {
		loopSeconds: 4,
		floorHz: 45,
		cutoffHz: 220,
		gain: 0.04,
		dawnShare: 0.7,
	},
	birds: {
		gain: 0.13,
		cutoffHz: 5000,
		firstSeconds: [4, 9],
		gapSeconds: [12, 26],
		syllables: [2, 4],
		syllableSeconds: [0.07, 0.13],
		trillSeconds: [0.16, 0.24],
		pauseSeconds: [0.08, 0.2],
		baseHz: [2400, 3600],
		dry: 0.3,
		send: 0.85,
	},
} as const

type Chord = {
	name: string
	/** MIDI note numbers, low to high. */
	notes: readonly number[]
	/** Weighted choices of the next chord, as indices into the same set. */
	next: readonly (readonly [number, number])[]
}

type ChordSet = { tonic: number; chords: readonly Chord[] }

/** The two chord sets; a mood flip goes through the tonic of the new set. */
export const HARMONY: { night: ChordSet; dawn: ChordSet } = {
	night: {
		tonic: 0,
		chords: [
			{
				name: 'Am9',
				notes: [45, 52, 55, 60, 64, 71],
				next: [
					[1, 0.45],
					[3, 0.3],
					[2, 0.25],
				],
			},
			{
				name: 'Fmaj9',
				notes: [41, 48, 57, 64, 67],
				next: [
					[0, 0.4],
					[2, 0.35],
					[3, 0.25],
				],
			},
			{
				name: 'Cmaj9',
				notes: [48, 55, 64, 71, 74],
				next: [
					[4, 0.4],
					[0, 0.35],
					[1, 0.25],
				],
			},
			{
				name: 'Dm9',
				notes: [50, 57, 60, 65, 76],
				next: [
					[0, 0.45],
					[4, 0.3],
					[1, 0.25],
				],
			},
			{
				name: 'Em7',
				notes: [52, 59, 62, 67, 71],
				next: [
					[0, 0.6],
					[1, 0.25],
					[2, 0.15],
				],
			},
		],
	},
	dawn: {
		tonic: 0,
		chords: [
			{
				name: 'Amaj9',
				notes: [45, 52, 61, 68, 71, 76],
				next: [
					[1, 0.45],
					[4, 0.3],
					[2, 0.25],
				],
			},
			{
				name: 'Dmaj9',
				notes: [50, 57, 66, 73, 76],
				next: [
					[0, 0.4],
					[3, 0.35],
					[2, 0.25],
				],
			},
			{
				name: 'Bm(add9)',
				notes: [47, 54, 62, 66, 73],
				next: [
					[3, 0.5],
					[1, 0.3],
					[0, 0.2],
				],
			},
			{
				name: 'E(add9)',
				notes: [52, 59, 66, 68, 71],
				next: [
					[0, 0.6],
					[4, 0.25],
					[1, 0.15],
				],
			},
			{
				name: 'F#m7',
				notes: [54, 61, 64, 69, 76],
				next: [
					[1, 0.5],
					[2, 0.3],
					[3, 0.2],
				],
			},
		],
	},
}

type Rng = { seed: number }

/** Deterministic 0..1 noise; mulberry32 on a mutable seed. */
function random(state: Rng): number {
	state.seed = (state.seed + 0x6d2b79f5) | 0
	let t = state.seed
	t = Math.imul(t ^ (t >>> 15), t | 1)
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * One stream per concern (buffers, chords, keys, birds), so the order in
 * which `schedule` is called never changes what any of them draws.
 */
function stream(seed: number, lane: number): Rng {
	return {
		seed:
			(Math.imul(seed, 0x9e3779b1) + Math.imul(lane + 1, 0x85ebca6b)) | 0,
	}
}

const between = (rng: Rng, [from, to]: readonly [number, number]) =>
	from + random(rng) * (to - from)

const count = (rng: Rng, [from, to]: readonly [number, number]) =>
	from + Math.floor(random(rng) * (to - from + 1))

function pick(
	rng: Rng,
	choices: readonly (readonly [number, number])[],
): number {
	let total = 0
	for (const [, weight] of choices) total += weight
	let roll = random(rng) * total
	for (const [index, weight] of choices) {
		roll -= weight
		if (roll < 0) return index
	}
	return choices[choices.length - 1][0]
}

const midiHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

/** Sine partials with the given amplitudes, as a normalised wave. */
function partials(
	ctx: BaseAudioContext,
	amplitudes: readonly number[],
): PeriodicWave {
	const real = new Float32Array(amplitudes.length + 1)
	const imag = new Float32Array(amplitudes.length + 1)
	for (let i = 0; i < amplitudes.length; i++) imag[i + 1] = amplitudes[i]
	return ctx.createPeriodicWave(real, imag)
}

/** A gentle tanh curve; the drive before it decides how much it bends. */
function warmth(ctx: BaseAudioContext): WaveShaperNode {
	const shaper = ctx.createWaveShaper()
	const curve = new Float32Array(1024)
	for (let i = 0; i < curve.length; i++) {
		const x = (i / (curve.length - 1)) * 2 - 1
		curve[i] = Math.tanh(x) / Math.tanh(1)
	}
	shaper.curve = curve
	return shaper
}

/**
 * Brown noise for the room tone, looped: the tail is generated past the
 * loop and cross-faded into the head, so the seam has no dip.
 */
function roomBuffer(ctx: BaseAudioContext, rng: Rng): AudioBuffer {
	const rate = ctx.sampleRate
	const length = Math.floor(rate * AMBIENT.room.loopSeconds)
	const seam = Math.floor(rate * 0.1)
	const buffer = ctx.createBuffer(1, length, rate)
	const data = buffer.getChannelData(0)
	let brown = 0
	let peak = 0
	for (let i = 0; i < length + seam; i++) {
		brown += (random(rng) * 2 - 1 - brown) * 0.02
		if (i < length) {
			data[i] = brown
		} else {
			const t = (i - length) / seam
			data[i - length] = data[i - length] * t + brown * (1 - t)
		}
		peak = Math.max(peak, Math.abs(brown))
	}
	const norm = peak > 0 ? 1 / peak : 1
	for (let i = 0; i < length; i++) data[i] *= norm
	return buffer
}

/**
 * The reverb's impulse: decorrelated stereo noise under an exponential
 * decay, low-passed with a cutoff that falls as the tail dies, after a
 * short pre-delay.
 */
function reverbBuffer(ctx: BaseAudioContext, rng: Rng): AudioBuffer {
	const rate = ctx.sampleRate
	const { seconds, preDelaySeconds, toneHz } = AMBIENT.reverb
	const length = Math.floor(rate * (seconds + preDelaySeconds))
	const preDelay = Math.floor(rate * preDelaySeconds)
	const buffer = ctx.createBuffer(2, length, rate)
	const decay = Math.log(1000) / seconds
	const block = 64
	for (let channel = 0; channel < 2; channel++) {
		const data = buffer.getChannelData(channel)
		let low = 0
		let k = 0
		let envelope = 0
		for (let i = preDelay; i < length; i++) {
			const t = (i - preDelay) / rate
			if ((i - preDelay) % block === 0) {
				// The cutoff and the decay move slowly: one evaluation per block.
				const cutoff = toneHz * Math.exp(-t / seconds)
				k = 1 - Math.exp((-2 * Math.PI * cutoff) / rate)
				envelope = Math.exp(-t * decay)
			}
			low += (random(rng) * 2 - 1 - low) * k
			data[i] = low * envelope * Math.min(1, t / 0.005)
		}
	}
	return buffer
}

/** Scales each channel of a stereo buffer to their mean RMS, so neither side leads. */
function balance(buffer: AudioBuffer): AudioBuffer {
	if (buffer.numberOfChannels !== 2) return buffer
	const channels = [buffer.getChannelData(0), buffer.getChannelData(1)]
	const rms = channels.map((data) => {
		let sum = 0
		for (let i = 0; i < data.length; i++) sum += data[i] * data[i]
		return Math.sqrt(sum / data.length)
	})
	const mean = (rms[0] + rms[1]) / 2
	for (let c = 0; c < 2; c++) {
		if (rms[c] <= 0) continue
		const k = mean / rms[c]
		const data = channels[c]
		for (let i = 0; i < data.length; i++) data[i] *= k
	}
	return buffer
}

type Buffers = { room: AudioBuffer; reverb: AudioBuffer }

const bufferCache = new WeakMap<BaseAudioContext, Map<number, Buffers>>()

/**
 * The generated buffers, once per context and seed: a graph rebuilt after a
 * mute reuses them instead of spending the gesture on noise again.
 */
function buffers(ctx: BaseAudioContext, seed: number): Buffers {
	let perSeed = bufferCache.get(ctx)
	if (!perSeed) {
		perSeed = new Map()
		bufferCache.set(ctx, perSeed)
	}
	let found = perSeed.get(seed)
	if (!found) {
		const rng = stream(seed, 0)
		found = {
			reverb: balance(reverbBuffer(ctx, rng)),
			room: roomBuffer(ctx, rng),
		}
		perSeed.set(seed, found)
	}
	return found
}

export function createAmbientGraph(
	ctx: BaseAudioContext,
	out: AudioNode,
	seed = 7,
): AmbientGraph {
	const { room: roomNoise, reverb: impulse } = buffers(ctx, seed)
	const rngChords = stream(seed, 1)
	const rngKeys = stream(seed, 2)
	const rngBirds = stream(seed, 3)
	const now = () => ctx.currentTime
	const live = new Set<AudioScheduledSourceNode>()
	const track = <T extends AudioScheduledSourceNode>(
		source: T,
		cleanup?: () => void,
	): T => {
		live.add(source)
		source.onended = () => {
			live.delete(source)
			cleanup?.()
		}
		return source
	}
	const ramp = (
		param: AudioParam,
		value: number,
		seconds: number,
		exponential = false,
	) => {
		// Read before the cancel: Gecko's getter can reflect the cut timeline.
		const from = param.value
		const at = now()
		param.cancelScheduledValues(at)
		param.setValueAtTime(from, at)
		if (exponential) param.exponentialRampToValueAtTime(value, at + seconds)
		else param.linearRampToValueAtTime(value, at + seconds)
	}
	const master = ctx.createGain()
	master.gain.value = 0
	master.connect(out)

	// One reverb for everything.
	const send = ctx.createGain()
	const reverb = ctx.createConvolver()
	reverb.buffer = impulse
	const wet = ctx.createGain()
	wet.gain.value = AMBIENT.reverb.wet
	send.connect(reverb).connect(wet).connect(master)

	// Pads: detuned pairs spread left and right, a touch of tape, a slow filter.
	const padWave = partials(ctx, [1, 0.35, 0.12, 0.05, 0.02])
	const padMerger = ctx.createChannelMerger(2)
	const padDrive = ctx.createGain()
	padDrive.gain.value = AMBIENT.pads.drive
	const padTrim = ctx.createGain()
	padTrim.gain.value = 1 / AMBIENT.pads.drive
	const padFilter = ctx.createBiquadFilter()
	padFilter.type = 'lowpass'
	padFilter.frequency.value = AMBIENT.pads.cutoffHz.night
	padFilter.Q.value = 0.5
	const padSend = ctx.createGain()
	padSend.gain.value = AMBIENT.pads.send
	padMerger
		.connect(padDrive)
		.connect(warmth(ctx))
		.connect(padTrim)
		.connect(padFilter)
		.connect(master)
	padFilter.connect(padSend).connect(send)
	const drift = track(ctx.createOscillator())
	drift.frequency.value = AMBIENT.pads.drift.hz
	const driftDepth = ctx.createGain()
	driftDepth.gain.value = AMBIENT.pads.drift.depthHz
	drift.connect(driftDepth).connect(padFilter.frequency)
	drift.start()
	const wow = track(ctx.createOscillator())
	wow.frequency.value = AMBIENT.pads.wow.hz
	const wowDepth = ctx.createGain()
	wowDepth.gain.value = AMBIENT.pads.wow.cents
	wow.connect(wowDepth)
	wow.start()

	// The felt piano.
	const keyWave = partials(ctx, [1, 0.5, 0.2, 0.08, 0.03])
	const keyFilter = ctx.createBiquadFilter()
	keyFilter.type = 'lowpass'
	keyFilter.frequency.value = AMBIENT.keys.cutoffHz
	const keySend = ctx.createGain()
	keySend.gain.value = AMBIENT.keys.send
	keyFilter.connect(master)
	keyFilter.connect(keySend).connect(send)

	// Room tone: brown noise kept between the floor and the cutoff.
	const room = track(ctx.createBufferSource())
	room.buffer = roomNoise
	room.loop = true
	const roomFloor = ctx.createBiquadFilter()
	roomFloor.type = 'highpass'
	roomFloor.frequency.value = AMBIENT.room.floorHz
	const roomTone = ctx.createBiquadFilter()
	roomTone.type = 'lowpass'
	roomTone.frequency.value = AMBIENT.room.cutoffHz
	const roomLevel = ctx.createGain()
	roomLevel.gain.value = AMBIENT.room.gain
	room.connect(roomFloor).connect(roomTone).connect(roomLevel).connect(master)
	room.start()

	// Birds, far outside: mostly reverb.
	const birdWave = partials(ctx, [1, 0.15])
	const birdFilter = ctx.createBiquadFilter()
	birdFilter.type = 'lowpass'
	birdFilter.frequency.value = AMBIENT.birds.cutoffHz
	const birdLevel = ctx.createGain()
	birdLevel.gain.value = 0
	const birdDry = ctx.createGain()
	birdDry.gain.value = AMBIENT.birds.dry
	const birdSend = ctx.createGain()
	birdSend.gain.value = AMBIENT.birds.send
	birdFilter.connect(birdLevel)
	birdLevel.connect(birdDry).connect(master)
	birdLevel.connect(birdSend).connect(send)

	/** One scheduled point of a pad envelope, mirrored so a voice can be cut mid-curve. */
	type Point = {
		kind: 'set' | 'linear' | 'exponential'
		value: number
		at: number
	}

	/** The envelope's value at `time`, from the points scheduled so far. */
	const envelopeAt = (points: readonly Point[], time: number): number => {
		let value = 0
		let since = Number.NEGATIVE_INFINITY
		for (const point of points) {
			if (point.at <= time) {
				value = point.value
				since = point.at
				continue
			}
			if (point.kind === 'set' || !Number.isFinite(since)) return value
			const t = (time - since) / (point.at - since)
			return point.kind === 'linear'
				? value + (point.value - value) * t
				: value * (point.value / value) ** t
		}
		return value
	}

	type Voices = {
		release(when: number, seconds: number): void
		/** Fades the voices out by `by` and stops them, if they would still sound then. */
		cut(by: number): void
	}

	const padVoice = (
		midi: number,
		at: number,
		attack: number,
		strongSide: number,
	) => {
		const hz = midiHz(midi)
		// A negative side centres the voice: one oscillator on both sides, so
		// the bass neither leans nor beats, even summed to mono.
		const centred = strongSide < 0
		const sides = (centred ? [0] : [0, 1]).map((side) => {
			const level = centred
				? (1 + AMBIENT.pads.pairLevel) / 2
				: side === strongSide
					? 1
					: AMBIENT.pads.pairLevel
			const peak = AMBIENT.pads.voice * level
			const envelope = ctx.createGain()
			const oscillator = track(ctx.createOscillator(), () => {
				// The wow stays connected to a dead oscillator's detune otherwise.
				try {
					wowDepth.disconnect(oscillator.detune)
				} catch {
					// Gone with the graph already.
				}
				oscillator.disconnect()
				envelope.disconnect()
			})
			oscillator.setPeriodicWave(padWave)
			oscillator.frequency.value = centred
				? hz
				: hz + (side ? 0.5 : -0.5) * AMBIENT.pads.pairHz
			wowDepth.connect(oscillator.detune)
			envelope.gain.setValueAtTime(0, at)
			envelope.gain.linearRampToValueAtTime(peak, at + attack)
			const points: Point[] = [
				{ kind: 'set', value: 0, at },
				{ kind: 'linear', value: peak, at: at + attack },
			]
			oscillator.connect(envelope)
			envelope.connect(padMerger, 0, side)
			if (centred) envelope.connect(padMerger, 0, 1)
			oscillator.start(at)
			return { oscillator, envelope, peak, points }
		})
		let endsAt = Number.POSITIVE_INFINITY
		return {
			release(when: number, seconds: number) {
				// A linear fade keeps the crossfade level; the tail dies out exponentially.
				const { tailSeconds } = AMBIENT.pads
				endsAt = when + seconds + tailSeconds + 0.1
				for (const { oscillator, envelope, peak, points } of sides) {
					envelope.gain.setValueAtTime(peak, when)
					envelope.gain.linearRampToValueAtTime(
						peak * 0.1,
						when + seconds,
					)
					envelope.gain.exponentialRampToValueAtTime(
						0.0001,
						when + seconds + tailSeconds,
					)
					points.push(
						{ kind: 'set', value: peak, at: when },
						{
							kind: 'linear',
							value: peak * 0.1,
							at: when + seconds,
						},
						{
							kind: 'exponential',
							value: 0.0001,
							at: when + seconds + tailSeconds,
						},
					)
					oscillator.stop(endsAt)
				}
			},
			cut(by: number) {
				if (endsAt <= by) return
				// Pin the curve where it is a moment from now, drop what was to
				// follow and fade out from there: no cancelAndHoldAtTime needed.
				const pinAt = now() + 0.05
				const stopAt = Math.max(by, pinAt + 0.01)
				endsAt = stopAt
				for (const { oscillator, envelope, points } of sides) {
					const level = Math.max(envelopeAt(points, pinAt), 0.0001)
					const next = points.find((point) => point.at > pinAt)
					if (next?.kind === 'exponential')
						envelope.gain.exponentialRampToValueAtTime(level, pinAt)
					else envelope.gain.linearRampToValueAtTime(level, pinAt)
					envelope.gain.cancelScheduledValues(pinAt + 0.001)
					envelope.gain.linearRampToValueAtTime(0.0001, stopAt)
					oscillator.stop(endsAt)
				}
			},
		}
	}

	const playChord = (
		chord: Chord,
		at: number,
		attack: number,
		parity: number,
	): Voices => {
		// The bass is centred; above it the stronger oscillator alternates
		// sides from note to note, and from chord to chord, so neither side leads.
		const voices = chord.notes.map((midi, i) =>
			padVoice(midi, at, attack, i === 0 ? -1 : (i + parity) % 2),
		)
		return {
			release(when, seconds) {
				for (const voice of voices) voice.release(when, seconds)
			},
			cut(by) {
				for (const voice of voices) voice.cut(by)
			},
		}
	}

	/** Phrase notes not started yet, so a mood pull can take them back. */
	let pending: { at: number; silence(): void }[] = []

	const playKey = (midi: number, at: number, audible: boolean) => {
		const keys = AMBIENT.keys
		// Drawn whether or not the note sounds, so the stream stays in step.
		const offset = random(rngKeys) * (AMBIENT.room.loopSeconds - 1)
		if (!audible) return
		const hz = midiHz(midi)
		const tone = track(ctx.createOscillator())
		tone.frequency.value = hz
		const envelope = ctx.createGain()
		envelope.gain.setValueAtTime(0, at)
		envelope.gain.linearRampToValueAtTime(
			keys.gain,
			at + keys.attackSeconds,
		)
		envelope.gain.exponentialRampToValueAtTime(
			0.0001,
			at + keys.decaySeconds,
		)
		tone.connect(envelope).connect(keyFilter)
		tone.start(at)
		tone.stop(at + keys.decaySeconds + 0.05)

		const body = track(ctx.createOscillator())
		body.setPeriodicWave(keyWave)
		body.frequency.value = hz
		const bodyEnvelope = ctx.createGain()
		bodyEnvelope.gain.setValueAtTime(0, at)
		bodyEnvelope.gain.linearRampToValueAtTime(
			keys.gain * keys.body,
			at + keys.attackSeconds,
		)
		bodyEnvelope.gain.exponentialRampToValueAtTime(
			0.0001,
			at + keys.bodySeconds,
		)
		body.connect(bodyEnvelope).connect(keyFilter)
		body.start(at)
		body.stop(at + keys.bodySeconds + 0.05)

		const thump = track(ctx.createBufferSource())
		thump.buffer = roomNoise
		const thumpEnvelope = ctx.createGain()
		thumpEnvelope.gain.setValueAtTime(keys.gain * keys.thump, at)
		thumpEnvelope.gain.exponentialRampToValueAtTime(
			0.0001,
			at + keys.thumpSeconds,
		)
		thump.connect(thumpEnvelope).connect(keyFilter)
		thump.start(at, offset)
		thump.stop(at + keys.thumpSeconds + 0.02)

		const parts = [
			{ source: tone, envelope },
			{ source: body, envelope: bodyEnvelope },
			{ source: thump, envelope: thumpEnvelope },
		]
		pending.push({
			at,
			silence() {
				const t = now()
				for (const part of parts) {
					part.envelope.gain.cancelScheduledValues(t)
					part.envelope.gain.setValueAtTime(0, t)
					// Stopped at its start, the source never plays.
					part.source.stop(at)
				}
			},
		})
	}

	const birdSyllable = (
		at: number,
		hz: number,
		trill: boolean,
		seconds: number,
		audible: boolean,
	) => {
		const slide = random(rngBirds) * 1.2 - 0.9
		if (!audible) return
		const steps = 32
		const frequency = new Float32Array(steps)
		const amplitude = new Float32Array(steps)
		for (let i = 0; i < steps; i++) {
			const t = i / (steps - 1)
			const octaves = trill
				? 0.1 * Math.sin(2 * Math.PI * 3.5 * t)
				: 0.35 * Math.sin(Math.PI * t) + 0.5 * slide * t
			frequency[i] = hz * 2 ** (octaves / 2)
			amplitude[i] =
				(0.5 - 0.5 * Math.cos(2 * Math.PI * t)) * AMBIENT.birds.gain
		}
		const oscillator = track(ctx.createOscillator())
		oscillator.setPeriodicWave(birdWave)
		oscillator.frequency.setValueCurveAtTime(frequency, at, seconds)
		const envelope = ctx.createGain()
		envelope.gain.setValueCurveAtTime(amplitude, at, seconds)
		oscillator.connect(envelope).connect(birdFilter)
		oscillator.start(at)
		oscillator.stop(at + seconds + 0.02)
	}

	/** A short phrase of a few syllables; returns when it ends. */
	const birdPhrase = (at: number, horizon: number) => {
		const birds = AMBIENT.birds
		const base = between(rngBirds, birds.baseHz)
		const syllables = count(rngBirds, birds.syllables)
		let t = at
		for (let i = 0; i < syllables; i++) {
			const trill = random(rngBirds) < 0.3
			const seconds = between(
				rngBirds,
				trill ? birds.trillSeconds : birds.syllableSeconds,
			)
			birdSyllable(
				t,
				base * (0.95 + random(rngBirds) * 0.1),
				trill,
				seconds,
				t >= horizon,
			)
			t += seconds + between(rngBirds, birds.pauseSeconds)
		}
		return t
	}

	let mood = 0
	let dawn = false
	let started = false
	let scheduledUntil = now()
	/** When the next chord is due. */
	let chordAt = now() + AMBIENT.marginSeconds
	/** Where a mood pull took `chordAt` from, until that chord is built. */
	let pulledFrom: number | null = null
	/** The walk's position: the last chord, built or passed in silence. */
	let walk: { set: ChordSet; index: number } | null = null
	/** The chord that sustains, and the one before it still in its tail. */
	let sounding: Voices | null = null
	let fading: Voices | null = null
	let chordStart = Number.NEGATIVE_INFINITY
	let built = 0
	const chordLog: { at: number; chord: Chord }[] = []
	let keyAt = now() + between(rngKeys, AMBIENT.keys.firstSeconds)
	let birdAt = now() + between(rngBirds, AMBIENT.birds.firstSeconds)

	const chordAtTime = (time: number): Chord | undefined => {
		let found: Chord | undefined
		for (const entry of chordLog) if (entry.at <= time) found = entry.chord
		return found
	}

	/** Chord tones folded into the key range, low to high. */
	const keyOptions = (chord: Chord): number[] => {
		const low = dawn
			? AMBIENT.keys.lowMidi.dawn
			: AMBIENT.keys.lowMidi.night
		const options = new Set<number>()
		for (const note of chord.notes) {
			let midi = note
			while (midi < low) midi += 12
			while (midi > low + 21) midi -= 12
			options.add(midi)
		}
		return [...options].sort((a, b) => a - b)
	}

	/**
	 * A lullaby phrase: it opens high and tends to step down, and never
	 * runs into the next chord. Notes behind `horizon` are drawn but not
	 * built, so a late call does not clump them.
	 */
	const playPhrase = (at: number, horizon: number) => {
		const keys = AMBIENT.keys
		const notes = count(rngKeys, keys.notesPerPhrase)
		let t = at
		let last = -1
		for (let i = 0; i < notes; i++) {
			if (t >= chordAt) break
			const chord = chordAtTime(t)
			if (!chord) break
			const options = keyOptions(chord)
			const upper = options.slice(Math.floor(options.length / 2))
			const below = options.filter((midi) => midi < last)
			const pool =
				last < 0
					? upper
					: below.length > 0 && random(rngKeys) < 0.7
						? below
						: options.filter((midi) => midi !== last)
			const midi = pool[Math.floor(random(rngKeys) * pool.length)]
			playKey(midi, t, t >= horizon)
			last = midi
			t += between(rngKeys, keys.noteGapSeconds)
		}
		return t
	}

	const setTextures = (seconds: number) => {
		const room =
			AMBIENT.room.gain * (1 - mood * (1 - AMBIENT.room.dawnShare))
		const { night, dawn: day } = AMBIENT.pads.cutoffHz
		const cutoff = night * (day / night) ** mood
		if (seconds <= 0) {
			roomLevel.gain.value = room
			padFilter.frequency.value = cutoff
			birdLevel.gain.value = mood
			return
		}
		ramp(roomLevel.gain, room, seconds)
		ramp(padFilter.frequency, cutoff, seconds, true)
		ramp(birdLevel.gain, mood, seconds / 2)
	}

	/**
	 * The next chord of the walk: the tonic when the set has changed. A
	 * chord that is entirely behind `horizon` (a long stall) passes in
	 * silence; one that is merely late starts at the horizon, once the
	 * sounding chord's attack is over, so the harmony never stalls.
	 */
	const nextChord = (horizon: number) => {
		const set = dawn ? HARMONY.dawn : HARMONY.night
		const sameSet = walk?.set === set
		const index =
			walk && sameSet
				? pick(rngChords, set.chords[walk.index].next)
				: set.tonic
		const duration = between(
			rngChords,
			dawn
				? AMBIENT.pads.chordSeconds.dawn
				: AMBIENT.pads.chordSeconds.night,
		)
		walk = { set, index }
		pulledFrom = null
		if (chordAt + duration <= horizon) {
			chordAt += duration
			return
		}
		const {
			attackSeconds,
			firstAttackSeconds,
			releaseSeconds,
			flipSeconds,
		} = AMBIENT.pads
		const start =
			chordAt < horizon
				? Math.max(horizon, chordStart + attackSeconds + 1)
				: chordAt
		const chord = set.chords[index]
		// Never more than two chords at once: the tail before last goes early.
		fading?.cut(start)
		sounding?.release(start, sameSet ? releaseSeconds : flipSeconds)
		fading = sounding
		sounding = playChord(
			chord,
			start,
			sounding
				? sameSet
					? attackSeconds
					: flipSeconds
				: firstAttackSeconds,
			built % 2,
		)
		built += 1
		chordLog.push({ at: start, chord })
		if (chordLog.length > 4) chordLog.shift()
		chordStart = start
		chordAt = Math.max(chordAt + duration, start + attackSeconds + 1)
	}

	return {
		setMood(next) {
			mood = Math.min(Math.max(next, 0), 1)
			const flip = mood > 0.5 !== dawn
			dawn = mood > 0.5
			setTextures(started ? AMBIENT.moodSeconds : 0)
			if (!flip || !started) return
			const set = dawn ? HARMONY.dawn : HARMONY.night
			if (pulledFrom !== null && walk?.set === set) {
				// Flipped back before the pulled tonic was built: the walk stands.
				chordAt = pulledFrom
				pulledFrom = null
				return
			}
			// The new set's tonic: no earlier than 3 s, never inside the current attack.
			const soon = Math.max(
				scheduledUntil,
				now() + 3,
				chordStart + AMBIENT.pads.attackSeconds + 1,
			)
			if (soon >= chordAt) return
			pulledFrom = pulledFrom ?? chordAt
			chordAt = soon
			// Notes decided for the old chord must not sound over the new one.
			for (const note of pending) if (note.at >= chordAt) note.silence()
			pending = pending.filter((note) => note.at < chordAt)
		},
		schedule(untilTime) {
			started = true
			const horizon = now() + AMBIENT.marginSeconds
			pending = pending.filter((note) => note.at > now())
			// In time order, so a phrase always knows the chord under it and
			// the sequence is the same however far ahead each call looks.
			for (;;) {
				const next = Math.min(chordAt, keyAt, birdAt)
				if (next >= untilTime) break
				if (next === chordAt) {
					nextChord(horizon)
				} else if (next === keyAt) {
					keyAt =
						playPhrase(keyAt, horizon) +
						between(rngKeys, AMBIENT.keys.phraseGapSeconds)
				} else {
					birdAt =
						(dawn ? birdPhrase(birdAt, horizon) : birdAt) +
						between(rngBirds, AMBIENT.birds.gapSeconds)
				}
			}
			scheduledUntil = Math.max(scheduledUntil, untilTime)
		},
		fadeTo(level, seconds) {
			ramp(master.gain, level, seconds)
		},
		dispose() {
			for (const source of [...live]) {
				try {
					source.stop()
				} catch {
					// Never started or already stopped.
				}
				source.disconnect()
			}
			live.clear()
			wowDepth.disconnect()
			master.disconnect()
		},
	}
}
