import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type FakeSource = {
	playbackRate: { value: number }
	start: ReturnType<typeof vi.fn>
	onended: (() => void) | null
}

const RATE = 48_000

/** 0.1 s of silence with a faint breath at 25 ms and the meow at 50 ms. */
function fakeBuffer() {
	const data = new Float32Array(RATE / 10)
	data[RATE / 40] = 0.005
	data[RATE / 20] = 0.5
	return {
		numberOfChannels: 1,
		length: data.length,
		sampleRate: RATE,
		duration: data.length / RATE,
		getChannelData: () => data,
	}
}

function createFakeAudio() {
	const sources: FakeSource[] = []
	const constructed = vi.fn()
	const decodedOffline = vi.fn()
	const decodedLive = vi.fn()

	class FakeAudioContext {
		state = 'running'
		destination = {}
		resume = vi.fn(async () => {})
		decodeAudioData = vi.fn(async () => {
			decodedLive()
			return fakeBuffer()
		})

		constructor() {
			constructed()
		}

		createGain() {
			return {
				gain: { value: 1 },
				connect: (node: unknown) => node,
				disconnect: vi.fn(),
			}
		}

		createBufferSource() {
			const source = {
				buffer: null,
				playbackRate: { value: 1 },
				connect: (node: unknown) => node,
				disconnect: vi.fn(),
				start: vi.fn(),
				onended: null as (() => void) | null,
			}
			sources.push(source)
			return source
		}
	}

	class FakeOfflineAudioContext {
		decodeAudioData = vi.fn(async () => {
			decodedOffline()
			return fakeBuffer()
		})
	}

	return {
		FakeAudioContext,
		FakeOfflineAudioContext,
		constructed,
		decodedOffline,
		decodedLive,
		sources,
	}
}

async function load() {
	vi.resetModules()
	const sound = await import('./cat-sound')
	const store = await import('./sound-enabled')
	return { ...sound, ...store }
}

