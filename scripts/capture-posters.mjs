/**
 * Renders the posters the page shows before (or instead of) the live room,
 * plus the Apple touch icon (plan §5):
 *
 *   pnpm assets:posters [--url http://localhost:3100]
 *
 *   public/posters/room-night.jpg            1920×1200  hero framing, night
 *   public/posters/room-night-portrait.jpg   1080×2340  lite hero framing (a phone's aspect), night
 *   public/posters/room-dawn.jpg             1920×1200  finale camera at p = 1, dawn
 *   public/posters/room-dawn-portrait.jpg    1080×2340  the lite dawn camera, portrait
 *   app/apple-icon.png                       180×180    the sticker on ink
 *
 * Everything comes from the dev-only lab with the fake screen, through
 * headless Chromium with software WebGL. Starts `next dev` on port 3100
 * unless `--url` points at a running server.
 */

import { mkdirSync } from 'node:fs'
import { launchBrowser } from './lib/browser.mjs'
import { startDevServer } from './lib/dev-server.mjs'

const POSTERS = [
	['public/posters/room-night.jpg', 'view=hero&t=2.4', 1920, 1200],
	[
		'public/posters/room-night-portrait.jpg',
		'view=hero&lite=1&t=2.4',
		1080,
		2340,
	],
	['public/posters/room-dawn.jpg', 'view=finale&p=1&t=2.4', 1920, 1200],
	[
		'public/posters/room-dawn-portrait.jpg',
		'view=finale&p=1&lite=1&t=2.4',
		1080,
		2340,
	],
]
const JPEG_QUALITY = 88
const ICON = 'app/apple-icon.png'
const ICON_SIZE = 180

const args = process.argv.slice(2)
const urlIndex = args.indexOf('--url')
const server =
	urlIndex >= 0
		? { url: args[urlIndex + 1], stop() {} }
		: await startDevServer()
const browser = await launchBrowser()
mkdirSync('public/posters', { recursive: true })

try {
	for (const [path, query, width, height] of POSTERS) {
		const page = await browser.newPage({
			viewport: { width, height },
			deviceScaleFactor: 1,
		})
		await page.goto(`${server.url}/lab?${query}`, {
			waitUntil: 'domcontentloaded',
		})
		await page.waitForFunction(() => Boolean(window.__lab), null, {
			timeout: 180_000,
		})
		await page.evaluate(() => window.__lab.ready)
		await page.screenshot({ path, type: 'jpeg', quality: JPEG_QUALITY })
		console.log(`${path}  (${width}×${height})  ${query}`)
		await page.close()
	}

	// The touch icon: the sticker centred on the page background.
	const page = await browser.newPage({
		viewport: { width: ICON_SIZE, height: ICON_SIZE },
		deviceScaleFactor: 1,
	})
	await page.setContent(
		`<body style="margin:0;background:#120d16"><img src="${server.url}/stickers/cat-sticker.png" style="display:block;width:${ICON_SIZE}px;height:${ICON_SIZE}px;object-fit:contain"></body>`,
	)
	await page.waitForFunction(() => {
		const img = document.querySelector('img')
		return Boolean(img?.complete && img.naturalWidth > 0)
	})
	await page.screenshot({ path: ICON, type: 'png' })
	console.log(`${ICON}  (${ICON_SIZE}×${ICON_SIZE})`)
	await page.close()
} finally {
	await browser.close()
	server.stop()
}
