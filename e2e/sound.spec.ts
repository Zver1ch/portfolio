import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { expect, type Page, test } from '@playwright/test'
import { DESKTOP, gotoHydrated } from './helpers'

const READY_TIMEOUT = 80_000

test.describe.configure({ mode: 'serial', timeout: 90_000 })

const html = (page: Page) => page.locator('html')

/**
 * Counts every started source and keeps the contexts. Buffer sources
 * override `start`, so both prototypes are wrapped.
 */
function spyOnAudio(page: Page) {
	return page.addInitScript(() => {
		const audio = { starts: 0, contexts: [] as AudioContext[] }
		Object.assign(window, { __audio: audio })
		const start = AudioScheduledSourceNode.prototype.start
		AudioScheduledSourceNode.prototype.start = function (...args) {
			audio.starts += 1
			return start.apply(this, args)
		}
		const startBuffer = AudioBufferSourceNode.prototype.start
		AudioBufferSourceNode.prototype.start = function (...args) {
			audio.starts += 1
			return startBuffer.apply(this, args)
		}
		const Original = window.AudioContext
		window.AudioContext = class extends Original {
			constructor(options?: AudioContextOptions) {
				super(options)
				audio.contexts.push(this)
			}
		}
	})
}
const audioState = (page: Page) =>
	page.evaluate(() => {
		const audio = (
			window as unknown as {
				__audio: { starts: number; contexts: AudioContext[] }
			}
		).__audio
		return {
			starts: audio.starts,
			states: audio.contexts.map((context) => context.state),
		}
	})

test.describe('full mode', () => {
	test.use({ viewport: DESKTOP })

	test('the prompt shows until a choice; enabling starts the ambient on a running context; muting silences it and persists', async ({
		page,
	}) => {
		await spyOnAudio(page)
		await gotoHydrated(page)
		await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
			timeout: READY_TIMEOUT,
		})
		const prompt = page.getByRole('button', { name: 'Enable sound' })
		await expect(prompt).toBeVisible()
		// Nothing plays before the opt-in.
		expect((await audioState(page)).starts).toBe(0)

		await prompt.click()
		await expect(prompt).toHaveCount(0)
		// The room tone, the tremolo, the two hum sines and the first pluck
		// (scheduled at once, two seconds ahead); the next pluck 5 to 11 s later.
		await expect
			.poll(async () => (await audioState(page)).starts)
			.toBeGreaterThanOrEqual(5)
		await expect
			.poll(async () => (await audioState(page)).starts, {
				timeout: 15_000,
			})
			.toBeGreaterThanOrEqual(6)
		expect((await audioState(page)).states).toContain('running')

		const toggle = page.getByRole('button', { name: 'Sound' })
		await expect(toggle).toHaveAttribute('aria-pressed', 'true')
		await toggle.click()
		await expect(toggle).toHaveAttribute('aria-pressed', 'false')
		await page.waitForTimeout(500)
		const muted = (await audioState(page)).starts
		await page.waitForTimeout(3500)
		expect((await audioState(page)).starts).toBe(muted)

		await page.reload()
		await gotoHydrated(page)
		await expect(toggle).toHaveAttribute('aria-pressed', 'false')
		await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
			timeout: READY_TIMEOUT,
		})
		await expect(prompt).toHaveCount(0)
		await page.waitForTimeout(800)
		expect((await audioState(page)).starts).toBe(0)
	})
})

test.describe('offline loudness', () => {
	test.use({ viewport: DESKTOP })

	for (const mood of [0, 1]) {
		test(`the ambient at mood ${mood} renders between -34 and -26 dBFS RMS with peaks under -9 dBFS`, async ({
			page,
		}) => {
			// Playwright runs from the repository root.
			const source = await readFile(
				'src/shared/lib/sound/ambient.ts',
				'utf8',
			)
			const code = stripTypeScriptTypes(source)
			await page.goto('about:blank')
			const result = await page.evaluate(
				async ({ code, mood }) => {
					const url = URL.createObjectURL(
						new Blob([code], { type: 'text/javascript' }),
					)
					const mod = (await import(
						/* webpackIgnore: true */ url
					)) as {
						AMBIENT: { master: number }
						createAmbientGraph(
							ctx: BaseAudioContext,
							out: AudioNode,
							seed?: number,
						): {
							setMood(mood: number): void
							schedule(until: number): void
							fadeTo(level: number, seconds: number): void
						}
					}
					const seconds = 10
					const rate = 44100
					const ctx = new OfflineAudioContext(1, rate * seconds, rate)
					const graph = mod.createAmbientGraph(
						ctx,
						ctx.destination,
						3,
					)
					graph.setMood(mood)
					graph.fadeTo(mod.AMBIENT.master, 0.01)
					graph.schedule(seconds)
					const buffer = await ctx.startRendering()
					const data = buffer.getChannelData(0)
					let sum = 0
					let peak = 0
					for (let i = 0; i < data.length; i++) {
						sum += data[i] * data[i]
						peak = Math.max(peak, Math.abs(data[i]))
					}
					return {
						rms: 20 * Math.log10(Math.sqrt(sum / data.length)),
						peak: 20 * Math.log10(peak),
					}
				},
				{ code, mood },
			)
			expect(result.rms).toBeGreaterThan(-34)
			expect(result.rms).toBeLessThan(-26)
			expect(result.peak).toBeLessThanOrEqual(-9)
		})
	}
})
