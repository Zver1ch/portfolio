import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { setSoundEnabled } from '@/shared/lib/sound/sound-enabled'
import { SoundToggle } from './sound-toggle'

describe('SoundToggle', () => {
	beforeEach(() => {
		setSoundEnabled(true)
	})

	it('keeps a stable label and flips aria-pressed', () => {
		render(<SoundToggle />)

		const button = screen.getByRole('button', { name: 'Sound' })
		expect(button).toHaveAttribute('aria-pressed', 'true')

		fireEvent.click(button)

		expect(button).toHaveAttribute('aria-pressed', 'false')
		expect(window.localStorage.getItem('sound-enabled')).toBe('false')
	})
})
