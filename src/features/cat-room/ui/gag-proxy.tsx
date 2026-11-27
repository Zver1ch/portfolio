'use client'

import type { Ref } from 'react'
import type { PetOrigin } from './pet-proxy'

/**
 * The pointer-only target over a peeking head (plan §3.10, §3.14): clicking
 * the head meows. Out of the tab order and the accessibility tree, since the
 * keyboard has the real "Pet the cat" buttons. Hidden until the director
 * places it.
 */
export function GagProxy({
	ref,
	onPet,
}: {
	ref: Ref<HTMLButtonElement>
	onPet: (origin: PetOrigin) => void
}) {
	return (
		<button
			ref={ref}
			type='button'
			data-gag-proxy
			tabIndex={-1}
			aria-hidden
			onClick={(event) => {
				const rect = event.currentTarget.getBoundingClientRect()
				onPet({
					x: rect.left + rect.width / 2,
					y: rect.top + rect.height * 0.3,
				})
			}}
			className='fixed top-0 left-0 z-[45] hidden cursor-pointer rounded-full outline-none'
			style={{ display: 'none' }}
		/>
	)
}
