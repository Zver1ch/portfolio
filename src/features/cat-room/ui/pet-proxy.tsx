'use client'

import type { Ref } from 'react'

export type PetOrigin = { x: number; y: number }

/**
 * A real button the director keeps over the live cat (plan §3.11, §3.14):
 * the pet target for pointer and keyboard once the room runs. Hidden until
 * the director places it, disabled until the first frame.
 */
export function PetProxy({
	ref,
	label = 'Pet the cat',
	disabled,
	onPet,
}: {
	ref: Ref<HTMLButtonElement>
	label?: string
	disabled: boolean
	onPet: (origin: PetOrigin) => void
}) {
	return (
		<button
			ref={ref}
			type='button'
			data-pet-proxy
			aria-label={label}
			disabled={disabled}
			onClick={(event) => {
				const rect = event.currentTarget.getBoundingClientRect()
				onPet({
					x: rect.left + rect.width / 2,
					y: rect.top + rect.height * 0.35,
				})
			}}
			className='fixed top-0 left-0 z-[45] hidden cursor-pointer rounded-[2rem] outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background'
			style={{ display: 'none' }}
		/>
	)
}
