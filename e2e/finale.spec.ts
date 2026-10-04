import { expect, type Page, test } from '@playwright/test'
import {
	collectProblems,
	countMeows,
	DESKTOP,
	gotoHydrated,
	meows,
	waitForScrollToSettle,
} from './helpers'

const READY_TIMEOUT = 80_000

test.describe.configure({ mode: 'serial', timeout: 90_000 })

const html = (page: Page) => page.locator('html')
const finalePortal = (page: Page) =>
	page.locator('[data-stage="finale"] [data-portal]')
/** The live room's pet target; the static face buttons are hidden while it runs. */
const liveCat = (page: Page) => page.locator('[data-pet-proxy]')

async function waitForRoom(page: Page, mode: 'full' | 'lite') {
	await gotoHydrated(page)
	await expect(html(page)).toHaveAttribute('data-room-mode', mode)
	await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
		timeout: READY_TIMEOUT,
	})
}

async function scrollToEnd(page: Page) {
	await page.evaluate(() =>
		window.scrollTo(0, document.documentElement.scrollHeight),
	)
	await waitForScrollToSettle(page)
	await page.waitForTimeout(600)
}

test.describe('full mode', () => {
	test.use({ viewport: DESKTOP })

	test('the finale pulls back out of the monitor into the dawn room, with the credits and the cat', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await countMeows(page)
		await waitForRoom(page, 'full')
		await scrollToEnd(page)

		await expect(html(page)).toHaveAttribute('data-room-phase', 'finale')
		await expect(page.locator('.pin-spacer')).toHaveCount(2)
		await expect(page.locator('[data-room-layer]')).toBeVisible()
		// The page has shrunk back into the monitor.
		await expect(finalePortal(page)).toHaveCSS('transform', /^matrix3d\(/)

		// The credits over the room, with working licence links.
		const ccBy = page.getByRole('link', { name: 'CC BY 4.0' })
		await expect(ccBy).toBeInViewport()
		await expect(ccBy).toHaveAttribute(
			'href',
			'https://creativecommons.org/licenses/by/4.0/',
		)
		await expect(page.locator('[data-credits]')).toContainText(
			'licensed under CC BY 4.0',
		)

		// The cat takes a pet: counter and meow.
		const cat = liveCat(page)
		await expect(cat).toBeVisible()
		await expect(cat).toBeEnabled()
		await cat.click()
		await expect(page.getByTestId('boop-count')).toHaveText('1')
		await expect.poll(() => meows(page)).toBeGreaterThanOrEqual(1)

		// Back to top: the night room again, the finale page at identity.
		await page.getByRole('link', { name: 'Back to top' }).click()
		await waitForScrollToSettle(page)
		await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
		await expect(html(page)).toHaveAttribute('data-room-phase', 'room')
		await expect(finalePortal(page)).toHaveCSS('transform', 'none')
		expect(problems).toEqual([])
	})
})

test.describe('lite mode', () => {
	test.use({ viewport: { width: 390, height: 844 } })

	test('the dawn room fades in under the credits and the cat can be petted', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await waitForRoom(page, 'lite')
		await scrollToEnd(page)
		await expect(html(page)).toHaveAttribute('data-room-phase', 'finale')
		await expect(page.locator('.pin-spacer')).toHaveCount(0)
		await expect(finalePortal(page)).toHaveCSS('transform', 'none')
		const opacity = await page
			.locator('[data-room-layer]')
			.evaluate((node) => Number((node as HTMLElement).style.opacity))
		expect(opacity).toBeGreaterThan(0.95)
		await expect(
			page.getByRole('link', { name: 'CC BY 4.0' }),
		).toBeInViewport()

		// With the dawn room on screen the live cat is the pet target.
		await page
			.locator('[data-stage="finale"] [data-slot]')
			.evaluate((node) => node.scrollIntoView({ block: 'start' }))
		await waitForScrollToSettle(page)
		await page.waitForTimeout(600)
		const cat = liveCat(page)
		await expect(cat).toBeVisible()
		await cat.click()
		await expect(page.getByTestId('boop-count')).toHaveText('1')
		expect(problems).toEqual([])
	})
})
