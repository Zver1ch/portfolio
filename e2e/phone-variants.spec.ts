import { expect, type Page, test } from '@playwright/test'
import { profile } from '../src/shared/config/profile'
import {
	collectProblems,
	DESKTOP,
	gotoHydrated,
	horizontalOverflow,
	waitForScrollToSettle,
} from './helpers'

/**
 * Gate 2 round 6: the three phone presentations behind `?phone=a|b|c`
 * (`src/features/cat-room/config/phone-variant.ts`), each scrolled through
 * on a phone like a reader would, until the owner picks one.
 */
const READY_TIMEOUT = 80_000
const PHONE = { width: 390, height: 844 }
const VARIANTS = ['a', 'b', 'c'] as const

// Software WebGL is slow: one room at a time, with room to breathe.
test.describe.configure({ mode: 'serial', timeout: 120_000 })

const html = (page: Page) => page.locator('html')

/** A stage's track: where it starts and how far it scrolls (its height beyond the portal's). */
const track = (page: Page, stage: 'hero' | 'finale') =>
	page.evaluate((name) => {
		const node = document.querySelector<HTMLElement>(
			`[data-stage="${name}"]`,
		)
		const portal = node?.querySelector<HTMLElement>('[data-portal]')
		if (!node || !portal) throw new Error(`no ${name} stage`)
		return {
			top: node.getBoundingClientRect().top + window.scrollY,
			length: node.offsetHeight - portal.offsetHeight,
		}
	}, stage)

/** Scrolls on by `step` until the end of the page, calling `check` at every stop. */
async function scrollThroughByTouch(
	page: Page,
	step: number,
	check: () => Promise<void>,
) {
	for (let i = 0; i < 200; i++) {
		const atBottom = await page.evaluate((by) => {
			window.scrollBy(0, by)
			return (
				window.scrollY + window.innerHeight >=
				document.documentElement.scrollHeight - 2
			)
		}, step)
		await page.waitForTimeout(80)
		await check()
		if (atBottom) break
	}
	await waitForScrollToSettle(page)
}

test.describe('phone', () => {
	test.use({ viewport: PHONE, hasTouch: true, isMobile: true })

	for (const variant of VARIANTS) {
		test(`variant ${variant}: the whole page scrolls clean, the name first, the statement and the credits in reach, the cat pettable`, async ({
			page,
		}) => {
			const problems = collectProblems(page)
			await gotoHydrated(page, `/?phone=${variant}`)
			await expect(html(page)).toHaveAttribute('data-room-mode', 'lite')
			await expect(html(page)).toHaveAttribute(
				'data-phone-variant',
				variant,
			)
			await expect(
				page.getByRole('heading', { level: 1 }),
			).toBeInViewport()
			await expect(html(page)).toHaveAttribute(
				'data-scene-ready',
				'true',
				{
					timeout: READY_TIMEOUT,
				},
			)
			await expect(page.locator('.pin-spacer')).toHaveCount(0)
			expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

			// The live cat takes a pet on the first screen.
			const proxy = page.locator('[data-pet-proxy]')
			await expect(proxy).toBeVisible()
			await expect(proxy).toBeEnabled()
			await proxy.click()
			await expect(page.getByTestId('boop-count')).toHaveText('1')

			// Every transition is at most one viewport height of scroll.
			const hero = await track(page, 'hero')
			const finale = await track(page, 'finale')
			expect(hero.length).toBeLessThanOrEqual(PHONE.height + 1)
			expect(finale.length).toBeLessThanOrEqual(PHONE.height + 1)

			await scrollThroughByTouch(page, 260, async () => {
				expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
			})
			await expect(
				page.getByRole('link', { name: 'CC BY 4.0' }),
			).toBeInViewport()
			await expect(
				page.getByRole('link', { name: 'Back to top' }),
			).toBeInViewport()
			await expect(html(page)).toHaveAttribute(
				'data-room-phase',
				'finale',
			)

			// Back at the landing the statement is the page: no room over it.
			await page.evaluate(
				(top) => window.scrollTo(0, top),
				hero.top + hero.length,
			)
			await waitForScrollToSettle(page)
			await page.waitForTimeout(400)
			await expect(page.getByText(profile.statement)).toBeInViewport()
			await expect(html(page)).toHaveAttribute('data-room-phase', 'off')
			await expect(page.locator('[data-room-layer]')).toBeHidden()
			await expect(
				page.locator('[data-stage="hero"] [data-portal]'),
			).toHaveCSS('transform', 'none')
			expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
			expect(problems).toEqual([])
		})
	}

	test('an unknown value is the round-5 lite, and the choice survives a reload', async ({
		page,
	}) => {
		await gotoHydrated(page, '/?phone=b')
		await expect(html(page)).toHaveAttribute('data-phone-variant', 'b')
		await page.goto('/')
		await gotoHydrated(page, '/')
		await expect(html(page)).toHaveAttribute('data-phone-variant', 'b')
		await gotoHydrated(page, '/?phone=nope')
		await expect(html(page)).toHaveAttribute('data-room-mode', 'lite')
		await expect(html(page)).not.toHaveAttribute('data-phone-variant')
		await gotoHydrated(page, '/')
		await expect(html(page)).not.toHaveAttribute('data-phone-variant')
	})
})

test.describe('desktop', () => {
	test.use({ viewport: DESKTOP })

	test('the variants are not for the full room', async ({ page }) => {
		await gotoHydrated(page, '/?phone=c')
		await expect(html(page)).toHaveAttribute('data-room-mode', 'full')
		await expect(html(page)).not.toHaveAttribute('data-phone-variant')
	})
})
