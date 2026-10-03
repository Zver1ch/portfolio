const PLUM = '#3a2540'

/** Deterministic star field: the same positions render on the server and the client. */
function makeStars(count: number) {
	let seed = 7
	const next = () => {
		seed = (seed * 48271) % 2147483647
		return seed / 2147483647
	}
	return Array.from({ length: count }, (_, index) => ({
		index,
		x: Math.round(next() * 1440),
		y: Math.round(next() * 760),
		r: 0.8 + Math.round(next() * 12) / 10,
	}))
}

const STARS = makeStars(46)
const SPARKLES = [
	{ x: 212, y: 168, s: 1 },
	{ x: 1186, y: 126, s: 0.8 },
	{ x: 1296, y: 468, s: 0.65 },
]

export function NightSky() {
	return (
		<div
			aria-hidden
			className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'
		>
			<div className='absolute inset-0 bg-[radial-gradient(70rem_44rem_at_50%_32%,color-mix(in_oklch,var(--rose)_20%,transparent),transparent_70%),radial-gradient(36rem_26rem_at_88%_88%,color-mix(in_oklch,var(--lavender)_14%,transparent),transparent_70%)]' />
			<svg
				aria-hidden
				data-stars
				viewBox='0 0 1440 760'
				preserveAspectRatio='xMidYMid slice'
				className='absolute inset-0 h-full w-full'
			>
				{STARS.map((star) => (
					<circle
						key={star.index}
						className='star'
						cx={star.x}
						cy={star.y}
						r={star.r}
						fill='var(--snow)'
						style={{ animationDelay: `${-star.index * 0.37}s` }}
					/>
				))}
				{SPARKLES.map((sparkle) => (
					<path
						key={`${sparkle.x}-${sparkle.y}`}
						className='star'
						d='M0 -9C1 -3 3 -1 9 0C3 1 1 3 0 9C-1 3 -3 1 -9 0C-3 -1 -1 -3 0 -9Z'
						fill='var(--orchid)'
						transform={`translate(${sparkle.x} ${sparkle.y}) scale(${sparkle.s})`}
						style={{ animationDelay: `${-sparkle.x * 0.01}s` }}
					/>
				))}
			</svg>
			<svg
				aria-hidden
				data-moon
				viewBox='0 0 140 140'
				className='absolute top-[13%] left-[6%] w-20 [filter:drop-shadow(0_0_28px_color-mix(in_oklch,var(--rose)_60%,transparent))] sm:top-[16%] sm:left-[calc(50%-19rem)] sm:w-36'
			>
				<g transform='rotate(-24 70 70)'>
					<path
						d='M70 10A60 60 0 1 0 70 130A66 66 0 0 1 70 10Z'
						fill='var(--blush)'
						stroke={PLUM}
						strokeWidth={2.5}
						strokeLinejoin='round'
					/>
					<circle
						cx={32}
						cy={50}
						r={6}
						fill='var(--lavender)'
						opacity={0.6}
					/>
					<circle
						cx={22}
						cy={82}
						r={4}
						fill='var(--lavender)'
						opacity={0.5}
					/>
					<circle
						cx={40}
						cy={108}
						r={3}
						fill='var(--lavender)'
						opacity={0.45}
					/>
				</g>
			</svg>
		</div>
	)
}
