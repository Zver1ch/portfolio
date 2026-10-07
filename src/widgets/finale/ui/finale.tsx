import { ArrowUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { CatFaceButton } from '@/features/boop-cat/ui/cat-face-button'
import { PortalStage } from '@/features/cat-room/ui/portal-stage'
import { profile } from '@/shared/config/profile'
import { RoomPoster } from '@/shared/ui/room-poster'
import { Credits } from './credits'

/**
 * The finale stage (plan §2, §3.4): the footer statement is the page the
 * camera pulls back from, so it is the portal; the dawn room is the slot.
 * Stacked in the static layout, overlaid once the full room runs, where the
 * stage pins and the credits are a sibling of it, never a child: pinned at
 * the footer's bottom edge they roll in over the last stretch of the
 * pull-back, as a column on the left so the cat stays in reach. In lite mode
 * the statement sticks to the top of the viewport under the canvas while
 * the slot and a spacer scroll by (the pull-back's length), and the credits
 * follow in the flow, rolling in over the dawn room, which the lite camera
 * frames with the cat above them.
 */
export function Finale({ children }: { children: ReactNode }) {
	return (
		<footer id='finale' className='relative border-t border-border'>
			<PortalStage
				track='finale'
				className='grid room-full:h-lvh room-full:overflow-clip'
			>
				<div
					data-portal
					className='relative z-10 flex min-h-svh items-center bg-ink px-4 py-24 sm:px-6 room-full:col-start-1 room-full:row-start-1 room-full:h-lvh room-lite:sticky room-lite:top-0'
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
					<div
						data-static-face
						className='absolute top-6 right-4 sm:top-10 sm:right-10'
					>
						<CatFaceButton />
					</div>
				</div>
				<div
					data-stage-spacer
					aria-hidden
					className='hidden room-lite:block room-lite:h-[80svh]'
				/>
			</PortalStage>
			<div
				data-credits-roll
				className='relative z-[45] px-4 pt-20 pb-16 sm:px-6 room-full:absolute room-full:bottom-0 room-full:left-0 room-full:max-w-xl room-full:pr-10 room-full:pb-10 room-lite:pt-10 room-lite:pb-8'
			>
				<div className='mx-auto max-w-7xl room-full:mx-0'>
					<Credits />
					<div className='mt-12 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground room-full:mt-8 room-lite:mt-8'>
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
