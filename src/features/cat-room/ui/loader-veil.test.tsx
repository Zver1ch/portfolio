import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetRoomStore, setRoomProgress, startRoom } from '../model/room-store'
import { LoaderVeil } from './loader-veil'

describe('LoaderVeil', () => {
	beforeEach(resetRoomStore)
	afterEach(cleanup)

	it('shows the face slot, the label and the live progress', () => {
		render(
			<LoaderVeil>
				<button type='button'>face</button>
			</LoaderVeil>,
		)
		expect(screen.getByRole('button', { name: 'face' })).toBeInTheDocument()
		expect(screen.getByText('Building the room…')).toBeInTheDocument()
		const bar = screen.getByRole('progressbar', {
			name: 'Building the room',
		})
		expect(bar).toHaveAttribute('aria-valuenow', '0')

		act(() => {
			startRoom()
			setRoomProgress(0.42)
		})
		expect(bar).toHaveAttribute('aria-valuenow', '42')
	})
})
