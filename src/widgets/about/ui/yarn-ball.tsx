const PLUM = '#3a2540'

/** Ball of yarn drawn in the mascot's style; rolls ahead of the walking cat. */
export function YarnBall({ className }: { className?: string }) {
	return (
		<svg aria-hidden viewBox='0 0 60 60' className={className}>
			<circle
				cx={30}
				cy={30}
				r={24}
				fill='var(--rose)'
				stroke={PLUM}
				strokeWidth={2.5}
			/>
			<path
				d='M10 22Q30 12 50 24M8 34Q30 24 52 32M14 44Q30 36 48 44'
				fill='none'
				stroke='var(--orchid)'
				strokeWidth={2.5}
				strokeLinecap='round'
				opacity={0.9}
			/>
			<path
				d='M22 10Q18 30 26 52M40 8Q46 30 36 52'
				fill='none'
				stroke='var(--orchid)'
				strokeWidth={2}
				strokeLinecap='round'
				opacity={0.55}
			/>
			<path
				d='M48 42Q58 46 54 56'
				fill='none'
				stroke='var(--rose)'
				strokeWidth={2.5}
				strokeLinecap='round'
			/>
		</svg>
	)
}
