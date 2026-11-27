import { describe, expect, it, vi } from 'vitest'
import { AMBIENT, createAmbientGraph, HARMONY } from './ambient'

/**
 * A fake BaseAudioContext that records nodes, automation and source
 * timings; jsdom has no Web Audio. The sample rate is low to keep the
 * generated buffers small.
 */

class FakeParam {
	events: { method: string; args: number[] }[] = []
	/** Gecko: the getter can reflect the timeline cut by a cancel. */
	afterCancel: number | undefined
	constructor(public value: number) {}
	private record(method: string, ...args: number[]) {
		this.events.push({ method, args })
		return this
	}
	setValueAtTime(value: number, at: number) {
		return this.record('set', value, at)
	}
	linearRampToValueAtTime(value: number, at: number) {
		return this.record('linear', value, at)
	}
	exponentialRampToValueAtTime(value: number, at: number) {
		return this.record('exponential', value, at)
	}
	cancelScheduledValues(at: number) {
		if (this.afterCancel !== undefined) this.value = this.afterCancel
		return this.record('cancel', at)
	}
	setValueCurveAtTime(values: Float32Array, at: number, seconds: number) {
		return this.record('curve', values.length, at, seconds)
	}
}

class FakeNode {
	targets: unknown[] = []
	inputs: number[] = []
	disconnect = vi.fn()
	connect(target: unknown, _output = 0, input = 0) {
		this.targets.push(target)
		this.inputs.push(input)
		return target instanceof FakeParam ? undefined : target
	}
}

class FakeGain extends FakeNode {
	gain = new FakeParam(1)
}

class FakeSource extends FakeNode {
	startedAt: number | null = null
	stoppedAt: number | null = null
	onended: (() => void) | null = null
	start(at = 0) {
		this.startedAt = at
	}
	stop(at = 0) {
		this.stoppedAt = at
	}
}

class FakeOscillator extends FakeSource {
	frequency = new FakeParam(440)
	detune = new FakeParam(0)
	wave: unknown = null
	setPeriodicWave(wave: unknown) {
		this.wave = wave
	}
}

class FakeBufferSource extends FakeSource {
	buffer: unknown = null
	loop = false
}

class FakeBiquad extends FakeNode {
	type = 'lowpass'
	frequency = new FakeParam(350)
	Q = new FakeParam(1)
}

class FakeConvolver extends FakeNode {
	buffer: FakeBuffer | null = null
}

class FakeWaveShaper extends FakeNode {
	curve: Float32Array | null = null
}

class FakeBuffer {
	private channels: Float32Array[]
	constructor(
		public numberOfChannels: number,
		public length: number,
		public sampleRate: number,
	) {
		this.channels = Array.from(
			{ length: numberOfChannels },
			() => new Float32Array(length),
		)
	}
	getChannelData(channel: number) {
		return this.channels[channel]
	}
}

class FakeContext {
	currentTime = 0
	sampleRate = 4000
	destination = new FakeNode()
	gains: FakeGain[] = []
	oscillators: FakeOscillator[] = []
	bufferSources: FakeBufferSource[] = []
	convolvers: FakeConvolver[] = []
	createGain() {
		const node = new FakeGain()
		this.gains.push(node)
		return node
	}
	createOscillator() {
		const node = new FakeOscillator()
		this.oscillators.push(node)
		return node
	}
	createBufferSource() {
		const node = new FakeBufferSource()
		this.bufferSources.push(node)
		return node
	}
	createBiquadFilter() {
		return new FakeBiquad()
	}
	createConvolver() {
		const node = new FakeConvolver()
		this.convolvers.push(node)
		return node
	}
	createWaveShaper() {
		return new FakeWaveShaper()
	}
	createChannelMerger() {
		return new FakeNode()
	}
	createPeriodicWave(real: Float32Array, imag: Float32Array) {
		return { real, imag }
	}
	createBuffer(channels: number, length: number, rate: number) {
		return new FakeBuffer(channels, length, rate)
	}
	get sources() {
		return [...this.oscillators, ...this.bufferSources]
	}
	get started() {
		return this.sources.filter((source) => source.startedAt !== null)
	}
}

const hzMidi = (hz: number) => Math.round(69 + 12 * Math.log2(hz / 440))

function build(seed?: number) {
	const ctx = new FakeContext()
	const graph = createAmbientGraph(
		ctx as unknown as BaseAudioContext,
		ctx.destination as unknown as AudioNode,
		seed,
	)
	return { ctx, graph }
}

