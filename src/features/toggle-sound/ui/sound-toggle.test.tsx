import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setSoundEnabled } from '@/shared/lib/sound/sound-enabled'
import { SoundToggle } from './sound-toggle'

describe('SoundToggle', () => {
	beforeEach(() => {
		setSoundEnabled(true)
	})

	afterEach(cleanup)

	it('keeps a stable label and flips aria-pressed', () => {
		render(<SoundToggle />)

		const button = screen.getByRole('button', { name: 'Sound' })
		expect(button).toHaveAttribute('aria-pressed', 'true')

		fireEvent.click(button)

		expect(button).toHaveAttribute('aria-pressed', 'false')
		expect(window.localStorage.getItem('sound-enabled')).toBe('false')
	})

	it('reads as off until an explicit opt-in, since the ambient is silent till then', async () => {
		window.localStorage.clear()
		vi.resetModules()
		const store = await import('@/shared/lib/sound/sound-enabled')
		const { SoundToggle: Fresh } = await import('./sound-toggle')
		render(<Fresh />)

		const button = screen.getByRole('button', { name: 'Sound' })
		expect(button).toHaveAttribute('aria-pressed', 'false')

		act(() => store.setSoundEnabled(true))
		expect(button).toHaveAttribute('aria-pressed', 'true')
	})
})
