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
		const spot = await page.locator('#stack').evaluate((node) => {
			const rect = node.getBoundingClientRect()
			return { x: rect.right - 60, y: Math.max(rect.top + 60, 140) }
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

	await session({ width: 390, height: 844 }, async (page, { height }) => {
		await shot(page, '12-lite-hero-390x844')
		await scrollTo(page, height * 0.6)
		await shot(page, '13-lite-hero-fade')
		await scrollIntoView(page, '#stack', 600)
		await shot(page, '14-lite-stack')
		await scrollIntoView(page, '[data-stage="finale"] [data-slot]', 1200)
		await shot(page, '15-lite-finale')
		await page.evaluate(() =>
			window.scrollTo(0, document.documentElement.scrollHeight),
		)
		await page.waitForTimeout(1000)
		await shot(page, '16-lite-credits')
	})
} finally {
	await browser.close()
}
