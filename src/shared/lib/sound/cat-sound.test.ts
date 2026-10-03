import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type FakeSource = {
	playbackRate: { value: number }
	start: ReturnType<typeof vi.fn>
	onended: (() => void) | null
}

function createFakeAudio() {
	const sources: FakeSource[] = []
	const constructed = vi.fn()

	class FakeAudioContext {
		state = 'running'
		destination = {}
		resume = vi.fn(async () => {})
		decodeAudioData = vi.fn(async () => ({ duration: 0.3 }))

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

	return { FakeAudioContext, constructed, sources }
}

async function load() {
	vi.resetModules()
	const sound = await import('./cat-sound')
	const store = await import('./sound-enabled')
	return { ...sound, ...store }
}

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
		vi.stubGlobal('fetch', okFetch)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	it('is a no-op while muted', async () => {
		const { playCatSound, setSoundEnabled } = await load()
		setSoundEnabled(false)

		await playCatSound()

		expect(audio.constructed).not.toHaveBeenCalled()
		expect(okFetch).not.toHaveBeenCalled()
	})

	it('fetches once, varies the rate and caps voices at 4', async () => {
		const { playCatSound } = await load()

		for (let i = 0; i < 6; i++) await playCatSound()

		expect(audio.constructed).toHaveBeenCalledTimes(1)
		expect(okFetch).toHaveBeenCalledTimes(1)
		expect(audio.sources).toHaveLength(4)
		for (const source of audio.sources) {
			expect(source.start).toHaveBeenCalled()
			expect(source.playbackRate.value).toBeGreaterThanOrEqual(0.92)
			expect(source.playbackRate.value).toBeLessThanOrEqual(1.12)
		}

		audio.sources[0]?.onended?.()
		await playCatSound()
		expect(audio.sources).toHaveLength(5)
	})

	it('warns exactly once when the file is missing and never throws', async () => {
		const missing = vi.fn(async () => ({ ok: false, status: 404 }))
		vi.stubGlobal('fetch', missing)
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const { playCatSound } = await load()

		await expect(playCatSound()).resolves.toBeUndefined()
		await playCatSound()
		await playCatSound()

		expect(missing).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn.mock.calls[0]?.[0]).toContain('public/sounds/cat-click.mp3')
		expect(audio.sources).toHaveLength(0)
	})
})
