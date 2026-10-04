import type { ReactNode } from 'react'
import { CatFaceButton } from '@/features/boop-cat/ui/cat-face-button'
import { LoaderVeil } from '@/features/cat-room/ui/loader-veil'
import { RoomPoster } from '@/shared/ui/room-poster'
import { HeroCopy } from './hero-copy'

/**
 * The hero stage (plan §3.4): the poster slot and the portal holding the
 * first 2D section, stacked in the static layout and overlaid once the full
 * room runs. The hero copy is a sibling of the stage, never a child: a pinned
 * stage gets `position: fixed` and transforms that would trap it under the
 * canvas. The slot holds the loader veil (the face button until the first
 * frame) and the static face button; CSS decides which one shows.
 */
export function Hero({ children }: { children: ReactNode }) {
	return (
		<section id='top' className='relative'>
			<noscript>
				<style>{`[data-loader-veil]{display:none}[data-static-face]{display:block}`}</style>
			</noscript>
			<div
				data-stage='hero'
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
					<LoaderVeil>
						<CatFaceButton priority />
					</LoaderVeil>
					<div
						data-static-face
						className='absolute top-20 right-4 sm:right-6 lg:right-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]'
					>
						<CatFaceButton />
					</div>
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