/** Lets the fetch and decode promise chain settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('playCatSound', () => {
	let audio: ReturnType<typeof createFakeAudio>
	const okFetch = vi.fn(async () => ({
		ok: true,
		status: 200,
		arrayBuffer: async () => new ArrayBuffer(8),
	}))

	beforeEach(() => {
		window.localStorage.clear()
		audio = createFakeAudio()
		vi.stubGlobal('AudioContext', audio.FakeAudioContext)
		vi.stubGlobal('OfflineAudioContext', audio.FakeOfflineAudioContext)
		vi.stubGlobal('fetch', okFetch)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	it('is a no-op while muted', async () => {
		const { playCatSound, setSoundEnabled } = await load()
		setSoundEnabled(false)

		playCatSound()
		await settle()

		expect(audio.constructed).not.toHaveBeenCalled()
		expect(okFetch).not.toHaveBeenCalled()
	})

	it('prefetches and decodes offline without creating a context', async () => {
		const { prefetchCatSound } = await load()

		await prefetchCatSound()
		await prefetchCatSound()

		expect(okFetch).toHaveBeenCalledTimes(1)
		expect(audio.decodedOffline).toHaveBeenCalledTimes(1)
		expect(audio.constructed).not.toHaveBeenCalled()
	})

	it('starts at once after the prefetch, past the leading silence', async () => {
		const { playCatSound, prefetchCatSound } = await load()
		await prefetchCatSound()

		playCatSound()

		const start = audio.sources[0]?.start
		expect(start).toHaveBeenCalledTimes(1)
		expect(start?.mock.calls[0]?.[0]).toBe(0)
		expect(start?.mock.calls[0]?.[1]).toBeCloseTo(0.05 - 0.01, 6)
		expect(audio.decodedLive).not.toHaveBeenCalled()
	})

	it('varies the rate and caps voices at 4', async () => {
		const { playCatSound, prefetchCatSound } = await load()
		await prefetchCatSound()

		for (let i = 0; i < 6; i++) playCatSound()

		expect(audio.constructed).toHaveBeenCalledTimes(1)
		expect(okFetch).toHaveBeenCalledTimes(1)
		expect(audio.sources).toHaveLength(4)
		for (const source of audio.sources) {
			expect(source.start).toHaveBeenCalled()
			expect(source.playbackRate.value).toBeGreaterThanOrEqual(0.92)
			expect(source.playbackRate.value).toBeLessThanOrEqual(1.12)
		}

		audio.sources[0]?.onended?.()
		playCatSound()
		expect(audio.sources).toHaveLength(5)
	})

	it('resumes a context the browser started suspended and starts without waiting', async () => {
		const resume = vi.fn(() => new Promise<void>(() => {}))
		vi.stubGlobal(
			'AudioContext',
			class extends audio.FakeAudioContext {
				state = 'suspended'
				resume = resume
			},
		)
		const { playCatSound, prefetchCatSound } = await load()
		await prefetchCatSound()

		playCatSound()

		expect(resume).toHaveBeenCalledTimes(1)
		expect(audio.sources[0]?.start).toHaveBeenCalled()
	})

	it('plays a boop that beats the prefetch once the meow arrives', async () => {
		const { playCatSound } = await load()

		playCatSound()
		expect(audio.sources).toHaveLength(0)
		await settle()

		expect(okFetch).toHaveBeenCalledTimes(1)
		expect(audio.sources).toHaveLength(1)
		expect(audio.sources[0]?.start).toHaveBeenCalled()
	})

	it('drops a boop whose meow arrives too late to belong to it', async () => {
		const now = vi.spyOn(performance, 'now').mockReturnValue(1000)
		const { playCatSound } = await load()

		playCatSound()
		now.mockReturnValue(1300)
		await settle()

		expect(audio.sources).toHaveLength(0)
		playCatSound()
		expect(audio.sources).toHaveLength(1)
	})

	it('stays silent when muted while the file is still loading', async () => {
		const { playCatSound, setSoundEnabled } = await load()

		playCatSound()
		setSoundEnabled(false)
		await settle()

		expect(okFetch).toHaveBeenCalledTimes(1)
		expect(audio.sources).toHaveLength(0)
	})

	it('decodes on the live context where no offline one exists', async () => {
		vi.stubGlobal('OfflineAudioContext', undefined)
		const { playCatSound } = await load()

		playCatSound()
		await settle()

		expect(audio.decodedLive).toHaveBeenCalledTimes(1)
		expect(audio.sources).toHaveLength(1)
	})

	it('warns exactly once when the file is missing and never throws', async () => {
		const missing = vi.fn(async () => ({ ok: false, status: 404 }))
		vi.stubGlobal('fetch', missing)
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { playCatSound, prefetchCatSound } = await load()

		await expect(prefetchCatSound()).resolves.toBeUndefined()
		expect(() => playCatSound()).not.toThrow()
		playCatSound()
		await settle()

		expect(missing).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0]?.[0]).toContain('public/sounds/cat-click.mp3')
		expect(audio.sources).toHaveLength(0)
	})
})

describe('prefetchCatSoundWhenIdle', () => {
	afterEach(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	it('waits for an idle moment (2 s at most) and can be cancelled', async () => {
		const fetch = vi.fn(async () => ({
			ok: true,
			status: 200,
			arrayBuffer: async () => new ArrayBuffer(8),
		}))
		vi.stubGlobal('fetch', fetch)
		vi.stubGlobal(
			'OfflineAudioContext',
			createFakeAudio().FakeOfflineAudioContext,
		)
		const idle: Array<() => void> = []
		const request = vi.fn(
			(run: () => void, _options?: { timeout: number }) => {
				idle.push(run)
				return idle.length
			},
		)
		const cancel = vi.fn()
		vi.stubGlobal('requestIdleCallback', request)
		vi.stubGlobal('cancelIdleCallback', cancel)
		const { prefetchCatSoundWhenIdle } = await load()

		prefetchCatSoundWhenIdle()()
		expect(cancel).toHaveBeenCalledWith(1)

		prefetchCatSoundWhenIdle()
		expect(request).toHaveBeenLastCalledWith(expect.any(Function), {
			timeout: 2000,
		})
		expect(fetch).not.toHaveBeenCalled()
		idle[1]?.()
		await settle()
		expect(fetch).toHaveBeenCalledTimes(1)
	})
})
