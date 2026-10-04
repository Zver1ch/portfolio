import { expect, type Page } from '@playwright/test'

export const DESKTOP = { width: 1440, height: 900 }
export const HEADER_HEIGHT = 64

/** Console errors, page errors and failed responses, collected as they happen. */
export function collectProblems(page: Page) {
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

/** React has hydrated the page, so the client-side wiring is in place. */
export async function gotoHydrated(page: Page, path = '/') {
	await page.goto(path)
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

export async function waitForScrollToSettle(page: Page) {
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

export async function horizontalOverflow(page: Page) {
	return page.evaluate(
		() =>
			Math.max(
				document.documentElement.scrollWidth,
				document.body.scrollWidth,
			) - window.innerWidth,
	)
}

/** Wheel through the whole page like a reader, calling `check` at every step. */
export async function scrollThrough(page: Page, check?: () => Promise<void>) {
	await page.mouse.move(10, 300)
	for (let step = 0; step < 120; step++) {
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

/** Words of the h1 whose characters do not all sit on one line. */
export function wordsBrokenAcrossLines(page: Page) {
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

/** The hero's face button ("Pet the cat"), the first one on the page. */
export function heroCat(page: Page) {
	return page
		.getByRole('button', { name: 'Pet the cat', exact: true })
		.first()
}

/** Text nodes inside `root` that are hidden or faded out, ignoring decoration. */
export function invisibleText(page: Page, selector: string) {
	return page.locator(selector).evaluate((root) => {
		const hidden: string[] = []
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
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
}
