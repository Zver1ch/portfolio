/** Warm evening light: a low sun behind the cat and a ground band it sits on. */
export function Sunset() {
	return (
		<div
			aria-hidden
			className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'
		>
			<div className='absolute inset-0 bg-[radial-gradient(70rem_40rem_at_70%_100%,color-mix(in_oklch,var(--rose)_22%,transparent),transparent_70%),radial-gradient(30rem_20rem_at_10%_20%,color-mix(in_oklch,var(--lavender)_10%,transparent),transparent_70%)]' />
			<div className='absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,var(--ink-2),transparent)]' />
			<div className='absolute inset-x-0 bottom-24 h-px bg-[linear-gradient(to_right,transparent,color-mix(in_oklch,var(--lavender)_35%,transparent)_30%,color-mix(in_oklch,var(--rose)_45%,transparent)_70%,transparent)]' />
		</div>
	)
}

/** The sun disc itself; lives in the cat column so it always sets right behind the cat. */
export function Sun() {
	return (
		<div
			aria-hidden
			data-sun
			className='pointer-events-none absolute top-[4%] left-1/2 -z-10 aspect-square w-[98%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_38%,var(--orchid),var(--rose)_52%,color-mix(in_oklch,var(--rose)_55%,var(--ink))_100%)] opacity-90 shadow-[0_0_80px_color-mix(in_oklch,var(--rose)_40%,transparent)]'
		/>
	)
}