/** Pad oscillators: the ones under the tape wow. */
const pads = (ctx: FakeContext) =>
	ctx.oscillators.filter((oscillator) =>
		ctx.gains.some((gain) => gain.targets.includes(oscillator.detune)),
	)

/** Bird oscillators: the ones whose frequency follows a curve. */
const birds = (ctx: FakeContext) =>
	ctx.oscillators.filter((oscillator) =>
		oscillator.frequency.events.some((event) => event.method === 'curve'),
	)

/** Every started source as (start, stop, pitch) for comparing renders. */
const timeline = (ctx: FakeContext) =>
	ctx.started.map((source) => [
		source.startedAt,
		source.stoppedAt,
		source instanceof FakeOscillator ? source.frequency.value : -1,
	])

describe('createAmbientGraph', () => {
	it('builds one reverb and the looped textures, and plays no chord before schedule', () => {
		const { ctx } = build()
		expect(ctx.convolvers).toHaveLength(1)
		expect(ctx.convolvers[0].buffer?.numberOfChannels).toBe(2)
		expect(ctx.convolvers[0].buffer?.length).toBe(
			Math.floor(
				ctx.sampleRate *
					(AMBIENT.reverb.seconds + AMBIENT.reverb.preDelaySeconds),
			),
		)
		const loops = ctx.bufferSources.filter((source) => source.loop)
		expect(loops).toHaveLength(1)
		expect(loops.every((source) => source.startedAt === 0)).toBe(true)
		expect(pads(ctx)).toHaveLength(0)
		// The LFOs: cutoff drift and tape wow.
		expect(ctx.oscillators.filter((o) => o.wave === null)).toHaveLength(2)
	})

	it('opens on the night tonic and plays the felt piano from its chord tones', () => {
		const { ctx, graph } = build()
		graph.schedule(10)
		const tonic = HARMONY.night.chords[HARMONY.night.tonic]
		const chord = pads(ctx)
		// One oscillator for the centred bass, a pair for every note above it.
		expect(chord).toHaveLength(tonic.notes.length * 2 - 1)
		expect(chord.every((o) => o.startedAt === AMBIENT.marginSeconds)).toBe(
			true,
		)
		const pitches = [
			...new Set(chord.map((o) => hzMidi(o.frequency.value))),
		]
		expect(pitches.sort((a, b) => a - b)).toEqual([...tonic.notes])
		const [bass, strong, weak] = chord.map((o) => o.frequency.value)
		expect(bass).toBeCloseTo(440 * 2 ** ((tonic.notes[0] - 69) / 12), 5)
		expect(Math.abs(strong - weak)).toBeCloseTo(AMBIENT.pads.pairHz, 5)

		const keys = ctx.oscillators.filter(
			(o) => o.wave === null && (o.startedAt ?? 0) > 0,
		)
		expect(keys.length).toBeGreaterThan(0)
		const tones = tonic.notes.map((midi) => midi % 12)
		for (const key of keys) {
			expect(key.startedAt).toBeGreaterThanOrEqual(
				AMBIENT.keys.firstSeconds[0],
			)
			expect(tones).toContain(hzMidi(key.frequency.value) % 12)
			expect(hzMidi(key.frequency.value)).toBeGreaterThanOrEqual(
				AMBIENT.keys.lowMidi.night,
			)
		}
		expect(birds(ctx)).toHaveLength(0)
	})

	it('at dawn opens on the major tonic, eases the room tone at once and lets the birds call', () => {
		const { ctx, graph } = build()
		const room = ctx.gains.find((g) => g.gain.value === AMBIENT.room.gain)
		expect(room).toBeDefined()
		graph.setMood(1)
		expect(room?.gain.value).toBeCloseTo(
			AMBIENT.room.gain * AMBIENT.room.dawnShare,
		)
		expect(room?.gain.events).toHaveLength(0)
		graph.schedule(10)
		const tonic = HARMONY.dawn.chords[HARMONY.dawn.tonic]
		const pitches = [
			...new Set(pads(ctx).map((o) => hzMidi(o.frequency.value))),
		]
		expect(pitches.sort((a, b) => a - b)).toEqual([...tonic.notes])
		expect(birds(ctx).length).toBeGreaterThanOrEqual(
			AMBIENT.birds.syllables[0],
		)
		for (const bird of birds(ctx)) {
			expect(bird.frequency.events[0].args[1]).toBeLessThan(10)
		}
	})

	it('ramps the textures and pulls the next chord close when the mood flips later', () => {
		const { ctx, graph } = build()
		graph.schedule(2.5)
		ctx.currentTime = 5
		const room = ctx.gains.find((g) => g.gain.value === AMBIENT.room.gain)
		graph.setMood(1)
		expect(room?.gain.events.map((e) => e.method)).toEqual([
			'cancel',
			'set',
			'linear',
		])
		expect(room?.gain.events[2].args).toEqual([
			AMBIENT.room.gain * AMBIENT.room.dawnShare,
			5 + AMBIENT.moodSeconds,
		])
		graph.schedule(30)
		const lift = pads(ctx).filter(
			(o) => (o.startedAt ?? 0) > AMBIENT.marginSeconds,
		)
		expect(lift.length).toBeGreaterThan(0)
		expect(lift[0].startedAt).toBe(8)
		const tonic = HARMONY.dawn.chords[HARMONY.dawn.tonic]
		expect(hzMidi(lift[0].frequency.value)).toBe(tonic.notes[0])
	})

	it('renders the same sequence for a seed, however far ahead each call looks', () => {
		const once = build(3)
		once.graph.schedule(40)
		const paged = build(3)
		for (let t = 2.5; t <= 40; t += 1) paged.graph.schedule(t)
		paged.graph.schedule(40)
		expect(timeline(paged.ctx)).toEqual(timeline(once.ctx))
		expect(timeline(once.ctx).length).toBeGreaterThan(30)

		const other = build(4)
		other.graph.schedule(40)
		expect(timeline(other.ctx)).not.toEqual(timeline(once.ctx))
	})

	it('walks the chords within the set and keeps their spacing', () => {
		const { ctx, graph } = build(11)
		graph.schedule(120)
		const starts = [
			...new Set(pads(ctx).map((o) => o.startedAt ?? 0)),
		].sort((a, b) => a - b)
		expect(starts.length).toBeGreaterThanOrEqual(5)
		for (let i = 1; i < starts.length; i++) {
			const gap = starts[i] - starts[i - 1]
			expect(gap).toBeGreaterThanOrEqual(
				AMBIENT.pads.chordSeconds.night[0],
			)
			expect(gap).toBeLessThanOrEqual(AMBIENT.pads.chordSeconds.night[1])
		}
		const names = HARMONY.night.chords.map((chord) =>
			[...chord.notes].sort((a, b) => a - b).join(),
		)
		for (const at of starts) {
			const notes = [
				...new Set(
					pads(ctx)
						.filter((o) => o.startedAt === at)
						.map((o) => hzMidi(o.frequency.value)),
				),
			].sort((a, b) => a - b)
			expect(names).toContain(notes.join())
		}
	})

	it('fades the master and releases everything on dispose', () => {
		const { ctx, graph } = build()
		graph.schedule(20)
		const master = ctx.gains.find((g) =>
			g.targets.includes(ctx.destination),
		)
		expect(master?.gain.value).toBe(0)
		graph.fadeTo(AMBIENT.master, 1.2)
		expect(master?.gain.events.at(-1)).toEqual({
			method: 'linear',
			args: [AMBIENT.master, 1.2],
		})

		graph.dispose()
		for (const source of ctx.started) {
			expect(source.stoppedAt).toBe(0)
			expect(source.disconnect).toHaveBeenCalled()
		}
		expect(master?.disconnect).toHaveBeenCalled()
	})

	it('keeps the key notes of a phrase inside the chord that sounds under them', () => {
		const { ctx, graph } = build(5)
		graph.schedule(90)
		const chordStarts = [
			...new Set(pads(ctx).map((o) => o.startedAt ?? 0)),
		].sort((a, b) => a - b)
		const keys = ctx.oscillators.filter(
			(o) => o.wave === null && (o.startedAt ?? 0) > 0,
		)
		expect(keys.length).toBeGreaterThan(3)
		for (const key of keys) {
			const at = key.startedAt ?? 0
			const start = chordStarts.filter((t) => t <= at).at(-1) ?? 0
			const notes = pads(ctx)
				.filter((o) => o.startedAt === start)
				.map((o) => hzMidi(o.frequency.value) % 12)
			expect(notes).toContain(hzMidi(key.frequency.value) % 12)
		}
	})

	it('spreads the pad pairs across both sides of the merger', () => {
		const { ctx, graph } = build()
		graph.schedule(1)
		const merger = ctx.gains
			.flatMap((g) => g.targets)
			.find(
				(t) =>
					t !== ctx.destination &&
					Object.getPrototypeOf(t) === FakeNode.prototype,
			)
		expect(merger).toBeDefined()
		// Every envelope's merger inputs; the centred bass feeds both.
		const sides = ctx.gains.flatMap((g) =>
			g.targets.flatMap((t, i) => (t === merger ? [g.inputs[i]] : [])),
		)
		expect(sides).toHaveLength(pads(ctx).length + 1)
		expect(sides.filter((side) => side === 0)).toHaveLength(
			sides.length / 2,
		)
		expect(sides.filter((side) => side === 1)).toHaveLength(
			sides.length / 2,
		)
	})

	it('reads a param before cancelling its timeline when ramping', () => {
		const { ctx, graph } = build()
		const master = ctx.gains.find((g) =>
			g.targets.includes(ctx.destination),
		)
		if (!master) throw new Error('no master')
		master.gain.value = 0.3
		master.gain.afterCancel = 0
		graph.fadeTo(0, 1.2)
		expect(master.gain.events.map((e) => e.method)).toEqual([
			'cancel',
			'set',
			'linear',
		])
		expect(master.gain.events[1].args[0]).toBe(0.3)
	})

	it('disconnects the wow from a pad oscillator once it has ended', () => {
		const { ctx, graph } = build()
		graph.schedule(1)
		const [oscillator] = pads(ctx)
		const wow = ctx.gains.find((g) => g.targets.includes(oscillator.detune))
		oscillator.onended?.()
		expect(wow?.disconnect).toHaveBeenCalledWith(oscillator.detune)
		expect(oscillator.disconnect).toHaveBeenCalled()
		expect(
			(oscillator.targets[0] as FakeGain).disconnect,
		).toHaveBeenCalled()
	})

	it('never lets a third chord sound through a flip: the oldest tail is cut', () => {
		// The reviewer's cases, at page cadence: a flip at 85 s on seed 3,
		// a flip and back three seconds apart on seed 7.
		for (const [seed, total, flips] of [
			[3, 125, [[85, 1]]],
			[
				7,
				140,
				[
					[99, 1],
					[102, 0],
				],
			],
		] as [number, number, [number, number][]][]) {
			const { ctx, graph } = build(seed)
			for (let t = 0; t <= total; t += 1) {
				ctx.currentTime = t
				for (const [at, mood] of flips)
					if (at === t) graph.setMood(mood)
				graph.schedule(t + 2.5)
			}
			const padSet = new Set<FakeSource>(pads(ctx))
			const started = ctx.started
			let chords = 0
			let sources = 0
			for (let t = 0; t < total; t += 0.05) {
				const live = started.filter(
					(s) =>
						(s.startedAt ?? 0) <= t &&
						t < (s.stoppedAt ?? Number.POSITIVE_INFINITY),
				)
				const livePads = live.filter((s) => padSet.has(s))
				chords = Math.max(
					chords,
					new Set(livePads.map((s) => s.startedAt)).size,
				)
				sources = Math.max(sources, live.length)
			}
			expect(chords).toBeLessThanOrEqual(2)
			expect(sources).toBeLessThanOrEqual(40)
			// The cut voice pins its curve, drops the rest and fades to nothing.
			const cut = ctx.gains.find((g) =>
				g.gain.events.some(
					(e, i, all) =>
						e.method === 'cancel' &&
						all[i + 1]?.method === 'linear',
				),
			)
			expect(cut).toBeDefined()
		}
	})

	it('silences notes decided for a chord the mood pull replaces, and never plays one over the wrong chord', () => {
		let silenced = 0
		for (let flipAt = 10; flipAt < 70; flipAt += 3) {
			const { ctx, graph } = build(7)
			for (let t = 0; t <= flipAt + 30; t += 1) {
				ctx.currentTime = t
				if (t === flipAt) graph.setMood(1)
				graph.schedule(t + 2.5)
			}
			const chordStarts = [
				...new Set(pads(ctx).map((o) => o.startedAt ?? 0)),
			].sort((a, b) => a - b)
			const keys = ctx.oscillators.filter(
				(o) => o.wave === null && (o.startedAt ?? 0) > 0,
			)
			for (const key of keys) {
				const at = key.startedAt ?? 0
				if (key.stoppedAt === at) {
					silenced += 1
					const envelope = key.targets[0] as FakeGain
					const last = envelope.gain.events.slice(-2)
					expect(last.map((e) => e.method)).toEqual(['cancel', 'set'])
					expect(last[1].args[0]).toBe(0)
					continue
				}
				const start = chordStarts.filter((t) => t <= at).at(-1) ?? 0
				const notes = pads(ctx)
					.filter((o) => o.startedAt === start)
					.map((o) => hzMidi(o.frequency.value) % 12)
				expect(notes).toContain(hzMidi(key.frequency.value) % 12)
			}
		}
		expect(silenced).toBeGreaterThan(0)
	})

	it('drops what a stalled clock has passed and restarts the harmony at the horizon', () => {
		const onTime = build(7)
		for (let t = 2.5; t <= 62.5; t += 1) {
			onTime.ctx.currentTime = t - 2.5
			onTime.graph.schedule(t)
		}
		const stalled = build(7)
		stalled.graph.schedule(2.5)
		stalled.ctx.currentTime = 1
		stalled.graph.schedule(3.5)
		// The main thread stalls for forty seconds.
		stalled.ctx.currentTime = 41
		stalled.graph.schedule(43.5)
		for (let t = 42; t <= 60; t += 1) {
			stalled.ctx.currentTime = t
			stalled.graph.schedule(t + 2.5)
		}
		const horizon = 41 + AMBIENT.marginSeconds
		const late = stalled.ctx.started.filter(
			(s) => (s.startedAt ?? 0) > 3.5 && (s.startedAt ?? 0) < horizon,
		)
		expect(late).toHaveLength(0)
		const catchUp = pads(stalled.ctx).filter((o) => o.startedAt === horizon)
		expect(catchUp.length).toBeGreaterThan(0)
		const envelope = catchUp[0].targets[0] as FakeGain
		// The first voice is the centred bass pair.
		expect(envelope.gain.events[1]).toEqual({
			method: 'linear',
			args: [
				(AMBIENT.pads.voice * (1 + AMBIENT.pads.pairLevel)) / 2,
				horizon + AMBIENT.pads.attackSeconds,
			],
		})
		// The walk itself is unchanged: the stalled run plays a subsequence of it.
		const sequence = (ctx: FakeContext) =>
			[...new Set(pads(ctx).map((o) => o.startedAt ?? 0))]
				.sort((a, b) => a - b)
				.map((at) =>
					[
						...new Set(
							pads(ctx)
								.filter((o) => o.startedAt === at)
								.map((o) => hzMidi(o.frequency.value)),
						),
					]
						.sort((a, b) => a - b)
						.join(),
				)
		const full = sequence(onTime.ctx)
		const played = sequence(stalled.ctx)
		expect(played.length).toBeGreaterThanOrEqual(3)
		expect(played.length).toBeLessThan(full.length)
		let i = 0
		for (const name of played) {
			while (i < full.length && full[i] !== name) i += 1
			expect(i).toBeLessThan(full.length)
			i += 1
		}
	})

	it('returns from dawn to night: the minor tonic comes, the room tone swells, the birds stop', () => {
		const { ctx, graph } = build()
		graph.setMood(1)
		graph.schedule(10)
		ctx.currentTime = 10
		const room = ctx.gains.find(
			(g) => g.gain.value === AMBIENT.room.gain * AMBIENT.room.dawnShare,
		)
		graph.setMood(0)
		expect(room?.gain.events[2].args).toEqual([
			AMBIENT.room.gain,
			10 + AMBIENT.moodSeconds,
		])
		graph.schedule(40)
		const back = pads(ctx).filter((o) => (o.startedAt ?? 0) > 1)
		expect(back[0].startedAt).toBe(13)
		const tonic = HARMONY.night.chords[HARMONY.night.tonic]
		expect(
			[
				...new Set(
					back
						.filter((o) => o.startedAt === 13)
						.map((o) => hzMidi(o.frequency.value)),
				),
			].sort((a, b) => a - b),
		).toEqual([...tonic.notes])
		for (const bird of birds(ctx)) {
			expect(bird.frequency.events[0].args[1]).toBeLessThan(13)
		}
	})

	it('lets a flip back before the pulled tonic leave the walk as it was', () => {
		const plain = build(7)
		plain.graph.schedule(60)
		const { ctx, graph } = build(7)
		graph.schedule(15)
		ctx.currentTime = 5
		graph.setMood(1)
		ctx.currentTime = 6
		graph.setMood(0)
		graph.schedule(60)
		const chords = (c: FakeContext) =>
			pads(c).map((o) => [o.startedAt, hzMidi(o.frequency.value)])
		expect(chords(ctx)).toEqual(chords(plain.ctx))
		expect(birds(ctx)).toHaveLength(0)
	})
})
