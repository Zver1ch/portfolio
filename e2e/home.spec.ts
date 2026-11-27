import { expect, test } from '@playwright/test'
import { credits } from '../src/shared/config/credits'
import { profile } from '../src/shared/config/profile'
import {
	collectProblems,
	DESKTOP,
	gotoHydrated,
	HEADER_HEIGHT,
	heroCat,
	horizontalOverflow,
	invisibleText,
	scrollThrough,
	waitForScrollToSettle,
	wordsBrokenAcrossLines,
} from './helpers'

const SECTIONS = [
	{ link: 'About', heading: 'About' },
	{ link: 'Stack', heading: 'Stack' },
	{ link: 'Contact', heading: 'Contact' },
]

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false })

	test('the server HTML carries the whole page', async ({ page }) => {
		await page.goto('/')

		await expect(page.locator('html')).toHaveAttribute('lang', 'en')
		await expect(
			page.getByRole('heading', { level: 1, name: profile.name }),
		).toBeVisible()
		await expect(page.getByText(profile.role)).toBeVisible()
		await expect(page.getByText(profile.tagline)).toBeVisible()
		await expect(page.getByText(profile.statement)).toBeVisible()
		await expect(page.getByText(profile.about)).toBeVisible()
		for (const skill of [...profile.skills, ...profile.learning])
			await expect(
				page.getByRole('rowheader', { name: skill, exact: true }),
			).toBeVisible()
		for (const item of profile.lookingFor)
			await expect(
				page.getByRole('listitem').filter({ hasText: item }),
			).toBeVisible()
		for (const link of profile.links)
			await expect(
				page.getByRole('link', { name: link.label }),
			).toHaveAttribute('href', link.href)
		await expect(page.getByText(profile.footerStatement)).toBeVisible()
		for (const credit of credits)
			await expect(
				page.getByRole('link', { name: `“${credit.title.label}”` }),
			).toHaveAttribute('href', credit.title.href)

		await expect(page.locator('[data-poster="night"] img')).toBeVisible()
		await expect(page.locator('canvas')).toHaveCount(0)
		await expect(heroCat(page)).toBeVisible()
	})

	test('the name keeps both words whole at 360px', async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 740 })
		await page.goto('/')
		expect(await wordsBrokenAcrossLines(page)).toEqual([])
	})
})

test.describe('hero', () => {
	test.beforeEach(async ({ page }) => {
		await page.addInitScript(() => {
			const states: string[] = []
			Object.assign(window, { __heroStates: states })
			const sample = () => {
				const h1 = document.querySelector('h1')
				if (h1) {
					let opacity = 1
					for (let el: Element | null = h1; el; el = el.parentElement)
						opacity *= Number(getComputedStyle(el).opacity)
					states.push(`${getComputedStyle(h1).visibility}|${opacity}`)
				}
				if (performance.now() < 2500) requestAnimationFrame(sample)
			}
			requestAnimationFrame(sample)
		})
	})

	test('the name is painted visible from the first frame', async ({
		page,
	}) => {
		await gotoHydrated(page)
		await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
		await page.waitForTimeout(2600)
		const states = await page.evaluate(
			() =>
				(window as unknown as { __heroStates: string[] }).__heroStates,
		)
		expect(states.length).toBeGreaterThan(0)
		expect(new Set(states)).toEqual(new Set(['visible|1']))
	})

	test('nothing covers the name', async ({ page }) => {
		await gotoHydrated(page)
		// The copy lets pointer events through to the room on purpose, so give
		// it pointer events back for the hit test: what matters is that no
		// stage, canvas or poster is stacked above it (plan §3.2).
		const onTop = await page.locator('h1').evaluate((h1) => {
			const copy = h1.closest<HTMLElement>('[data-hero-copy]')
			if (copy) copy.style.pointerEvents = 'auto'
			const rect = h1.getBoundingClientRect()
			const hit = document.elementFromPoint(
				rect.left + 10,
				rect.top + rect.height / 2,
			)
			if (copy) copy.style.pointerEvents = ''
			return hit !== null && h1.contains(hit)
		})
		expect(onTop).toBe(true)
	})
})

