import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Fresh modules per test: the store caches the stored choice. */
async function load() {
	vi.resetModules()
	const store = await import('@/shared/lib/sound/sound-enabled')
	const { SoundPrompt } = await import('./sound-prompt')
	return { ...store, SoundPrompt }
}

describe('SoundPrompt', () => {
	beforeEach(() => {
		window.localStorage.clear()
	})

	it('shows until a choice is stored and opts in on click', async () => {
		const { SoundPrompt, getSoundOptIn } = await load()
		render(<SoundPrompt />)
		const button = screen.getByRole('button', { name: 'Enable sound' })
		fireEvent.click(button)
		expect(getSoundOptIn()).toBe(true)
		expect(window.localStorage.getItem('sound-enabled')).toBe('true')
		expect(
			screen.queryByRole('button', { name: 'Enable sound' }),
		).toBeNull()
	})

	it('stays away once the visitor muted', async () => {
		window.localStorage.setItem('sound-enabled', 'false')
		const { SoundPrompt } = await load()
		render(<SoundPrompt />)
		expect(
			screen.queryByRole('button', { name: 'Enable sound' }),
		).toBeNull()
	})
})
