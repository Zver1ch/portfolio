import { ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { CatFaceButton } from '@/features/boop-cat/ui/cat-face-button'
import { profile } from '@/shared/config/profile'
import { RoomPoster } from '@/shared/ui/room-poster'
import { Credits } from './credits'

/**
 * The finale stage (plan §2, §3.4): the footer statement is the page the
 * camera pulls back from, so it is the portal; the dawn room is the slot.
 * Stacked in the static layout, overlaid once the full room runs. Credits
 * follow as a sibling of the stage, never a child.
 */
export function Finale({ children }: { children: ReactNode }) {
	return (
		<footer id='finale' className='relative border-t border-border'>
			<div
				data-stage='finale'
				className='grid room-full:h-lvh room-full:overflow-clip'
			>
				<div
					data-portal
					className='relative z-10 flex min-h-svh items-center bg-ink px-4 py-24 sm:px-6 room-full:col-start-1 room-full:row-start-1 room-full:h-lvh'
				>
					<div className='mx-auto w-full max-w-7xl'>{children}</div>
				</div>
				<div
					data-slot
					className='relative h-svh room-full:col-start-1 room-full:row-start-1 room-full:h-lvh'
				>
					<RoomPoster variant='dawn' />
					<div
						aria-hidden
						className='absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink to-transparent'
					/>
					<div className='absolute top-6 right-4 room-full:hidden sm:top-10 sm:right-10'>
						<CatFaceButton label='Pet the sleeping cat' />
					</div>
				</div>
			</div>
			<div className='relative z-[45] bg-ink px-4 pt-6 pb-16 sm:px-6'>
				<div className='mx-auto max-w-7xl'>
					<Credits />
					<div className='mt-12 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground'>
						<p>
							{profile.handle} · {profile.location}
						</p>
						<a
							href='#top'
							className='flex items-center gap-2 rounded-md outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring'
						>
							Back to top
							<ArrowUp aria-hidden className='size-4 text-rose' />
						</a>
					</div>
				</div>
			</div>
		</footer>
	)
}
