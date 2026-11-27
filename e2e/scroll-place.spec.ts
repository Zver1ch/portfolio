import { expect, type Page, test } from '@playwright/test'
import { profile } from '../src/shared/config/profile'
import {
	collectProblems,
	DESKTOP,
	gotoHydrated,
	HEADER_HEIGHT,
	waitForScrollToSettle,
} from './helpers'

const READY_TIMEOUT = 80_000
const PHONE = { width: 390, height: 844 }
/**
 * Chromium keeps a reader's place by itself; WebKit does not, so the tests
 * take that away (on `body` too: in the mobile emulation `html` alone is
 * not enough, measured).
 */
const NO_SCROLL_ANCHORING = 'html,body{overflow-anchor:none}'

test.describe.configure({ mode: 'serial', timeout: 90_000 })

const html = (page: Page) => page.locator('html')
const heading = (page: Page, name: string) =>
	page.getByRole('heading', { level: 2, name, exact: true })
const top = async (page: Page, name: string) =>
	(await heading(page, name).boundingBox())?.y ?? Number.NaN

async function waitForRoom(page: Page, mode: 'full' | 'lite') {
	await expect(html(page)).toHaveAttribute('data-room-mode', mode)
	await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
		timeout: READY_TIMEOUT,
	})
}

async function scrollSectionToTop(page: Page, id: string) {
	await page
		.locator(`#${id}`)
		.evaluate((node) => node.scrollIntoView({ block: 'start' }))
	await waitForScrollToSettle(page)
}

/**
 * The page is laid out after hydration (pins, lite spacers) and again on a
 * mode switch; the reader must not notice (plan §3.4).
 */
test.describe('desktop: a fine pointer, Lenis running', () => {
	test.use({ viewport: DESKTOP })

	test('a resize out of full mode keeps the credits in view and never jumps back to the hash', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await gotoHydrated(page)
		await waitForRoom(page, 'full')
		await page.addStyleTag({ content: NO_SCROLL_ANCHORING })
		// A nav link leaves its hash in the URL.
		await page
			.getByRole('navigation', { name: 'Sections' })
			.getByRole('link', { name: 'About' })
			.click()
		await waitForScrollToSettle(page)
		await expect
			.poll(() => new URL(page.url()).hash, { timeout: 5000 })
			.toBe('#about')
		// Then the reader goes on to the credits.
		await page.evaluate(() =>
			window.scrollTo(0, document.documentElement.scrollHeight),
		)
		await waitForScrollToSettle(page)
		const credits = page.locator('[data-credits-roll]')
		const ccBy = page.getByRole('link', { name: 'CC BY 4.0' })
		await expect(ccBy).toBeInViewport()

		// The window narrows below the full query: pins go, lite spacers come.
		await page.setViewportSize({ width: 900, height: DESKTOP.height })
		await expect(html(page)).toHaveAttribute('data-room-mode', 'lite')
		// ScrollTrigger refreshes 0.2 s after a resize; nothing may move the page after that.
		await page.waitForTimeout(1000)
		await expect(ccBy).toBeInViewport()
		await expect(heading(page, 'About')).not.toBeInViewport()
		// Still at the credits, whole (the block is a different height in each
		// mode, so at the page's end it is the page's end that holds).
		const box = await credits.boundingBox()
		expect(box?.y).toBeGreaterThanOrEqual(0)
		expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
			DESKTOP.height + 1,
		)
		expect(problems).toEqual([])
	})

	test('a resize across the full query mid-page keeps the section under the reader, both ways', async ({
		page,
	}) => {
		await gotoHydrated(page)
		await waitForRoom(page, 'full')
		await page.addStyleTag({ content: NO_SCROLL_ANCHORING })
		await scrollSectionToTop(page, 'stack')
		const before = await top(page, 'Stack')
		expect(before).toBeGreaterThanOrEqual(HEADER_HEIGHT)

		// Only the height changes, so nothing above reflows: the shift is the
		// mode's alone (a screen's worth of pin spacer against lite's spacers).
		await page.setViewportSize({ width: DESKTOP.width, height: 600 })
		await expect(html(page)).toHaveAttribute('data-room-mode', 'lite')
		await page.waitForTimeout(600)
		expect(Math.abs((await top(page, 'Stack')) - before)).toBeLessThan(6)

		await page.setViewportSize(DESKTOP)
		await expect(html(page)).toHaveAttribute('data-room-mode', 'full')
		await page.waitForTimeout(600)
		expect(Math.abs((await top(page, 'Stack')) - before)).toBeLessThan(6)
		await expect(heading(page, 'Stack')).toBeInViewport()
	})

	test('Back between two nav-pushed hashes moves the page', async ({
		page,
	}) => {
		await gotoHydrated(page)
		await waitForRoom(page, 'full')
		const nav = page.getByRole('navigation', { name: 'Sections' })
		for (const [link, hash] of [
			['About', '#about'],
			['Stack', '#stack'],
		] as const) {
			await nav.getByRole('link', { name: link }).click()
			await waitForScrollToSettle(page)
			await expect
				.poll(() => new URL(page.url()).hash, { timeout: 5000 })
				.toBe(hash)
		}
		await page.goBack()
		await expect.poll(() => new URL(page.url()).hash).toBe('#about')
		await waitForScrollToSettle(page)
		await expect(heading(page, 'About')).toBeInViewport()
		const about = await top(page, 'About')
		expect(about).toBeGreaterThanOrEqual(HEADER_HEIGHT)
		expect(about).toBeLessThan(DESKTOP.height / 3)
	})
})

