import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { profile } from '@/shared/config/profile'
import { StoryProjects } from './projects'

describe('StoryProjects', () => {
	afterEach(cleanup)

	it('renders an honest empty state without projects', () => {
		render(<StoryProjects projects={[]} />)

		expect(
			screen.getByRole('heading', {
				level: 2,
				name: 'Проекты появятся здесь вместе с живыми демо',
			}),
		).toBeInTheDocument()
		expect(screen.getByText(profile.now)).toBeInTheDocument()
		expect(screen.queryAllByRole('article')).toHaveLength(0)
	})

	it('renders a card per project and links only real urls', () => {
		render(
			<StoryProjects
				projects={[
					{
						title: 'Первый',
						description: 'описание',
						href: 'https://example.com',
						tags: ['a'],
					},
					{
						title: 'Второй',
						description: 'описание',
						href: 'TODO: ссылка',
						tags: [],
					},
				]}
			/>,
		)

		expect(screen.getAllByRole('article')).toHaveLength(2)
		expect(screen.getAllByRole('link')).toHaveLength(1)
		expect(screen.getByText('TODO: ссылка')).toBeInTheDocument()
	})
})
