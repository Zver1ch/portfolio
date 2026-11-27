import { expect, type Page, test } from '@playwright/test'
import { profile } from '../src/shared/config/profile'
import { collectProblems, DESKTOP, gotoHydrated } from './helpers'
import { decodePng } from './png'

const READY_TIMEOUT = 80_000
/** The hero stage pins for this many viewport heights (plan §3.4). */
const DIVE_HEIGHTS = 2.2

test.describe.configure({ mode: 'serial', timeout: 90_000 })
test.use({ viewport: DESKTOP })

const html = (page: Page) => page.locator('html')

async function waitForRoom(page: Page) {
	await gotoHydrated(page)
	await expect(html(page)).toHaveAttribute('data-room-mode', 'full')
	await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
		timeout: READY_TIMEOUT,
	})
}

/** Scrolls so the dive is at `p` and lets the trigger and the director catch up. */
async function diveTo(page: Page, p: number) {
	await page.evaluate(
		([progress, heights]) =>
			window.scrollTo(
				0,
				Math.round(progress * heights * window.innerHeight),
			),
		[p, DIVE_HEIGHTS] as const,
	)
	await page.waitForTimeout(600)
}

const isGreen = ([r, g, b]: number[]) => g > 140 && r < 120 && b < 120
const isMagenta = ([r, g, b]: number[]) => r > 140 && b > 140 && g < 120

