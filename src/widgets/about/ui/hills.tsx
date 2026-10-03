/** Two soft plum hills; the ridge of the front one is where the cat walks. */
export function Hills({ className }: { className?: string }) {
	return (
		<svg
			aria-hidden
			viewBox='0 0 1000 200'
			preserveAspectRatio='none'
			className={className}
		>
			<path
				d='M0 200V112C120 72 260 92 400 104C540 116 680 54 820 80C900 94 950 102 1000 110V200Z'
				fill='var(--ink-3)'
			/>
			<path
				d='M0 200V156C140 126 280 148 420 136C540 126 660 148 800 132C880 123 940 136 1000 146V200Z'
				fill='var(--ink-2)'
			/>
			<path
				d='M0 156C140 126 280 148 420 136C540 126 660 148 800 132C880 123 940 136 1000 146'
				fill='none'
				stroke='var(--lavender)'
				strokeOpacity={0.28}
				strokeWidth={1.5}
				vectorEffect='non-scaling-stroke'
			/>
		</svg>
	)
}