test.describe('phone: touch, no Lenis', () => {
	test.use({ viewport: PHONE, hasTouch: true, isMobile: true })

	test('a deep link lands on its section, not on the stuck first section', async ({
		page,
	}) => {
		await gotoHydrated(page, '/#about')
		await expect(html(page)).toHaveAttribute('data-room-mode', 'lite')
		await waitForScrollToSettle(page)
		await expect(heading(page, 'About')).toBeInViewport()
		const about = await top(page, 'About')
		expect(about).toBeGreaterThanOrEqual(HEADER_HEIGHT)
		expect(about).toBeLessThan(PHONE.height / 2)
		await expect(page.getByText(profile.statement)).not.toBeInViewport()
	})

	test('a reload mid-page comes back to the same section, not to the stale hash', async ({
		page,
	}) => {
		await gotoHydrated(page, '/#about')
		await expect(html(page)).toHaveAttribute('data-room-mode', 'lite')
		await waitForScrollToSettle(page)
		await scrollSectionToTop(page, 'stack')
		const before = await top(page, 'Stack')
		expect(before).toBeGreaterThanOrEqual(HEADER_HEIGHT)

		await page.reload()
		await gotoHydrated(page, `${new URL(page.url()).pathname}#about`)
		await expect(html(page)).toHaveAttribute('data-room-mode', 'lite')
		await waitForScrollToSettle(page)
		await expect(heading(page, 'Stack')).toBeInViewport()
		expect(Math.abs((await top(page, 'Stack')) - before)).toBeLessThan(6)
		await expect(heading(page, 'About')).not.toBeInViewport()
	})

	test('a fallback to static under the reader keeps their section where it was', async ({
		page,
	}) => {
		await gotoHydrated(page)
		await waitForRoom(page, 'lite')
		await page.addStyleTag({ content: NO_SCROLL_ANCHORING })
		await scrollSectionToTop(page, 'stack')
		const before = await top(page, 'Stack')
		expect(before).toBeGreaterThanOrEqual(HEADER_HEIGHT)

		// The context is lost: the room latches static and the lite spacers go.
		await page
			.locator('[data-room-layer] canvas')
			.evaluate((node: HTMLCanvasElement) => {
				const gl = node.getContext('webgl2') ?? node.getContext('webgl')
				gl?.getExtension('WEBGL_lose_context')?.loseContext()
			})
		await expect(html(page)).toHaveAttribute('data-room-mode', 'static', {
			timeout: READY_TIMEOUT,
		})
		await expect(page.locator('[data-stage-spacer]').first()).toBeHidden()
		await page.waitForTimeout(300)
		await expect(heading(page, 'Stack')).toBeInViewport()
		expect(Math.abs((await top(page, 'Stack')) - before)).toBeLessThan(4)
	})
})
