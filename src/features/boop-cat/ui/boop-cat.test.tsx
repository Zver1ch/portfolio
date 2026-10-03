import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { boop } = vi.hoisted(() => ({ boop: vi.fn(() => 1) }))
vi.mock('../model/boop', () => ({ boop }))
vi.mock('../lib/stamp-hearts', () => ({
	stampHearts: vi.fn(),
	prefersReducedMotion: () => true,
}))

import { BoopCat } from './boop-cat'

describe('BoopCat', () => {
	afterEach(cleanup)

	it('is a labelled button that boops on click and shows the love face', () => {
		const { container } = render(<BoopCat />)
		const button = screen.getByRole('button', { name: 'Погладить кота' })
		expect(button).toHaveAttribute('type', 'button')

		fireEvent.click(button)

		expect(boop).toHaveBeenCalledTimes(1)
		expect(container.querySelector('svg')).toHaveAttribute(
			'data-expression',
			'love',
		)
	})

	it('takes a chapter-specific name', () => {
		render(<BoopCat label='Погладить кота на прощание' />)
		expect(
			screen.getByRole('button', { name: 'Погладить кота на прощание' }),
		).toBeInTheDocument()
	})

	it('stays clickable but leaves the tab order when decorative', () => {
		const { container } = render(<BoopCat decorative />)
		expect(screen.queryByRole('button')).not.toBeInTheDocument()
		const button = container.querySelector('button')
		expect(button).toHaveAttribute('tabindex', '-1')
		expect(button).toHaveAttribute('aria-hidden', 'true')

		fireEvent.click(button as HTMLButtonElement)
		expect(boop).toHaveBeenCalledTimes(1)
	})
})
