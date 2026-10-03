import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { profile } from '@/shared/config/profile'
import { HomePage } from './home-page'

describe('HomePage', () => {
	// Vitest globals are off, so Testing Library does not auto-clean the DOM
	afterEach(cleanup)

	it('renders the profile name as the main heading', () => {
		render(<HomePage />)

		expect(
			screen.getByRole('heading', { level: 1, name: profile.name }),
		).toBeInTheDocument()
	})

	it('renders the role and about text from the profile', () => {
		render(<HomePage />)

		expect(screen.getByText(profile.role)).toBeInTheDocument()
		expect(screen.getByText(profile.about)).toBeInTheDocument()
	})
})
