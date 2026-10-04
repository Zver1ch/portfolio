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
		await scrollTo(page, '#about')
		await expect(html(page)).toHaveAttribute('data-room-gag', 'peek', {
			timeout: 5000,
		})
		// The head breathes, so it is never "stable" for an actionability
		// check: click it where it is, right away, before the peek is over.
		const head = page.locator('[data-gag-proxy]')
		await expect(head).toBeVisible()
		const box = await head.boundingBox()
		expect(box).not.toBeNull()
		await head.click({ force: true })
		await expect(page.getByTestId('boop-count')).toHaveText('1')
		await expect(page.locator('[data-room-layer]')).toBeVisible()
		await expect(head).toHaveAttribute('aria-hidden', 'true')
		await expect(head).toHaveAttribute('tabindex', '-1')
		// Drawn only in the bottom band of the viewport.
		expect((box as { y: number }).y).toBeGreaterThan(DESKTOP.height * 0.6)

		await page.keyboard.press('Escape')
		await expect(html(page)).not.toHaveAttribute('data-room-gag', /./)
		await expect(page.locator('[data-room-layer]')).toBeHidden()
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