test.describe('cat', () => {
	// The face buttons are the static page's pet target; the live room's proxy
	// has its own tests in room.spec.ts.
	test.use({ reducedMotion: 'reduce' })

	test('keyboard reaches every face button, each boops with Enter and Space', async ({
		page,
	}) => {
		await gotoHydrated(page)
		const counter = page.getByTestId('boop-count')
		await expect(counter).toHaveText('0')

		const visited: string[] = []
		for (let i = 0; i < 60; i++) {
			await page.keyboard.press('Tab')
			const focused = await page.evaluate(() => {
				const el = document.activeElement
				if (!el || el === document.body) return null
				return {
					label:
						el.getAttribute('aria-label') ??
						el.textContent?.trim() ??
						'',
					hidden: el.closest('[aria-hidden="true"]') !== null,
				}
			})
			if (!focused) break
			expect(focused.hidden, focused.label).toBe(false)
			if (visited.includes(focused.label) && focused.label === 'Zver1ch')
				break
			visited.push(focused.label)
		}
		expect(visited[0]).toBe('Skip to content')
		// The hero, the contact section and the finale each have a face button.
		expect(visited.filter((label) => label === 'Pet the cat')).toHaveLength(
			3,
		)

		const cat = heroCat(page)
		await cat.focus()
		await expect(cat).toBeFocused()
		await expect(cat).toHaveCSS(
			'box-shadow',
			/rgb\(\d+, \d+, \d+\) 0px 0px 0px [1-9]\d*px/,
		)

		await page.keyboard.press('Enter')
		await expect(counter).toHaveText('1')
		await page.keyboard.press('Space')
		await expect(counter).toHaveText('2')
	})

	test('the meow is fetched before the first boop, which plays it; muted boops stay silent', async ({
		page,
	}) => {
		await page.addInitScript(() => {
			const counter = { starts: 0 }
			Object.assign(window, { __audio: counter })
			const start = AudioBufferSourceNode.prototype.start
			AudioBufferSourceNode.prototype.start = function (...args) {
				counter.starts += 1
				return start.apply(this, args)
			}
		})
		const starts = () =>
			page.evaluate(
				() =>
					(window as unknown as { __audio: { starts: number } })
						.__audio.starts,
			)
		let requests = 0
		page.on('request', (request) => {
			if (request.url().endsWith('/sounds/cat-click.mp3')) requests += 1
		})
		const sound = page.waitForResponse((response) =>
			response.url().endsWith('/sounds/cat-click.mp3'),
		)
		await gotoHydrated(page)

		// Prefetched on idle after hydration, with no click and no context yet.
		expect((await sound).status()).toBe(200)
		expect(await starts()).toBe(0)
		await heroCat(page).click()
		await expect.poll(starts).toBe(1)
		expect(requests).toBe(1)

		const soundToggle = page.getByRole('button', { name: 'Sound' })
		await expect(soundToggle).toHaveAttribute('aria-pressed', 'true')
		await soundToggle.click()
		await expect(soundToggle).toHaveAttribute('aria-pressed', 'false')

		await heroCat(page).click()
		await heroCat(page).click()
		await expect(page.getByTestId('boop-count')).toHaveText('3')
		await page.waitForTimeout(500)
		expect(await starts()).toBe(1)

		await page.reload()
		await expect(soundToggle).toHaveAttribute('aria-pressed', 'false')
	})

	test('the boop counter survives a reload', async ({ page }) => {
		await gotoHydrated(page)
		await heroCat(page).click()
		await heroCat(page).click()
		await expect(page.getByTestId('boop-count')).toHaveText('2')
		await expect(page.locator('header')).toContainText('boops: 2')

		await page.reload()
		await expect(page.getByTestId('boop-count')).toHaveText('2')
	})
})

test.describe('sections', () => {
	test.use({ viewport: DESKTOP })

	test('nav links land on each heading below the header', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await gotoHydrated(page)
		const nav = page.getByRole('navigation', { name: 'Sections' })
		// Every scroll position on the way down, to prove the page never turns
		// back: the browser's own fragment jump racing the smooth scroll did.
		await page.evaluate(() => {
			const log: number[] = []
			Object.assign(window, { __scrollLog: log })
			window.addEventListener('scroll', () => log.push(window.scrollY), {
				passive: true,
			})
		})

		for (const section of SECTIONS) {
			await page.evaluate(() => {
				;(
					window as unknown as { __scrollLog: number[] }
				).__scrollLog.length = 0
			})
			await nav.getByRole('link', { name: section.link }).click()
			await waitForScrollToSettle(page)
			const heading = page.getByRole('heading', {
				level: 2,
				name: section.heading,
				exact: true,
			})
			await expect(heading).toBeInViewport()
			const box = await heading.boundingBox()
			expect(box?.y).toBeGreaterThanOrEqual(HEADER_HEIGHT)
			const log = await page.evaluate(
				() =>
					(window as unknown as { __scrollLog: number[] })
						.__scrollLog,
			)
			const turnedBack = log.some(
				(y, i) => i > 0 && y < (log[i - 1] as number) - 1,
			)
			expect(turnedBack, `${section.link}: ${log.join(' ')}`).toBe(false)
			// The hash lands when the smooth scroll completes, a few sub-pixel
			// frames after the position looks settled.
			await expect
				.poll(() => new URL(page.url()).hash, { timeout: 5000 })
				.toBe(
					(await nav
						.getByRole('link', { name: section.link })
						.getAttribute('href')) as string,
				)
		}

		await nav.getByRole('link', { name: 'Top' }).click()
		await waitForScrollToSettle(page)
		await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
		expect(problems).toEqual([])
	})

	test('a reader can scroll to the credits and back to the top without errors', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await gotoHydrated(page)

		await scrollThrough(page)
		// The dawn poster is lazy: scrolled into view, it must have loaded.
		const dawn = page.locator('[data-poster="dawn"] img')
		await expect(dawn).toHaveCount(1)
		await expect
			.poll(() =>
				dawn.evaluate((img: HTMLImageElement) => img.naturalWidth),
			)
			.toBeGreaterThan(0)
		const ccBy = page.getByRole('link', { name: 'CC BY 4.0' })
		await expect(ccBy).toBeInViewport()
		await expect(ccBy).toHaveAttribute(
			'href',
			'https://creativecommons.org/licenses/by/4.0/',
		)
		await expect(page.locator('[data-credits]')).toContainText(
			'licensed under CC BY 4.0',
		)

		await page.getByRole('link', { name: 'Back to top' }).click()
		await waitForScrollToSettle(page)
		await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
		expect(problems).toEqual([])
	})

	test('only the shipped cat model may ever be requested', async ({
		page,
	}) => {
		const models: string[] = []
		page.on('response', (response) => {
			const url = new URL(response.url())
			if (/\.(glb|gltf|bin)$/.test(url.pathname))
				models.push(url.pathname)
		})
		await gotoHydrated(page)
		await scrollThrough(page)
		expect(models.filter((path) => path !== '/models/cat.glb')).toEqual([])
	})
})

