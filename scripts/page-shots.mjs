/**
 * Stills of the production page at the moments the owner reviews (the Gate 2
 * package, plan §7):
 *
 *   pnpm build && pnpm start
 *   pnpm assets:page-shots [--url http://localhost:3000] [--out docs/lookdev/gate-2]
 *
 * Headless Chromium with software WebGL, device pixel ratio 1, so the frames
 * are reproducible on any machine; the owner looks at the real GPUs.
 */

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { launchBrowser } from './lib/browser.mjs'

const args = process.argv.slice(2)
const option = (name, fallback) => {
	const index = args.indexOf(name)
	return index >= 0 ? args[index + 1] : fallback
}
const url = option('--url', 'http://localhost:3000/')
const out = option('--out', 'docs/lookdev/gate-2')
const JPEG_QUALITY = 88
/** The hero and the finale pin for this many viewport heights (plan §3.4). */
const DIVE_HEIGHTS = 2.2
const FINALE_HEIGHTS = 1.8

mkdirSync(out, { recursive: true })
const browser = await launchBrowser()

/** Opens the page at a viewport, waits for the room's first frame, runs the shots. */
async function session(viewport, run) {
	const page = await browser.newPage({ viewport, deviceScaleFactor: 1 })
	page.on('pageerror', (error) => console.error('page error:', error.message))
	await page.goto(url)
	await page.waitForFunction(() => {
		const h1 = document.querySelector('h1')
		return (
			h1 !== null &&
			Object.keys(h1).some((key) => key.startsWith('__react'))
		)
	})
	await page.waitForFunction(
		() => document.documentElement.dataset.sceneReady === 'true',
		null,
		{ timeout: 120_000 },
	)
	await page.waitForTimeout(1500)
	await run(page, viewport)
	await page.close()
}

async function shot(page, name) {
	const path = join(out, `${name}.jpg`)
	await page.screenshot({ path, type: 'jpeg', quality: JPEG_QUALITY })
	console.log(path)
}

async function scrollTo(page, y) {
	await page.evaluate((top) => window.scrollTo(0, top), y)
	await page.waitForTimeout(900)
}

async function scrollIntoView(page, selector, settle = 800) {
	await page
		.locator(selector)
		.evaluate((node) => node.scrollIntoView({ block: 'start' }))
	await page.waitForTimeout(settle)
}

try {
	await session({ width: 1440, height: 900 }, async (page, { height }) => {
		await shot(page, '01-hero-1440x900')
		await page.mouse.move(700, 450)
		await page.waitForTimeout(600)
		await scrollTo(page, 0.5 * DIVE_HEIGHTS * height)
		await shot(page, '02-dive-mid-p050')
		await scrollTo(page, 0.8 * DIVE_HEIGHTS * height)
		await shot(page, '03-dive-late-p080')
		await scrollTo(page, 1.02 * DIVE_HEIGHTS * height)
		await shot(page, '04-inside-statement')
		// The first section entry inside the monitor always peeks.
		await scrollIntoView(page, '#about', 1300)
		await shot(page, '05-about-peek')
		await page.keyboard.press('Escape')
		await scrollIntoView(page, '#stack', 500)
		// Clear of the header.
		const spot = await page.locator('#stack').evaluate((node) => {
			const rect = node.getBoundingClientRect()
			return { x: rect.right - 60, y: Math.max(rect.top + 60, 200) }
		})
		await page.mouse.click(spot.x, spot.y)
		await page.waitForTimeout(450)
		await shot(page, '06-stack-fish-falls')
		await page.waitForTimeout(500)
		await shot(page, '07-stack-fish-caught')
		await page.waitForTimeout(2500)
		await scrollIntoView(page, '#contact')
		await shot(page, '08-contact')
		const footerTop = await page.evaluate(() => {
			const footer = document.querySelector('footer')
			return footer
				? footer.getBoundingClientRect().top + window.scrollY
				: 0
		})
		await scrollTo(page, footerTop + 0.3 * FINALE_HEIGHTS * height)
		await shot(page, '09-finale-p030')
		await scrollTo(page, footerTop + 0.6 * FINALE_HEIGHTS * height)
		await shot(page, '10-finale-p060')
		await page.evaluate(() =>
			window.scrollTo(0, document.documentElement.scrollHeight),
		)
		await page.waitForTimeout(1200)
		await shot(page, '11-finale-credits')
	})

	// The phone (Gate 2, round 5): lite runs the dive and the pull-back on
	// its stages' extra height, with the portal stuck under the room.
	await session({ width: 390, height: 844 }, async (page) => {
		const track = (stage) =>
			page.evaluate((name) => {
				const node = document.querySelector(`[data-stage="${name}"]`)
				const portal = node?.querySelector('[data-portal]')
				if (!node || !portal) throw new Error(`no ${name} stage`)
				return {
					top: node.getBoundingClientRect().top + window.scrollY,
					length: node.offsetHeight - portal.offsetHeight,
				}
			}, stage)
		await shot(page, 'r5-phone-01-hero')
		const dive = await track('hero')
		await scrollTo(page, dive.top + 0.5 * dive.length)
		await shot(page, 'r5-phone-02-dive-p050')
		await scrollTo(page, dive.top + 0.85 * dive.length)
		await shot(page, 'r5-phone-03-dive-p085')
		await scrollTo(page, dive.top + 0.95 * dive.length)
		await shot(page, 'r5-phone-04-dive-p095-crossfade')
		await scrollTo(page, dive.top + dive.length)
		await shot(page, 'r5-phone-05-landing')
		await scrollIntoView(page, '#stack', 600)
		await shot(page, 'r5-phone-06-stack')
		const finale = await track('finale')
		await scrollTo(page, finale.top + 0.06 * finale.length)
		await shot(page, 'r5-phone-07-finale-p006-fade-in')
		await scrollTo(page, finale.top + 0.4 * finale.length)
		await shot(page, 'r5-phone-08-finale-p040')
		await scrollTo(page, finale.top + finale.length)
		await shot(page, 'r5-phone-09-finale-dawn')
		await page.evaluate(() =>
			window.scrollTo(0, document.documentElement.scrollHeight),
		)
		await page.waitForTimeout(1000)
		await shot(page, 'r5-phone-10-credits')
	})
} finally {
	await browser.close()
}
