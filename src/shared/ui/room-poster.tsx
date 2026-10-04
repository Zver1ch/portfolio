import { getImageProps } from 'next/image'
import { cn } from '@/shared/lib/utils'

export type PosterVariant = 'night' | 'dawn'

/** Rendered by `pnpm assets:posters` from the lab with the fake screen (plan §5). */
const POSTERS = {
	night: {
		landscape: '/posters/room-night.jpg',
		portrait: '/posters/room-night-portrait.jpg',
	},
	dawn: {
		landscape: '/posters/room-dawn.jpg',
		portrait: '/posters/room-dawn-portrait.jpg',
	},
} as const

/**
 * The pre-rendered room behind the hero and the finale: the whole picture in
 * static mode, the stand-in until the live scene's first frame otherwise.
 * Decorative; the copy on top carries the meaning. Portrait viewports get the
 * portrait render (plan §3.15).
 */
export function RoomPoster({
	variant,
	priority = false,
	className,
}: {
	variant: PosterVariant
	/** The night poster is the first paint of the page. */
	priority?: boolean
	className?: string
}) {
	const common = { alt: '', sizes: '100vw', priority }
	const {
		props: { srcSet: landscape, ...img },
	} = getImageProps({
		...common,
		src: POSTERS[variant].landscape,
		width: 1920,
		height: 1200,
	})
	const {
		props: { srcSet: portrait },
	} = getImageProps({
		...common,
		src: POSTERS[variant].portrait,
		width: 1080,
		height: 1920,
	})
	return (
		<picture
			data-poster={variant}
			className={cn(
				'pointer-events-none absolute inset-0 block overflow-hidden',
				className,
			)}
		>
			<source media='(max-aspect-ratio: 1/1)' srcSet={portrait} />
			<img
				{...img}
				srcSet={landscape}
				alt=''
				aria-hidden
				className='size-full object-cover'
			/>
		</picture>
	)
}