test.describe('reduced motion', () => {
	test.use({ viewport: DESKTOP, reducedMotion: 'reduce' })

	test('no pins and every section is readable', async ({ page }) => {
		const problems = collectProblems(page)
		await gotoHydrated(page)
		await page.waitForTimeout(500)
		await expect(page.locator('.pin-spacer')).toHaveCount(0)
		expect(await invisibleText(page, 'main')).toEqual([])
		for (const section of SECTIONS)
			await expect(
				page.getByRole('heading', {
					level: 2,
					name: section.heading,
					exact: true,
				}),
			).toBeVisible()
		expect(problems).toEqual([])
	})
})

test.describe('narrow viewports', () => {
	for (const viewport of [
		{ width: 390, height: 844 },
		{ width: 360, height: 740 },
		{ width: 320, height: 640 },
	]) {
		test(`${viewport.width}x${viewport.height}: no pins and no sideways scroll`, async ({
			page,
		}) => {
			const problems = collectProblems(page)
			await page.setViewportSize(viewport)
			await gotoHydrated(page)
			await expect(page.locator('.pin-spacer')).toHaveCount(0)
			expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

			await scrollThrough(page, async () => {
				expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
			})
			await expect(
				page.getByRole('link', { name: 'Back to top' }),
			).toBeInViewport()

			// The finale's cat is petted with the dawn room held on screen, at
			// the end of the pull-back (the lite room's proxy, or the static
			// face button in the slot when no room came).
			await page.evaluate(() => {
				const stage = document.querySelector<HTMLElement>(
					'[data-stage="finale"]',
				)
				const portal =
					stage?.querySelector<HTMLElement>('[data-portal]')
				if (!stage || !portal) return
				const top = stage.getBoundingClientRect().top + window.scrollY
				window.scrollTo(
					0,
					top + stage.offsetHeight - portal.offsetHeight,
				)
			})
			await waitForScrollToSettle(page)
			await page.waitForTimeout(600)
			await page
				.getByRole('button', { name: 'Pet the cat', exact: true })
				.last()
				.click()
			await page.waitForTimeout(300)
			expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
			expect(problems).toEqual([])
		})
	}

	test('320px header fits the screen', async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 640 })
		await gotoHydrated(page)
		const row = page.locator('header > div').last()
		const fits = await row.evaluate((el) => {
			const items = [...el.children].filter(
				(child) => getComputedStyle(child).display !== 'none',
			)
			return {
				scroll: el.scrollWidth - el.clientWidth,
				right: Math.max(
					...items.map(
						(child) => child.getBoundingClientRect().right,
					),
				),
				left: Math.min(
					...items.map((child) => child.getBoundingClientRect().left),
				),
			}
		})
		expect(fits.scroll).toBeLessThanOrEqual(0)
		expect(fits.left).toBeGreaterThanOrEqual(0)
		expect(fits.right).toBeLessThanOrEqual(320)
		expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
	})
})

test('unknown routes and the dev-only lab render the 404 page', async ({
	page,
}) => {
	for (const path of ['/definitely-not-a-page', '/lab']) {
		const response = await page.goto(path)
		expect(response?.status(), path).toBe(404)
		await expect(
			page.getByRole('heading', { name: 'Page not found' }),
		).toBeVisible()
		await expect(page.getByRole('link', { name: 'Go home' })).toBeVisible()
	}
})
