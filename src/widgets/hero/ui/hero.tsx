import type { ReactNode } from 'react'
import { RoomPoster } from '@/shared/ui/room-poster'
import { HeroCopy } from './hero-copy'

/**
 * The hero stage (plan §3.4): the poster slot and the portal holding the
 * first 2D section, stacked in the static layout and overlaid once the full
 * room runs. The hero copy is a sibling of the stage, never a child: a pinned
 * stage gets `position: fixed` and transforms that would trap it under the
 * canvas.
 */
export function Hero({ children }: { children: ReactNode }) {
	return (
		<section id='top' className='relative'>
			<div
				data-stage
				className='grid room-full:h-lvh room-full:overflow-clip'
			>
				<div
					data-slot
					className='relative h-svh room-full:col-start-1 room-full:row-start-1 room-full:h-lvh'
				>
					<RoomPoster variant='night' priority />
					<div
						aria-hidden
						className='absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink/85 to-transparent'
					/>
				</div>
				<div
					data-portal
					className='relative z-10 room-full:col-start-1 room-full:row-start-1 room-full:h-lvh'
				>
					{children}
				</div>
			</div>
			<HeroCopy />
		</section>
	)
}
