import { expect, type Page, test } from '@playwright/test'
import { profile } from '../src/shared/config/profile'
import {
	collectProblems,
	countMeows,
	DESKTOP,
	gotoHydrated,
	HEADER_HEIGHT,
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

	/** Scrolls the finale's track to `p`: the stage's top plus its height beyond the stuck statement. */
	const liteFinaleTo = async (page: Page, p: number) => {
		await page.evaluate((progress) => {
			const stage = document.querySelector<HTMLElement>(
				'[data-stage="finale"]',
			)
			const portal = stage?.querySelector<HTMLElement>('[data-portal]')
			if (!stage || !portal) throw new Error('no finale stage')
			const top = stage.getBoundingClientRect().top + window.scrollY
			window.scrollTo(
				0,
				Math.round(
					top + progress * (stage.offsetHeight - portal.offsetHeight),
				),
			)
		}, p)
		await page.waitForTimeout(600)
	}

	test('the statement sticks, shrinks into the monitor as the camera pulls back; the credits roll in under the cat', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await waitForRoom(page, 'lite')
		await expect(page.locator('.pin-spacer')).toHaveCount(0)

		// The statement arrives as a page section: nothing is drawn yet.
		await liteFinaleTo(page, 0)
		await expect(html(page)).toHaveAttribute('data-room-phase', 'off')
		await expect(page.locator('[data-room-layer]')).toBeHidden()
		await expect(page.getByText(profile.footerStatement)).toBeInViewport()
		await expect(finalePortal(page)).toHaveCSS('position', 'sticky')

		// Further on: the room is drawn around the stuck statement,
		// which shrinks into the monitor.
		await liteFinaleTo(page, 0.3)
		await expect(html(page)).toHaveAttribute('data-room-phase', 'finale')
		await expect(page.locator('[data-room-layer]')).toBeVisible()
		await expect(finalePortal(page)).toHaveCSS('transform', /^matrix3d/)

		// The end of the page: the dawn room with the cat above the credits.
		await scrollToEnd(page)
		await expect(html(page)).toHaveAttribute('data-room-phase', 'finale')
		const ccBy = page.getByRole('link', { name: 'CC BY 4.0' })
		await expect(ccBy).toBeInViewport()
		await expect(ccBy).toHaveAttribute(
			'href',
			'https://creativecommons.org/licenses/by/4.0/',
		)
		const cat = liveCat(page)
		await expect(cat).toBeVisible()
		await expect(cat).toBeEnabled()
		const [catBox, creditsBox] = await Promise.all([
			cat.boundingBox(),
			page.locator('[data-credits-roll]').boundingBox(),
		])
		expect(catBox).not.toBeNull()
		expect(creditsBox).not.toBeNull()
		// The credits start below the cat's middle: its face stays in reach.
		expect((catBox as { y: number; height: number }).y).toBeGreaterThan(
			HEADER_HEIGHT,
		)
		expect(
			(catBox as { y: number; height: number }).y +
				(catBox as { y: number; height: number }).height / 2,
		).toBeLessThan((creditsBox as { y: number }).y)
		await cat.click()
		await expect(page.getByTestId('boop-count')).toHaveText('1')
		expect(problems).toEqual([])
	})
})
