import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { setSoundEnabled } from '@/shared/lib/sound/sound-enabled'
import { SoundToggle } from './sound-toggle'

describe('SoundToggle', () => {
	beforeEach(() => {
		setSoundEnabled(true)
	})

	it('flips aria-pressed and the label', () => {
		render(<SoundToggle />)

		const button = screen.getByRole('button', { name: 'Выключить звук' })
		expect(button).toHaveAttribute('aria-pressed', 'true')

		fireEvent.click(button)

		expect(
			screen.getByRole('button', { name: 'Включить звук' }),
		).toHaveAttribute('aria-pressed', 'false')
		expect(window.localStorage.getItem('sound-enabled')).toBe('false')
	})
})
