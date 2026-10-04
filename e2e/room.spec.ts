import { expect, type Page, type Route, test } from '@playwright/test'
import { collectProblems, DESKTOP, gotoHydrated, heroCat } from './helpers'

/** Only the lazily loaded three.js scene chunk carries the renderer. */
const SCENE_CHUNK_SIGNATURE = 'WebGLRenderer'
const READY_TIMEOUT = 80_000

// Software WebGL is slow: one room at a time, with room to breathe.
test.describe.configure({ mode: 'serial', timeout: 90_000 })

const html = (page: Page) => page.locator('html')

function countMeows(page: Page) {
	return page.addInitScript(() => {
		const counter = { starts: 0 }
		Object.assign(window, { __audio: counter })
		const start = AudioBufferSourceNode.prototype.start
		AudioBufferSourceNode.prototype.start = function (...args) {
			counter.starts += 1
			return start.apply(this, args)
		}
	})
}
const meows = (page: Page) =>
	page.evaluate(
		() =>
			(window as unknown as { __audio: { starts: number } }).__audio
				.starts,
	)

/** Holds (or aborts) the three.js chunk so the page can be checked without it. */
async function interceptSceneChunk(page: Page, mode: 'hold' | 'abort') {
	let release = () => {}
	const released = new Promise<void>((resolve) => {
		release = resolve
	})
	let requested = false
	await page.route('**/_next/static/chunks/*.js', async (route: Route) => {
		const response = await route.fetch()
		const body = await response.text()
		if (!body.includes(SCENE_CHUNK_SIGNATURE)) {
			await route.fulfill({ response, body })
			return
		}
		requested = true
		if (mode === 'abort') {
			await route.abort('failed')
			return
		}
		await released
		await route.fulfill({ response, body })
	})
	return { release, wasRequested: () => requested }
}

async function expectStatic(page: Page) {
	await expect(html(page)).toHaveAttribute('data-room-mode', 'static', {
		timeout: READY_TIMEOUT,
	})
	await expect(page.locator('canvas')).toHaveCount(0)
	await expect(page.locator('.pin-spacer')).toHaveCount(0)
	await expect(page.locator('[data-loader-veil]')).toBeHidden()
	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
	const counter = page.getByTestId('boop-count')
	const before = Number(await counter.textContent())
	await heroCat(page).click()
	await expect(counter).toHaveText(String(before + 1))
}

test.describe('full mode', () => {
	test.use({ viewport: DESKTOP })

	test('the room renders, the veil lifts and the proxy pets the cat', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await countMeows(page)
		await gotoHydrated(page)
		await expect(html(page)).toHaveAttribute('data-room-mode', 'full')
		await expect(page.locator('[data-loader-veil]')).toBeVisible()
		await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
			timeout: READY_TIMEOUT,
		})
		await expect(page.locator('[data-room-layer] canvas')).toHaveCount(1)
		await expect(page.locator('[data-loader-veil]')).toBeHidden()
		await expect(page.locator('[data-poster="night"] img')).toBeHidden()

		const proxy = page.locator('[data-pet-proxy]')
		await expect(proxy).toBeVisible()
		await expect(proxy).toBeEnabled()
		const counter = page.getByTestId('boop-count')
		await proxy.click()
		await expect(counter).toHaveText('1')
		await proxy.focus()
		await page.keyboard.press('Enter')
		await expect(counter).toHaveText('2')
		await page.keyboard.press('Space')
		await expect(counter).toHaveText('3')
		await expect.poll(() => meows(page)).toBeGreaterThanOrEqual(1)
		expect(problems).toEqual([])
	})

	test('the scene chunk is lazy: absent from the initial JS, requested only after hydration', async ({
		page,
	}) => {
		const chunk = await interceptSceneChunk(page, 'hold')
		await page.goto('/')
		await page.waitForFunction(() => {
			const h1 = document.querySelector('h1')
			return (
				h1 !== null &&
				Object.keys(h1).some((key) => key.startsWith('__react'))
			)
		})
		expect(chunk.wasRequested()).toBe(false)
		await expect
			.poll(() => chunk.wasRequested(), { timeout: 20_000 })
			.toBe(true)
		await expect(html(page)).toHaveAttribute('data-room-mode', 'full')
		chunk.release()
		await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
			timeout: READY_TIMEOUT,
		})
	})
})

test.describe('lite mode', () => {
	test.use({ viewport: { width: 390, height: 844 } })

	test('a phone gets the lite room', async ({ page }) => {
		const problems = collectProblems(page)
		await gotoHydrated(page)
		await expect(html(page)).toHaveAttribute('data-room-mode', 'lite')
		await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
			timeout: READY_TIMEOUT,
		})
		await expect(page.locator('[data-room-layer] canvas')).toHaveCount(1)
		await expect(page.locator('.pin-spacer')).toHaveCount(0)
		expect(problems).toEqual([])
	})
})

test.describe('fallbacks give the static page', () => {
	test.use({ viewport: DESKTOP })

	test.describe('reduced motion', () => {
		test.use({ reducedMotion: 'reduce' })
		test('no room, a face button that counts', async ({ page }) => {
			await gotoHydrated(page)
			await expectStatic(page)
		})
	})

	test('no WebGL', async ({ page }) => {
		await page.addInitScript(() => {
			const getContext = HTMLCanvasElement.prototype.getContext
			HTMLCanvasElement.prototype.getContext = function (
				this: HTMLCanvasElement,
				type: string,
				...rest: unknown[]
			) {
				if (type.startsWith('webgl') || type === 'experimental-webgl')
					return null
				return (getContext as (...a: unknown[]) => unknown).call(
					this,
					type,
					...rest,
				)
			} as typeof getContext
		})
		await gotoHydrated(page)
		await expectStatic(page)
	})

	test('an aborted scene chunk', async ({ page }) => {
		await interceptSceneChunk(page, 'abort')
		await gotoHydrated(page)
		await expectStatic(page)
	})

	test('an aborted model', async ({ page }) => {
		await page.route('**/models/cat.glb*', (route) => route.abort('failed'))
		await gotoHydrated(page)
		await expectStatic(page)
	})

	test('a lost context after the first frame', async ({ page }) => {
		await gotoHydrated(page)
		await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
			timeout: READY_TIMEOUT,
		})
		await page
			.locator('[data-room-layer] canvas')
			.evaluate((node: HTMLCanvasElement) => {
				const gl = node.getContext('webgl2') ?? node.getContext('webgl')
				gl?.getExtension('WEBGL_lose_context')?.loseContext()
			})
		await expectStatic(page)
	})
})
