/**
 * Gate 2 round 6: the three phone variants (`?phone=a|b|c`, see
 * `src/features/cat-room/config/phone-variant.ts`) for the owner's choice,
 * from the production page at 390×844 in a touch context:
 *
 *   pnpm build && pnpm start
 *   pnpm assets:phone-variants [--url http://localhost:3000] [--out docs/lookdev/gate-2]
 *                              [--videos artifacts/phone-variants] [--variants a,b,c] [--no-video]
 *
 * Six JPG stills per variant go to `--out` as `r6-<variant>-NN-<beat>.jpg`
 * (the hero, the transition at 0.35 and 0.8, the landing, the finale at 0.4
 * and the credits), and a slow scroll through the whole page is recorded to
 * `--videos` as `<variant>.webm` (git-ignored). Headless Chromium with
 * software WebGL, device pixel ratio 1, so the frames are reproducible.
 */

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { launchBrowser } from './lib/browser.mjs'

const args = process.argv.slice(2)
const option = (name, fallback) => {
	const index = args.indexOf(name)
	return index >= 0 ? args[index + 1] : fallback
}
const url = option('--url', 'http://localhost:3000').replace(/\/$/, '')
const out = option('--out', 'docs/lookdev/gate-2')
const videos = option('--videos', 'artifacts/phone-variants')
const variants = option('--variants', 'a,b,c').split(',')
const withVideo = !args.includes('--no-video')
const JPEG_QUALITY = 88
const VIEWPORT = { width: 390, height: 844 }
/** The slow scroll of the video, seconds. */
const VIDEO_SECONDS = 17

mkdirSync(out, { recursive: true })
if (withVideo) mkdirSync(videos, { recursive: true })
const browser = await launchBrowser()

/** A phone context on a variant's page, the room's first frame drawn. */
async function open(variant, record) {
	const context = await browser.newContext({
		viewport: VIEWPORT,
		deviceScaleFactor: 1,
		isMobile: true,
		hasTouch: true,
		recordVideo: record ? { dir: videos, size: VIEWPORT } : undefined,
	})
	const page = await context.newPage()
	page.on('pageerror', (error) => console.error('page error:', error.message))
	page.on('console', (message) => {
		if (message.type() === 'error')
			console.error('console:', message.text())
	})
	await page.goto(`${url}/?phone=${variant}`)
	await page.waitForFunction(() => {
		const h1 = document.querySelector('h1')
		return (
			h1 !== null &&
			Object.keys(h1).some((key) => key.startsWith('__react'))
		)
	})
	await page.waitForFunction(
		(expected) =>
			document.documentElement.dataset.phoneVariant === expected,
		variant,
	)
	await page.waitForFunction(
		() => document.documentElement.dataset.sceneReady === 'true',
		null,
		{ timeout: 120_000 },
	)
	await page.waitForTimeout(1500)
	return { context, page }
}

/** A stage's track: where it starts and how far it scrolls (its height beyond the portal's). */
function track(page, stage) {
	return page.evaluate((name) => {
		const node = document.querySelector(`[data-stage="${name}"]`)
		const portal = node?.querySelector('[data-portal]')
		if (!node || !portal) throw new Error(`no ${name} stage`)
		return {
			top: node.getBoundingClientRect().top + window.scrollY,
			length: node.offsetHeight - portal.offsetHeight,
		}
	}, stage)
}

async function scrollTo(page, y) {
	await page.evaluate((top) => window.scrollTo(0, top), Math.round(y))
	await page.waitForTimeout(900)
}

async function shot(page, name) {
	const path = join(out, `${name}.jpg`)
	await page.screenshot({ path, type: 'jpeg', quality: JPEG_QUALITY })
	console.log(path)
}

async function stills(variant) {
	const { context, page } = await open(variant, false)
	const prefix = `r6-${variant}`
	await shot(page, `${prefix}-01-hero`)
	const hero = await track(page, 'hero')
	await scrollTo(page, hero.top + 0.35 * hero.length)
	await shot(page, `${prefix}-02-dive-p035`)
	await scrollTo(page, hero.top + 0.8 * hero.length)
	await shot(page, `${prefix}-03-dive-p080`)
	await scrollTo(page, hero.top + hero.length)
	await shot(page, `${prefix}-04-landing`)
	const finale = await track(page, 'finale')
	await scrollTo(page, finale.top + 0.4 * finale.length)
	await shot(page, `${prefix}-05-finale-p040`)
	await page.evaluate(() =>
		window.scrollTo(0, document.documentElement.scrollHeight),
	)
	await page.waitForTimeout(1200)
	await shot(page, `${prefix}-06-credits`)
	await context.close()
}

/** One slow scroll from the top to the end of the page, driven by animation frames. */
async function video(variant) {
	const { context, page } = await open(variant, true)
	await page.waitForTimeout(1500)
	await page.evaluate(
		(seconds) =>
			new Promise((resolve) => {
				const end =
					document.documentElement.scrollHeight - window.innerHeight
				const start = performance.now()
				const step = (now) => {
					const t = Math.min((now - start) / (seconds * 1000), 1)
					// Ease at both ends, like a thumb that starts and stops.
					const eased = t * t * (3 - 2 * t)
					window.scrollTo(0, end * eased)
					if (t < 1) requestAnimationFrame(step)
					else resolve()
				}
				requestAnimationFrame(step)
			}),
		VIDEO_SECONDS,
	)
	await page.waitForTimeout(1500)
	const recording = page.video()
	await context.close()
	if (recording) {
		const path = join(videos, `${variant}.webm`)
		await recording.saveAs(path)
		await recording.delete()
		console.log(path)
	}
}

try {
	for (const variant of variants) {
		await stills(variant)
		if (withVideo) await video(variant)
	}
} finally {
	await browser.close()
}
