import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const hooks = vi.hoisted(() => ({ mode: 'full' as 'static' | 'lite' | 'full' }))
vi.mock('../model/room-mode', () => ({ useRoomMode: () => hooks.mode }))

import { getPortal, resetPortals } from '../model/portals'
import { resetTimeline, timeline } from '../model/timeline'
import { PortalStage } from './portal-stage'

function Stage() {
	return (
		<section id='top'>
			<PortalStage track='dive' className='grid'>
				<div data-slot>
					<div data-loader-veil />
				</div>
				<div data-portal>page</div>
			</PortalStage>
			<div data-hero-copy />
		</section>
	)
}

describe('PortalStage', () => {
	beforeEach(() => {
		resetPortals()
		resetTimeline()
	})
	afterEach(cleanup)

	it('registers the portal in full mode, warps it at rest and unregisters on unmount', () => {
		hooks.mode = 'full'
		timeline.viewport = { width: 1440, height: 900 }
		const { container, unmount } = render(<Stage />)
		const stage = container.querySelector('[data-stage="hero"]')
		expect(stage).not.toBeNull()
		const portal = getPortal('dive')
		expect(portal).toBeDefined()
		expect(portal?.element).toBe(container.querySelector('[data-portal]'))
		expect(portal?.element.style.transformOrigin).toBe('0 0')

		unmount()
		expect(getPortal('dive')).toBeUndefined()
		expect(timeline.dive).toBe(0)
	})

	it('registers the finale portal under its own track inside a footer', () => {
		hooks.mode = 'full'
		const { container, unmount } = render(
			<footer id='finale'>
				<PortalStage track='finale'>
					<div data-portal>statement</div>
					<div data-slot />
				</PortalStage>
				<div data-credits-roll />
			</footer>,
		)
		expect(
			container.querySelector('[data-stage="finale"] [data-portal]'),
		).toBe(getPortal('finale')?.element)
		expect(getPortal('dive')).toBeUndefined()
		unmount()
		expect(getPortal('finale')).toBeUndefined()
		expect(timeline.finale).toBe(0)
	})

	it('registers nothing in static mode', () => {
		hooks.mode = 'static'
		render(<Stage />)
		expect(getPortal('dive')).toBeUndefined()
	})
})
