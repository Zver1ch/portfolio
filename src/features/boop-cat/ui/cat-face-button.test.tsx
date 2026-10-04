import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { boop, stampHearts } = vi.hoisted(() => ({
	boop: vi.fn(() => 1),
	stampHearts: vi.fn(),
}))
vi.mock('../model/boop', () => ({ boop }))
vi.mock('../lib/stamp-hearts', () => ({ stampHearts }))

import { CatFaceButton } from './cat-face-button'

describe('CatFaceButton', () => {
	afterEach(cleanup)

	it('is a labelled button around the sticker that boops on click', () => {
		render(<CatFaceButton />)
		const button = screen.getByRole('button', { name: 'Pet the cat' })
		expect(button).toHaveAttribute('type', 'button')
		expect(button.querySelector('img')).toHaveAttribute('alt', '')

		fireEvent.click(button)

		expect(boop).toHaveBeenCalledTimes(1)
		expect(stampHearts).toHaveBeenCalledTimes(1)
		expect(button.querySelector('.face-pop')).not.toBeNull()
	})

	it('takes a place-specific label', () => {
		render(<CatFaceButton label='Pet the sleeping cat' />)
		expect(
			screen.getByRole('button', { name: 'Pet the sleeping cat' }),
		).toBeInTheDocument()
	})
})
