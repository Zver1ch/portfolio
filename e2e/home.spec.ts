import { expect, type Page, test } from '@playwright/test'
import { profile } from '../src/shared/config/profile'

const DESKTOP = { width: 1440, height: 900 }
const CHAPTERS = [
	{ link: 'Обо мне', heading: /Кот идёт/ },
	{ link: 'Стек', heading: /Чем я/ },
	{ link: 'Проекты', heading: /Проекты появятся/ },
	{ link: 'Связаться', heading: /Помахать/ },
]
const HEADER_HEIGHT = 64

function collectProblems(page: Page) {
	const problems: string[] = []
	page.on('console', (message) => {
		if (message.type() === 'error') problems.push(message.text())
	})
	page.on('pageerror', (error) => problems.push(error.message))
	page.on('response', (response) => {
		if (response.status() >= 400)
			problems.push(`${response.status()} ${response.url()}`)
	})
	return problems
}

/** React has hydrated the page, so GSAP scenes and Lenis are set up. */
async function gotoHydrated(page: Page) {
	await page.goto('/')
	await page.waitForFunction(() => {
		const h1 = document.querySelector('h1')
		return (
			h1 !== null &&
			Object.keys(h1).some((key) => key.startsWith('__react'))
		)
	})
	await page.evaluate(
		() =>
			new Promise((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(resolve)),
			),
	)
}

function prologueCat(page: Page) {
	return page.getByRole('button', { name: 'Погладить кота', exact: true })
}

async function waitForScrollToSettle(page: Page) {
	await expect
		.poll(
			async () => {
				const before = await page.evaluate(() => window.scrollY)
				await page.waitForTimeout(150)
				return (await page.evaluate(() => window.scrollY)) === before
			},
			{ timeout: 10_000 },
		)
		.toBe(true)
}

async function horizontalOverflow(page: Page) {
	return page.evaluate(
		() =>
			Math.max(
				document.documentElement.scrollWidth,
				document.body.scrollWidth,
			) - window.innerWidth,
	)
}

/** Wheel through the whole page like a reader, calling `check` at every step. */
async function scrollThrough(page: Page, check?: () => Promise<void>) {
	await page.mouse.move(10, 300)
	for (let step = 0; step < 80; step++) {
		await page.mouse.wheel(0, 500)
		await page.waitForTimeout(60)
		await check?.()
		const atBottom = await page.evaluate(
			() =>
				window.scrollY + window.innerHeight >=
				document.documentElement.scrollHeight - 2,
		)
		if (atBottom) break
	}
	await waitForScrollToSettle(page)
}

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false })

	test('the server HTML tells the whole story', async ({ page }) => {
		await page.goto('/')

		await expect(
			page.getByRole('heading', { level: 1, name: profile.name }),
		).toBeVisible()
		await expect(page.getByText(profile.role)).toBeVisible()
		await expect(page.getByText(profile.about)).toBeVisible()
		for (const shelf of ['Использую', 'В процессе'])
			await expect(
				page.getByRole('heading', { level: 3, name: shelf }),
			).toBeVisible()
		for (const skill of [...profile.skills, ...profile.learning])
			await expect(
				page.getByText(skill, { exact: true }).first(),
			).toBeVisible()
		for (const item of profile.lookingFor)
			await expect(
				page.getByRole('listitem').filter({ hasText: item }),
			).toBeVisible()
		for (const link of profile.links)
			await expect(
				page.getByRole('link', { name: link.label }),
			).toHaveAttribute('href', link.href)
	})

	test('the name keeps both words whole at 360px', async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 740 })
		await page.goto('/')
		expect(await wordsBrokenAcrossLines(page)).toEqual([])
	})
})

/** Words of the h1 whose characters do not all sit on one line. */
function wordsBrokenAcrossLines(page: Page) {
	return page.locator('h1').evaluate((h1) => {
		const tops: { char: string; top: number }[] = []
		const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT)
		while (walker.nextNode()) {
			const node = walker.currentNode as Text
			for (let i = 0; i < node.length; i++) {
				const range = document.createRange()
				range.setStart(node, i)
				range.setEnd(node, i + 1)
				tops.push({
					char: node.data[i],
					top: Math.round(range.getBoundingClientRect().top),
				})
			}
		}
		const words: { char: string; top: number }[][] = [[]]
		for (const entry of tops) {
			if (/\s/.test(entry.char)) words.push([])
			else words[words.length - 1].push(entry)
		}
		return words
			.filter((word) =>
				word.some((c) => Math.abs(c.top - word[0].top) > 4),
			)
			.map((word) => word.map((c) => c.char).join(''))
	})
}

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

	test('the animated name keeps both words whole at 360px', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 360, height: 740 })
		await gotoHydrated(page)
		await page.waitForTimeout(2600)
		expect(await wordsBrokenAcrossLines(page)).toEqual([])
		expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
	})
})

