import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { credits } from '@/shared/config/credits'
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

	it('renders the role, the statements and the about text from the profile', () => {
		render(<HomePage />)

		expect(screen.getByText(profile.role)).toBeInTheDocument()
		expect(screen.getByText(profile.tagline)).toBeInTheDocument()
		expect(screen.getByText(profile.statement)).toBeInTheDocument()
		expect(screen.getByText(profile.footerStatement)).toBeInTheDocument()
		expect(screen.getByText(profile.about)).toBeInTheDocument()
	})

	it('lists every skill with its status', () => {
		render(<HomePage />)

		for (const skill of [...profile.skills, ...profile.learning])
			expect(
				screen.getByRole('rowheader', { name: skill }),
			).toBeInTheDocument()
		expect(screen.getAllByText('In use')).toHaveLength(
			profile.skills.length,
		)
		expect(screen.queryAllByText('Learning')).toHaveLength(
			profile.learning.length,
		)
	})

	it('lists the experience from the profile', () => {
		render(<HomePage />)

		for (const job of profile.experience) {
			expect(
				screen.getByRole('heading', { level: 3, name: job.place }),
			).toBeInTheDocument()
			expect(screen.getByText(job.summary)).toBeInTheDocument()
		}
	})

	it('credits the models with links and has no Projects section', () => {
		render(<HomePage />)

		for (const credit of credits)
			expect(
				screen.getByRole('link', { name: `“${credit.title.label}”` }),
			).toHaveAttribute('href', credit.title.href)
		expect(screen.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
			'href',
			'https://creativecommons.org/licenses/by/4.0/',
		)
		expect(
			screen.queryByRole('heading', { name: /projects/i }),
		).not.toBeInTheDocument()
	})
})
