import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const audio = vi.hoisted(() => ({
	context: {
		currentTime: 12,
		state: 'running',
		destination: { kind: 'destination' },
	},
	resumeAudio: vi.fn(async () => true),
}))
vi.mock('./audio-context', () => ({
	getAudioContext: () => audio.context,
	resumeAudio: audio.resumeAudio,
}))

const fake = vi.hoisted(() => {
	const graphs: {
		setMood: ReturnType<typeof vi.fn>
		schedule: ReturnType<typeof vi.fn>
		fadeTo: ReturnType<typeof vi.fn>
		dispose: ReturnType<typeof vi.fn>
	}[] = []
	return {
		graphs,
		createAmbientGraph: vi.fn(() => {
			const graph = {
				setMood: vi.fn(),
				schedule: vi.fn(),
				fadeTo: vi.fn(),
				dispose: vi.fn(),
			}
			graphs.push(graph)
			return graph
		}),
	}
})
vi.mock('./ambient', () => ({
	AMBIENT: { master: 0.5, fadeSeconds: 1.2 },
	createAmbientGraph: fake.createAmbientGraph,
}))

import {
	isAmbientRunning,
	resetAmbient,
	setAmbientMood,
	startAmbient,
	stopAmbient,
} from './ambient-engine'

describe('ambient engine', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		fake.graphs.length = 0
		audio.context.currentTime = 12
		audio.context.state = 'running'
		audio.resumeAudio.mockResolvedValue(true)
	})
	afterEach(() => {
		resetAmbient()
		vi.useRealTimers()
	})

	it('builds the graph with the mood, schedules ahead every second and fades in', async () => {
		setAmbientMood(1)
		await expect(startAmbient()).resolves.toBe(true)
		expect(fake.createAmbientGraph).toHaveBeenCalledWith(
			audio.context,
			audio.context.destination,
		)
		const [graph] = fake.graphs
		expect(graph.setMood).toHaveBeenCalledWith(1)
		expect(graph.schedule).toHaveBeenCalledWith(12 + 2.5)
		expect(graph.fadeTo).toHaveBeenCalledWith(0.5, 1.2)
		expect(isAmbientRunning()).toBe(true)

		audio.context.currentTime = 13
		vi.advanceTimersByTime(1000)
		expect(graph.schedule).toHaveBeenLastCalledWith(13 + 2.5)
		expect(graph.schedule).toHaveBeenCalledTimes(2)

		setAmbientMood(0)
		expect(graph.setMood).toHaveBeenLastCalledWith(0)
	})

	it('fades out on stop, releases the graph after the fade and rebuilds on the next start', async () => {
		await startAmbient()
		const [first] = fake.graphs
		stopAmbient()
		expect(isAmbientRunning()).toBe(false)
		expect(first.fadeTo).toHaveBeenLastCalledWith(0, 1.2)
		expect(first.dispose).not.toHaveBeenCalled()
		vi.advanceTimersByTime(1000)
		audio.context.currentTime = 13
		expect(first.schedule).toHaveBeenCalledTimes(1)
		expect(first.dispose).not.toHaveBeenCalled()
		audio.context.currentTime = 13.3
		vi.advanceTimersByTime(400)
		expect(first.dispose).toHaveBeenCalledTimes(1)

		setAmbientMood(1)
		await startAmbient()
		expect(fake.graphs).toHaveLength(2)
		expect(fake.graphs[1].setMood).toHaveBeenCalledWith(1)
		expect(fake.graphs[1].fadeTo).toHaveBeenCalledWith(0.5, 1.2)
	})

	it('waits for the context to reach the end of the fade before releasing', async () => {
		await startAmbient()
		const [graph] = fake.graphs
		stopAmbient()
		// The wall clock runs, the context lags: the release is pushed back.
		vi.advanceTimersByTime(1300)
		expect(graph.dispose).not.toHaveBeenCalled()
		audio.context.currentTime = 12.6
		vi.advanceTimersByTime(1300)
		expect(graph.dispose).not.toHaveBeenCalled()
		audio.context.currentTime = 13.2
		vi.advanceTimersByTime(700)
		expect(graph.dispose).toHaveBeenCalledTimes(1)
	})

	it('releases at once when the context is not running, since nothing plays', async () => {
		await startAmbient()
		const [graph] = fake.graphs
		stopAmbient()
		audio.context.state = 'suspended'
		vi.advanceTimersByTime(1300)
		expect(graph.dispose).toHaveBeenCalledTimes(1)
	})

	it('keeps the graph when started again during the fade-out', async () => {
		await startAmbient()
		stopAmbient()
		vi.advanceTimersByTime(600)
		await startAmbient()
		vi.advanceTimersByTime(2000)
		expect(fake.graphs).toHaveLength(1)
		expect(fake.graphs[0].dispose).not.toHaveBeenCalled()
		expect(fake.graphs[0].fadeTo).toHaveBeenLastCalledWith(0.5, 1.2)
		expect(isAmbientRunning()).toBe(true)
	})

	it('stays silent when the context will not resume', async () => {
		audio.resumeAudio.mockResolvedValueOnce(false)
		await expect(startAmbient()).resolves.toBe(false)
		expect(fake.graphs).toHaveLength(0)
		expect(isAmbientRunning()).toBe(false)
	})

	it('lets a stop during the resume win', async () => {
		let resume: (ok: boolean) => void = () => {}
		audio.resumeAudio.mockImplementationOnce(
			() =>
				new Promise<boolean>((resolve) => {
					resume = resolve
				}),
		)
		const pending = startAmbient()
		stopAmbient()
		resume(true)
		await expect(pending).resolves.toBe(false)
		expect(fake.graphs).toHaveLength(0)
		expect(isAmbientRunning()).toBe(false)
	})
})
