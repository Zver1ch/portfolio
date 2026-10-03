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
})
