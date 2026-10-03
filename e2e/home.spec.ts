import { expect, test } from '@playwright/test'

test('home page tells the story without console errors', async ({ page }) => {
	const errors: string[] = []
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text())
	})
	page.on('pageerror', (error) => errors.push(error.message))

	await page.goto('/')

	await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

	const counter = page.getByTestId('boop-count')
	await expect(counter).toHaveText('0')
	const sound = page.waitForResponse((response) =>
		response.url().endsWith('/sounds/cat-click.mp3'),
	)
	await page.getByRole('button', { name: 'Погладить кота' }).first().click()
	await expect(counter).toHaveText('1')
	expect((await sound).status()).toBe(200)

	const soundToggle = page.getByRole('button', { name: 'Звук' })
	await expect(soundToggle).toHaveAttribute('aria-pressed', 'true')
	await soundToggle.click()
	await expect(soundToggle).toHaveAttribute('aria-pressed', 'false')

	await page
		.getByRole('navigation', { name: 'Главы' })
		.getByRole('link', { name: 'Связаться' })
		.click()
	await expect(
		page.getByRole('heading', { name: /Помахать лапой/ }),
	).toBeInViewport()

	expect(errors).toEqual([])
})

test('unknown route renders the 404 page', async ({ page }) => {
	await page.goto('/definitely-not-a-page')

	await expect(
		page.getByRole('heading', { name: 'Page not found' }),
	).toBeVisible()
	await expect(page.getByRole('link', { name: 'Go home' })).toBeVisible()
})
