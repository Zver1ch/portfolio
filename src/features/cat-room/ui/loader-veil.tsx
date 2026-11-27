'use client'

import type { ReactNode } from 'react'
import { useRoomState } from '../model/room-store'

/**
 * Server-rendered over the hero poster (plan §3.11): the 2D face as the pet
 * target until the first frame, the label and real progress. It never locks
 * scroll and lets pointer events through except on the face. CSS hides it
 * under reduced motion, without JS, in static mode and after 20 s regardless.
 */
export function LoaderVeil({ children }: { children: ReactNode }) {
	const { progress } = useRoomState()
	const percent = Math.round(progress * 100)
	return (
		<div
			data-loader-veil
			className='pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-ink/40'
		>
			<div className='pointer-events-auto'>{children}</div>
			<p className='font-mono text-xs tracking-[0.3em] text-blush uppercase'>
				Building the room…
			</p>
			<div
				role='progressbar'
				aria-label='Building the room'
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={percent}
				className='h-1 w-40 overflow-hidden rounded-full bg-ink-3'
			>
				<div
					className='h-full bg-rose transition-[width] duration-300'
					style={{ width: `${percent}%` }}
				/>
			</div>
		</div>
	)
}
