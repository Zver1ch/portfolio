import { expect, type Page, test } from '@playwright/test'
import { collectProblems, DESKTOP, gotoHydrated } from './helpers'

const READY_TIMEOUT = 80_000
/** The hero stage pins for this many viewport heights (plan §3.4). */
const DIVE_HEIGHTS = 2.2

test.describe.configure({ mode: 'serial', timeout: 90_000 })

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
	test.use({ viewport: DESKTOP })

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
		await expect(html(page)).toHaveAttribute('data-room-gag', 'peek', {
			timeout: 5000,
		})
		// Under software rendering, with the rest of the suite in parallel, a
		// round trip to the page can take half a second: read the peek's state
		// in one go, click the measured point directly (the head breathes, so
		// it is never "stable" for an actionability check) and leave only the
		// click's own effect to be checked afterwards.
		const head = page.locator('[data-gag-proxy]')
		const layer = page.locator('[data-room-layer]')
		await expect(head).toBeVisible()
		const [box, layerVisible, ariaHidden, tabindex] = await Promise.all([
			head.boundingBox(),
			layer.isVisible(),
			head.getAttribute('aria-hidden'),
			head.getAttribute('tabindex'),
		])
		expect(box).not.toBeNull()
		const { x, y, width, height } = box as {
			x: number
			y: number
			width: number
			height: number
		}
		await page.mouse.click(x + width / 2, y + height * 0.3)
		await expect(page.getByTestId('boop-count')).toHaveText('1')
		expect(layerVisible).toBe(true)
		expect(ariaHidden).toBe('true')
		expect(tabindex).toBe('-1')
		// Drawn only in the bottom band of the viewport.
		expect(y).toBeGreaterThan(DESKTOP.height * 0.6)

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

		const spot = await page.locator('#stack').evaluate((node) => {
			const rect = node.getBoundingClientRect()
			return { x: rect.right - 40, y: Math.max(rect.top + 40, 120) }
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
