import { expect, type Page, test } from '@playwright/test'
import { collectProblems, gotoHydrated } from './helpers'

const READY_TIMEOUT = 80_000
/** The hero stage pins for this many viewport heights (plan §3.4). */
const DIVE_HEIGHTS = 2.2

/**
 * The smallest comfortable full-mode viewport: software WebGL renders every
 * pixel on the CPU, and with the rest of the suite in parallel the page's
 * main thread is what a click has to wait for. Fewer pixels, quicker clicks.
 */
const GAG_VIEWPORT = { width: 1120, height: 720 }

// The peek lasts 3.2 s of wall time: one retry absorbs a stalled renderer.
test.describe.configure({ mode: 'serial', timeout: 90_000, retries: 1 })

const html = (page: Page) => page.locator('html')

/** Through the dive: the page is the page and the cat lives at its edges. */
async function enterTheMonitor(page: Page) {
	await gotoHydrated(page)
	await expect(html(page)).toHaveAttribute('data-room-mode', 'full')
	await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
		timeout: READY_TIMEOUT,
	})
	await page.evaluate(
		(heights) =>
			window.scrollTo(0, Math.round(1.02 * heights * window.innerHeight)),
		DIVE_HEIGHTS,
	)
	await page.waitForTimeout(600)
	await expect(html(page)).toHaveAttribute('data-room-phase', 'inside')
}

async function scrollTo(page: Page, selector: string) {
	await page
		.locator(selector)
		.evaluate((node) => node.scrollIntoView({ block: 'start' }))
	await page.waitForTimeout(400)
}

test.describe('full mode', () => {
	test.use({ viewport: GAG_VIEWPORT })

	test('the first section entry peeks from the bottom edge, pointer-only; the head meows; Escape stops it', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await enterTheMonitor(page)
		// No settling wait: the peek lasts a few seconds from the moment the
		// section crosses the middle, and every moment of it counts below.
		await page
			.locator('#about')
			.evaluate((node) => node.scrollIntoView({ block: 'start' }))
		// Under software rendering, with the rest of the suite in parallel, a
		// round trip to the page can take half a second and the peek lasts a
		// few seconds: the page itself watches, frame by frame, for the peek
		// and its placed head, and hands back everything to check in one go.
		// The click then goes to the measured point directly (the head
		// breathes, so it is never "stable" for an actionability check).
		const head = page.locator('[data-gag-proxy]')
		const layer = page.locator('[data-room-layer]')
		const peek = await page
			.waitForFunction(
				() => {
					const root = document.documentElement
					if (root.getAttribute('data-room-gag') !== 'peek')
						return null
					const proxy =
						document.querySelector<HTMLElement>('[data-gag-proxy]')
					if (!proxy || proxy.style.display === 'none') return null
					const rect = proxy.getBoundingClientRect()
					// Enough of the head on screen for a point to click.
					if (rect.width < 1 || rect.y > window.innerHeight - 24)
						return null
					const roomLayer =
						document.querySelector('[data-room-layer]')
					return {
						x: rect.x,
						y: rect.y,
						width: rect.width,
						height: rect.height,
						layerVisible:
							roomLayer !== null &&
							getComputedStyle(roomLayer).visibility !== 'hidden',
						ariaHidden: proxy.getAttribute('aria-hidden'),
						tabindex: proxy.getAttribute('tabindex'),
					}
				},
				null,
				{ timeout: 5000, polling: 'raf' },
			)
			.then((handle) => handle.jsonValue())
		// Resolved only on a truthy result; the type is wider than that.
		if (!peek) throw new Error('the peek never came')
		const { x, y, width, height, layerVisible, ariaHidden, tabindex } = peek
		// The proxy appears as soon as the head's top crosses the bottom edge,
		// with most of its box still below the viewport: on a quick machine
		// the point a third of the way down may not be on screen yet, so the
		// click stays inside the viewport, on the part of the head that shows.
		await page.mouse.click(
			x + width / 2,
			Math.min(y + height * 0.3, GAG_VIEWPORT.height - 12),
		)
		await expect(page.getByTestId('boop-count')).toHaveText('1')
		expect(layerVisible).toBe(true)
		expect(ariaHidden).toBe('true')
		expect(tabindex).toBe('-1')
		// Drawn only in the bottom band of the viewport.
		expect(y).toBeGreaterThan(GAG_VIEWPORT.height * 0.6)

		await page.keyboard.press('Escape')
		await expect(html(page)).not.toHaveAttribute('data-room-gag', /./)
		await expect(layer).toBeHidden()
		await expect(head).toBeHidden()
		expect(problems).toEqual([])
	})

	test('a tap on an empty area and the header button drop a fish; a tap on a link does not', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await enterTheMonitor(page)
		await scrollTo(page, '#stack')
		// No automatic peek competes with the fish.
		await page.keyboard.press('Escape')
		await expect(html(page)).not.toHaveAttribute('data-room-gag', /./)

		// An empty spot at the section's right edge, below the "Enable sound"
		// chip that hangs under the header.
		const spot = await page.locator('#stack').evaluate((node) => {
			const rect = node.getBoundingClientRect()
			return { x: rect.right - 40, y: Math.max(rect.top + 40, 200) }
		})
		await page.mouse.click(spot.x, spot.y)
		await expect(html(page)).toHaveAttribute('data-room-gag', 'fish')
		await expect(page.locator('[data-room-layer]')).toBeVisible()
		await expect(html(page)).toHaveAttribute('data-fish-count', '1', {
			timeout: 8000,
		})
		await expect(html(page)).not.toHaveAttribute('data-room-gag', /./, {
			timeout: 8000,
		})
		await expect(page.locator('[data-room-layer]')).toBeHidden()

		await page.getByRole('button', { name: 'Feed the cat' }).click()
		await expect(html(page)).toHaveAttribute('data-fish-count', '2', {
			timeout: 8000,
		})

		// A link in main: the pointer events reach the handler and are ignored.
		await page
			.locator('main a')
			.first()
			.evaluate((link) => {
				const rect = link.getBoundingClientRect()
				const init = {
					bubbles: true,
					clientX: rect.left + 4,
					clientY: rect.top + 4,
					button: 0,
				}
				link.dispatchEvent(new PointerEvent('pointerdown', init))
				link.dispatchEvent(new PointerEvent('pointerup', init))
			})
		await page.waitForTimeout(300)
		await expect(html(page)).toHaveAttribute('data-fish-count', '2')
		expect(problems).toEqual([])
	})
})

test.describe('lite mode', () => {
	test.use({ viewport: { width: 390, height: 844 } })

	test('no gags and no Feed button on a phone', async ({ page }) => {
		await gotoHydrated(page)
		await expect(html(page)).toHaveAttribute('data-room-mode', 'lite')
		await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
			timeout: READY_TIMEOUT,
		})
		await scrollTo(page, '#about')
		await page.waitForTimeout(1200)
		await expect(html(page)).not.toHaveAttribute('data-room-gag', /./)
		await expect(
			page.getByRole('button', { name: 'Feed the cat' }),
		).toHaveCount(0)
	})
})