test.describe('cat', () => {
	test('keyboard reaches the prologue cat and boops with Enter and Space', async ({
		page,
	}) => {
		await gotoHydrated(page)
		const counter = page.getByTestId('boop-count')
		await expect(counter).toHaveText('0')

		const visited: string[] = []
		for (let i = 0; i < 40; i++) {
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
			if (visited.includes(focused.label) && visited.length > 2) break
			visited.push(focused.label)
		}
		expect(visited).toContain('Погладить кота')
		expect(visited).toContain('Погладить кота на прощание')
		expect(
			visited.filter((label) => label.startsWith('Погладить')),
		).toHaveLength(2)

		const cat = prologueCat(page)
		await cat.focus()
		await page.keyboard.press('Shift+Tab')
		await page.keyboard.press('Tab')
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

	test('decorative cats stay out of the tab order', async ({ page }) => {
		await gotoHydrated(page)
		const decorative = page.locator('button[aria-hidden="true"]')
		expect(await decorative.count()).toBeGreaterThan(0)
		for (const cat of await decorative.all())
			await expect(cat).toHaveAttribute('tabindex', '-1')
	})

	test('the first boop fetches the meow and plays it; muted boops stay silent', async ({
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
		await gotoHydrated(page)

		const sound = page.waitForResponse((response) =>
			response.url().endsWith('/sounds/cat-click.mp3'),
		)
		await prologueCat(page).click()
		expect((await sound).status()).toBe(200)
		await expect.poll(starts).toBe(1)

		const soundToggle = page.getByRole('button', { name: 'Звук' })
		await expect(soundToggle).toHaveAttribute('aria-pressed', 'true')
		await soundToggle.click()
		await expect(soundToggle).toHaveAttribute('aria-pressed', 'false')

		await prologueCat(page).click()
		await prologueCat(page).click()
		await expect(page.getByTestId('boop-count')).toHaveText('3')
		await page.waitForTimeout(500)
		expect(await starts()).toBe(1)

		await page.reload()
		await expect(soundToggle).toHaveAttribute('aria-pressed', 'false')
	})

	test('the boop counter survives a reload', async ({ page }) => {
		await gotoHydrated(page)
		await prologueCat(page).click()
		await prologueCat(page).click()
		await expect(page.getByTestId('boop-count')).toHaveText('2')
		await expect(page.locator('header')).toContainText('чмоков: 2')

		await page.reload()
		await expect(page.getByTestId('boop-count')).toHaveText('2')
	})
})

test.describe('scroll story (full mode)', () => {
	test.use({ viewport: DESKTOP })

	test('chapter links land on each heading and nothing stays pinned', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await gotoHydrated(page)
		const nav = page.getByRole('navigation', { name: 'Главы' })

		for (const chapter of CHAPTERS) {
			await nav.getByRole('link', { name: chapter.link }).click()
			await waitForScrollToSettle(page)
			const heading = page.getByRole('heading', {
				level: 2,
				name: chapter.heading,
			})
			await expect(heading).toBeInViewport()
			const box = await heading.boundingBox()
			expect(box?.y).toBeGreaterThanOrEqual(HEADER_HEIGHT)
		}

		await nav.getByRole('link', { name: 'Пролог' }).click()
		await waitForScrollToSettle(page)
		await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
		await expect(
			page.getByRole('heading', { level: 2, name: /Кот идёт/ }),
		).not.toBeInViewport()
		expect(problems).toEqual([])
	})

	test('a reader can scroll to the footer without errors', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await gotoHydrated(page)
		await expect(page.locator('.pin-spacer')).not.toHaveCount(0)

		await scrollThrough(page)
		await expect(
			page.getByRole('heading', { level: 2, name: /Помахать/ }),
		).toBeInViewport()
		await expect(page.getByText('Конец истории')).toBeInViewport()

		await page.mouse.wheel(0, -100_000)
		await waitForScrollToSettle(page)
		await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
		expect(problems).toEqual([])
	})
})

test.describe('reduced motion', () => {
	test.use({ viewport: DESKTOP, reducedMotion: 'reduce' })

	test('no pins and every chapter is readable without scrolling effects', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await gotoHydrated(page)
		await page.waitForTimeout(500)
		await expect(page.locator('.pin-spacer')).toHaveCount(0)

		const invisible = await page.locator('main').evaluate((main) => {
			const hidden: string[] = []
			const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT)
			while (walker.nextNode()) {
				const node = walker.currentNode
				const text = node.textContent?.trim()
				const parent = node.parentElement
				if (!text || !parent || parent.closest('[aria-hidden="true"]'))
					continue
				let el: Element | null = parent
				while (el) {
					const style = getComputedStyle(el)
					if (
						style.visibility === 'hidden' ||
						Number(style.opacity) < 0.5
					) {
						hidden.push(text)
						break
					}
					el = el.parentElement
				}
			}
			return hidden
		})
		expect(invisible).toEqual([])
		for (const chapter of CHAPTERS)
			await expect(
				page.getByRole('heading', { level: 2, name: chapter.heading }),
			).toBeVisible()
		expect(problems).toEqual([])
	})
})

test.describe('lite mode', () => {
	for (const viewport of [
		{ width: 1366, height: 657 },
		{ width: 390, height: 844 },
	]) {
		test(`${viewport.width}x${viewport.height}: no pins and no sideways scroll`, async ({
			page,
		}) => {
			const problems = collectProblems(page)
			await page.setViewportSize(viewport)
			await gotoHydrated(page)
			await expect(page.locator('.pin-spacer')).toHaveCount(0)

			await prologueCat(page).click()
			expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

			await scrollThrough(page, async () => {
				expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
			})
			await expect(page.getByText('Конец истории')).toBeInViewport()

			await page
				.getByRole('button', { name: 'Погладить кота на прощание' })
				.click()
			await page.waitForTimeout(300)
			expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
			await expect(page.locator('.pin-spacer')).toHaveCount(0)
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

test('unknown route renders the 404 page', async ({ page }) => {
	await page.goto('/definitely-not-a-page')

	await expect(
		page.getByRole('heading', { name: 'Page not found' }),
	).toBeVisible()
	await expect(page.getByRole('link', { name: 'Go home' })).toBeVisible()
})
