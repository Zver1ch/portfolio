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

	test('sound is on by default; the first gesture starts the ambient; the toggle mutes and unmutes it; a stored mute survives a reload', async ({
		page,
	}) => {
		await spyOnAudio(page)
		await gotoHydrated(page)
		await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
			timeout: READY_TIMEOUT,
		})
		await expect(
			page.getByRole('button', { name: 'Enable sound' }),
		).toHaveCount(0)
		const toggle = page.getByRole('button', { name: 'Sound' })
		await expect(toggle).toHaveAttribute('aria-pressed', 'true')
		// Headless Chromium does not enforce the autoplay policy, so the
		// gesture only has to be harmless here.
		await page.keyboard.press('Shift')
		// The room tone, the LFOs and the opening chord start at
		// once; the first felt-piano phrase is scheduled within seconds.
		await expect
			.poll(async () => (await audioState(page)).starts)
			.toBeGreaterThanOrEqual(5)
		const opening = (await audioState(page)).starts
		await expect
			.poll(async () => (await audioState(page)).starts, {
				timeout: 15_000,
			})
			.toBeGreaterThan(opening)
		expect((await audioState(page)).states).toContain('running')

		await toggle.click()
		await expect(toggle).toHaveAttribute('aria-pressed', 'false')
		await page.waitForTimeout(500)
		const muted = (await audioState(page)).starts
		await page.waitForTimeout(3500)
		expect((await audioState(page)).starts).toBe(muted)

		await toggle.click()
		await expect(toggle).toHaveAttribute('aria-pressed', 'true')
		await expect
			.poll(async () => (await audioState(page)).starts, {
				timeout: 15_000,
			})
			.toBeGreaterThan(muted)

		await toggle.click()
		await expect(toggle).toHaveAttribute('aria-pressed', 'false')
		await page.reload()
		await gotoHydrated(page)
		await expect(toggle).toHaveAttribute('aria-pressed', 'false')
		await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
			timeout: READY_TIMEOUT,
		})
		await page.keyboard.press('Shift')
		await page.waitForTimeout(800)
		expect((await audioState(page)).starts).toBe(0)
	})
})

test.describe('offline loudness', () => {
	test.use({ viewport: DESKTOP })

	// Stereo, the page's seed, long enough to hold chord changes; the third
	// case flips to dawn part-way, as a reader reaching the finale does.
	const SECONDS = 40
	const cases = [
		{ name: 'at night', mood: 0 },
		{ name: 'at dawn', mood: 1 },
		{ name: 'from night to dawn at 15 s', mood: 0, flipAt: 15 },
	]
	for (const { name, mood, flipAt } of cases) {
		test(`the ambient ${name} renders each channel between -34 and -26 dBFS RMS with peaks under -9 dBFS`, async ({
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
				async ({ code, mood, flipAt, seconds }) => {
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
					const rate = 44100
					const ctx = new OfflineAudioContext(2, rate * seconds, rate)
					const graph = mod.createAmbientGraph(ctx, ctx.destination)
					graph.setMood(mood)
					graph.fadeTo(mod.AMBIENT.master, 0.01)
					if (flipAt === undefined) {
						graph.schedule(seconds)
					} else {
						// As the page does: scheduled up to the flip, then from it.
						graph.schedule(flipAt)
						void ctx.suspend(flipAt).then(() => {
							graph.setMood(1)
							graph.schedule(seconds)
							return ctx.resume()
						})
					}
					const buffer = await ctx.startRendering()
					const channels = [0, 1].map((channel) => {
						const data = buffer.getChannelData(channel)
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
					})
					return {
						rms: channels.map((channel) => channel.rms),
						peak: Math.max(
							...channels.map((channel) => channel.peak),
						),
					}
				},
				{ code, mood, flipAt, seconds: SECONDS },
			)
			for (const rms of result.rms) {
				expect(rms).toBeGreaterThan(-34)
				expect(rms).toBeLessThan(-26)
			}
			expect(result.peak).toBeLessThanOrEqual(-9)
		})
	}
})
