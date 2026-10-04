'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { CAT_STICKER_SRC } from '@/shared/config/stickers'
import { cn } from '@/shared/lib/utils'
import { stampHearts } from '../lib/stamp-hearts'
import { boop } from '../model/boop'

/**
 * The 2D face as a button: pets the cat (meow, hearts, counter). It stands
 * in for the live cat wherever the room is not running: static mode, the
 * loader veil, the contact and finale sections.
 */
export function CatFaceButton({
	label = 'Pet the cat',
	priority = false,
	className,
}: {
	label?: string
	/** Above the fold: fetch the sticker eagerly. */
	priority?: boolean
	className?: string
}) {
	const button = useRef<HTMLButtonElement>(null)
	// Remounting the face restarts its pop animation on every click.
	const [pops, setPops] = useState(0)

	const onClick = () => {
		boop()
		const rect = button.current?.getBoundingClientRect()
		if (rect)
			stampHearts({
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height * 0.35,
			})
		setPops((count) => count + 1)
	}

	return (
		<button
			ref={button}
			type='button'
			aria-label={label}
			onClick={onClick}
			className={cn(
				'relative block size-28 cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background sm:size-36',
				className,
			)}
		>
			<span
				key={pops}
				className={cn('block size-full', pops > 0 && 'face-pop')}
			>
				<Image
					src={CAT_STICKER_SRC}
					alt=''
					width={1024}
					height={1024}
					sizes='(min-width: 640px) 9rem, 7rem'
					priority={priority}
					draggable={false}
					className='size-full select-none'
				/>
			</span>
		</button>
	)
}