test('the dive ends inside the monitor with the page at identity', async ({
	page,
}) => {
	const problems = collectProblems(page)
	await waitForRoom(page)
	// Both stages pin in full mode: the hero and the finale.
	await expect(page.locator('.pin-spacer')).toHaveCount(2)
	const portal = page.locator('[data-stage="hero"] [data-portal]')
	// At rest the page already sits on the monitor.
	await expect(portal).toHaveCSS('transform', /^matrix3d\(/)

	await diveTo(page, 1.02)
	await expect(html(page)).toHaveAttribute('data-room-phase', 'inside')
	await expect(portal).toHaveCSS('transform', 'none')
	await expect(page.getByText(profile.statement)).toBeInViewport()
	await expect(page.locator('[data-room-layer]')).toBeHidden()

	// Back up the dive: the idle director wakes and the room returns.
	await diveTo(page, 0.5)
	await expect(html(page)).toHaveAttribute('data-room-phase', 'room')
	await expect(portal).toHaveCSS('transform', /^matrix3d\(/)
	await expect(page.locator('[data-room-layer]')).toBeVisible()
	expect(problems).toEqual([])
})

test('mid-dive the warped page and the hole in the monitor coincide within 2 px', async ({
	page,
}) => {
	await waitForRoom(page)
	await diveTo(page, 0.5)
	// Paint the page green and the slot behind it magenta: through the hole,
	// green is the portal, magenta would be hole beyond the portal, and the
	// room's own pixels are neither.
	await page.addStyleTag({
		content:
			'[data-manifesto]{background:#00ff00!important}[data-manifesto] *{visibility:hidden}[data-stage="hero"] [data-slot]{background:#ff00ff!important}[data-poster],[data-loader-veil]{display:none!important}',
	})
	await page.waitForTimeout(300)
	const corners = await page
		.locator('[data-portal-corner]')
		.evaluateAll((nodes) =>
			nodes.map((node) => {
				const rect = node.getBoundingClientRect()
				return {
					name: node.getAttribute('data-portal-corner') as string,
					x: rect.left,
					y: rect.top,
				}
			}),
		)
	expect(corners).toHaveLength(4)
	const REACH = 24
	for (const corner of corners) {
		// Walk from outside the corner inwards along the diagonal.
		const dx = corner.name.endsWith('l') ? 1 : -1
		const dy = corner.name.startsWith('t') ? 1 : -1
		const startX = Math.round(corner.x) - dx * REACH
		const startY = Math.round(corner.y) - dy * REACH
		// The clip holds every step of the walk: 2 * REACH pixels from the start.
		const clip = {
			x: dx > 0 ? startX : startX - (2 * REACH - 1),
			y: dy > 0 ? startY : startY - (2 * REACH - 1),
			width: 2 * REACH,
			height: 2 * REACH,
		}
		const png = decodePng(await page.screenshot({ clip }))
		let holeEdge: number | null = null
		let portalEdge: number | null = null
		for (let step = 0; step < 2 * REACH; step++) {
			const x = startX + dx * step - clip.x
			const y = startY + dy * step - clip.y
			const pixel = png.at(x, y)
			if (holeEdge === null && (isGreen(pixel) || isMagenta(pixel)))
				holeEdge = step
			if (isGreen(pixel)) {
				portalEdge = step
				break
			}
		}
		expect(
			portalEdge,
			`${corner.name}: no portal pixels found`,
		).not.toBeNull()
		expect(holeEdge, `${corner.name}: no hole pixels found`).not.toBeNull()
		// The marker sits REACH steps along the walk.
		expect(
			Math.abs((portalEdge as number) - REACH),
			corner.name,
		).toBeLessThanOrEqual(2)
		expect(
			Math.abs((holeEdge as number) - REACH),
			corner.name,
		).toBeLessThanOrEqual(2)
	}
})

test.describe('lite mode', () => {
	test.use({ viewport: { width: 390, height: 844 } })

	/** The lite dive's scroll length: the hero stage beyond its stuck portal. */
	const liteDiveTo = async (page: Page, p: number) => {
		await page.evaluate((progress) => {
			const stage = document.querySelector<HTMLElement>(
				'[data-stage="hero"]',
			)
			const portal = stage?.querySelector<HTMLElement>('[data-portal]')
			if (!stage || !portal) throw new Error('no hero stage')
			window.scrollTo(
				0,
				Math.round(
					progress * (stage.offsetHeight - portal.offsetHeight),
				),
			)
		}, p)
		await page.waitForTimeout(600)
	}
	test('nothing pins: the stuck first section sits on the monitor while the camera flies in, then lands as the page', async ({
		page,
	}) => {
		const problems = collectProblems(page)
		await gotoHydrated(page)
		await expect(html(page)).toHaveAttribute('data-room-mode', 'lite')
		await expect(html(page)).toHaveAttribute('data-scene-ready', 'true', {
			timeout: READY_TIMEOUT,
		})
		await expect(page.locator('.pin-spacer')).toHaveCount(0)
		const portal = page.locator('[data-stage="hero"] [data-portal]')
		await expect(portal).toHaveCSS('transform', /^matrix3d/)
		await expect(portal).toHaveCSS('position', 'sticky')
		// The room is on from the first frame, over the whole viewport.
		await expect(html(page)).toHaveAttribute('data-room-phase', 'room')
		await expect(page.locator('[data-room-layer]')).toBeVisible()

		// Mid-dive: the section is stuck and still warped, the name has faded.
		await liteDiveTo(page, 0.6)
		await expect(html(page)).toHaveAttribute('data-room-phase', 'room')
		await expect(portal).toHaveCSS('transform', /^matrix3d/)
		await expect(page.locator('[data-hero-copy]')).toBeHidden()

		// Landed: nothing is drawn, the statement is the page, still at the top
		// (the release point, give or take the sub-pixel of the svh heights).
		await liteDiveTo(page, 1)
		await expect(html(page)).toHaveAttribute('data-room-phase', 'off')
		await expect(page.locator('[data-room-layer]')).toBeHidden()
		await expect(page.getByText(profile.statement)).toBeInViewport()
		await expect(portal).toHaveCSS('transform', 'none')
		expect(
			Math.abs(
				await portal.evaluate(
					(node) => node.getBoundingClientRect().top,
				),
			),
		).toBeLessThan(1)

		// Back up: the room returns the same way.
		await liteDiveTo(page, 0.5)
		await expect(html(page)).toHaveAttribute('data-room-phase', 'room')
		await expect(page.locator('[data-room-layer]')).toBeVisible()
		expect(problems).toEqual([])
	})
})
