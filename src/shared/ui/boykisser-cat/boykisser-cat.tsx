import type { ComponentProps, CSSProperties } from 'react'

import { cn } from '@/shared/lib/utils'
import styles from './boykisser-cat.module.css'

export type BoykisserCatExpression =
	| 'idle'
	| 'happy'
	| 'love'
	| 'surprised'
	| 'sleepy'

export type BoykisserCatProps = Omit<
	ComponentProps<'svg'>,
	'children' | 'viewBox' | 'role'
> & {
	expression?: BoykisserCatExpression
	/** Gaze direction, each axis normalized to −1..1 (clamped to the unit circle). */
	look?: { x: number; y: number }
	/** CSS-only idle loop: blink, ear twitch, tail sway. Off under reduced motion. */
	idle?: boolean
	title?: string
}

const SNOW = 'var(--snow, #f4f4f8)'
const LAVENDER = 'var(--lavender, #c3b9e3)'
const ROSE = 'var(--rose, #da85af)'
const ORCHID = 'var(--orchid, #eab8e3)'
const PLUM = '#3a2540'

const OPEN_EYES: ReadonlySet<BoykisserCatExpression> = new Set([
	'idle',
	'love',
	'surprised',
])

function origin(transformOrigin: string): CSSProperties {
	return { transformBox: 'fill-box', transformOrigin }
}

function clampLook(look: { x: number; y: number } | undefined) {
	if (!look) return { x: 0, y: 0 }
	const finite = (v: number) =>
		Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0
	const x = finite(look.x)
	const y = finite(look.y)
	const length = Math.hypot(x, y)
	return length > 1 ? { x: x / length, y: y / length } : { x, y }
}

const round = (v: number) => Math.round(v * 100) / 100

const HEART =
	'M0 7.5C-4 5-10.5 0.5-10.5-4.5C-10.5-8.2-7.6-10.5-4.8-10.5C-2.6-10.5-0.9-9.2 0-7.4C0.9-9.2 2.6-10.5 4.8-10.5C7.6-10.5 10.5-8.2 10.5-4.5C10.5 0.5 4 5 0 7.5Z'

function Eye({
	side,
	cx,
	expression,
	look,
}: {
	side: 'left' | 'right'
	cx: number
	expression: BoykisserCatExpression
	look: { x: number; y: number }
}) {
	const cy = 104
	const surprised = expression === 'surprised'
	const scleraRx = surprised ? 13 : 16.5
	const scleraRy = surprised ? 14 : 20
	const pupilRx = surprised ? 5.5 : 12
	const pupilRy = surprised ? 6 : 15.5
	const dx = round(look.x * (scleraRx - pupilRx - 2))
	const dy = round(look.y * (scleraRy - pupilRy - 2))
	const open = OPEN_EYES.has(expression)

	let pupil = null
	if (expression === 'love') {
		pupil = (
			<>
				<path
					data-shape='heart'
					d={HEART}
					transform={`translate(${cx} ${cy + 1}) scale(1.1)`}
					fill={ROSE}
					stroke={PLUM}
					strokeWidth={1.6}
					strokeLinejoin='round'
				/>
				<circle cx={cx - 5} cy={cy - 6} r={2.6} fill='#fff' />
			</>
		)
	} else if (open) {
		pupil = (
			<>
				<ellipse
					data-shape={surprised ? 'dot' : 'round'}
					cx={cx}
					cy={cy}
					rx={pupilRx}
					ry={pupilRy}
					fill={PLUM}
				/>
				{surprised ? (
					<circle cx={cx - 1.8} cy={cy - 2} r={1.8} fill='#fff' />
				) : (
					<>
						<ellipse
							cx={cx - 4}
							cy={cy - 6}
							rx={4.4}
							ry={5}
							fill='#fff'
						/>
						<circle cx={cx + 4.2} cy={cy + 6} r={2.1} fill='#fff' />
					</>
				)}
			</>
		)
	}

	return (
		<g data-part={`eye-${side}`} style={origin('50% 50%')}>
			{open ? (
				<ellipse
					cx={cx}
					cy={cy}
					rx={scleraRx}
					ry={scleraRy}
					fill='#fff'
					stroke={PLUM}
					strokeWidth={2.6}
				/>
			) : null}
			{expression === 'happy' ? (
				<path
					data-shape='arc'
					d={`M${cx - 13} ${cy + 5}Q${cx} ${cy - 14} ${cx + 13} ${cy + 5}`}
					fill='none'
					stroke={PLUM}
					strokeWidth={5}
					strokeLinecap='round'
				/>
			) : null}
			{expression === 'sleepy' ? (
				<path
					data-shape='closed'
					d={`M${cx - 13} ${cy}Q${cx} ${cy + 9} ${cx + 13} ${cy}`}
					fill='none'
					stroke={PLUM}
					strokeWidth={4.5}
					strokeLinecap='round'
				/>
			) : null}
			<g
				data-part={`pupil-${side}`}
				transform={dx || dy ? `translate(${dx} ${dy})` : undefined}
			>
				{pupil}
			</g>
		</g>
	)
}

/**
 * Original mascot cat, front-facing, hand-authored SVG (viewBox 0 0 240 260).
 * Works in Server Components (no hooks, no client directive).
 *
 * Animatable parts, query them with `[data-part="…"]` (each has
 * `transform-box: fill-box` and a matching `transform-origin`):
 * `body`, `tail`, `paw-left`, `paw-right`, `head`, `ear-left`, `ear-right`,
 * `eye-left`, `eye-right`, `pupil-left`, `pupil-right` (inside the eyes,
 * always present, empty for closed/arc eyes), `blush`, `mouth`.
 * `look` sets a `transform` attribute on the pupils, CSS idle animations use
 * the CSS `transform` of tail, ears and eyes.
 */
export function BoykisserCat({
	expression = 'idle',
	look,
	idle = false,
	title = 'Кот-маскот',
	className,
	ref,
	...props
}: BoykisserCatProps) {
	const gaze = clampLook(look)
	const love = expression === 'love'

	return (
		<svg
			ref={ref}
			viewBox='0 0 240 260'
			role='img'
			aria-label={title}
			data-expression={expression}
			className={cn(
				idle && styles.idle,
				idle && OPEN_EYES.has(expression) && styles.blink,
				className,
			)}
			{...props}
		>
			<title>{title}</title>
			<ellipse
				cx={120}
				cy={250}
				rx={74}
				ry={7}
				fill='#000'
				opacity={0.35}
			/>

			<g data-part='tail' style={origin('6% 88%')}>
				<path
					d='M158 234C198 240 226 214 218 180C213 158 192 150 184 166'
					fill='none'
					stroke={PLUM}
					strokeWidth={26}
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
				<path
					d='M158 234C198 240 226 214 218 180C213 158 192 150 184 166'
					fill='none'
					stroke={SNOW}
					strokeWidth={20.5}
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
				<path
					d='M214 200C220 186 216 170 206 162'
					fill='none'
					stroke={LAVENDER}
					strokeWidth={5}
					strokeLinecap='round'
					opacity={0.45}
				/>
			</g>

			<g data-part='body' style={origin('50% 100%')}>
				<ellipse
					cx={90}
					cy={242}
					rx={19}
					ry={9.5}
					fill={SNOW}
					stroke={PLUM}
					strokeWidth={2.5}
				/>
				<ellipse
					cx={150}
					cy={242}
					rx={19}
					ry={9.5}
					fill={SNOW}
					stroke={PLUM}
					strokeWidth={2.5}
				/>
				<path
					d='M120 136C158 136 178 182 178 212C178 236 158 245 120 245C82 245 62 236 62 212C62 182 82 136 120 136Z'
					fill={SNOW}
					stroke={PLUM}
					strokeWidth={2.5}
				/>
				<path
					d='M168 196C174 222 162 238 132 242C158 232 168 218 168 196Z'
					fill={LAVENDER}
					opacity={0.4}
				/>
				<path
					d='M72 196C66 222 78 238 108 242C82 232 72 218 72 196Z'
					fill={LAVENDER}
					opacity={0.3}
				/>
				<path
					d='M102 160Q107 168 113 162Q120 171 127 162Q133 168 138 160'
					fill='none'
					stroke={LAVENDER}
					strokeWidth={2.5}
					strokeLinecap='round'
					strokeLinejoin='round'
					opacity={0.7}
				/>
			</g>

			<g data-part='paw-left' style={origin('50% 0%')}>
				<ellipse
					cx={101}
					cy={232}
					rx={13.5}
					ry={10.5}
					fill={SNOW}
					stroke={PLUM}
					strokeWidth={2.5}
				/>
				<path
					d='M97 235V240M105 235V240'
					stroke={PLUM}
					strokeWidth={1.8}
					strokeLinecap='round'
					opacity={0.6}
				/>
			</g>
			<g data-part='paw-right' style={origin('50% 0%')}>
				<ellipse
					cx={139}
					cy={232}
					rx={13.5}
					ry={10.5}
					fill={SNOW}
					stroke={PLUM}
					strokeWidth={2.5}
				/>
				<path
					d='M135 235V240M143 235V240'
					stroke={PLUM}
					strokeWidth={1.8}
					strokeLinecap='round'
					opacity={0.6}
				/>
			</g>

			<g data-part='head' style={origin('50% 92%')}>
				<g data-part='ear-left' style={origin('72% 100%')}>
					<path
						d='M50 88C43 62 43 32 51 15C54 10 59 10 64 13C80 25 95 38 106 50Z'
						fill={SNOW}
						stroke={PLUM}
						strokeWidth={2.5}
						strokeLinejoin='round'
					/>
					<path
						d='M59 76C55 58 55 40 59 27C70 36 80 44 89 53Z'
						fill={ROSE}
						opacity={0.85}
					/>
				</g>
				<g data-part='ear-right' style={origin('28% 100%')}>
					<path
						d='M190 88C197 62 197 32 189 15C186 10 181 10 176 13C160 25 145 38 134 50Z'
						fill={SNOW}
						stroke={PLUM}
						strokeWidth={2.5}
						strokeLinejoin='round'
					/>
					<path
						d='M181 76C185 58 185 40 181 27C170 36 160 44 151 53Z'
						fill={ROSE}
						opacity={0.85}
					/>
				</g>

				<path
					d='M120 40C160 40 192 62 198 96Q206 100 214 102Q205 108 202 112Q210 118 214 125Q200 124 194 127C180 145 152 153 120 153C88 153 60 145 46 127Q40 124 26 125Q30 118 38 112Q35 108 26 102Q34 100 42 96C48 62 80 40 120 40Z'
					fill={SNOW}
					stroke={PLUM}
					strokeWidth={2.5}
					strokeLinejoin='round'
				/>
				<path
					d='M105 45L105 42Q110 28 119 37Q126 25 135 42L135 45Z'
					fill={SNOW}
				/>
				<path
					d='M105 42Q110 28 119 37Q126 25 135 42'
					fill='none'
					stroke={PLUM}
					strokeWidth={2.2}
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
				<path
					d='M60 136C80 150 100 152 120 152C140 152 160 150 180 136C164 146 142 149 120 149C98 149 76 146 60 136Z'
					fill={LAVENDER}
					opacity={0.35}
				/>

				<g data-part='blush' style={origin('50% 50%')}>
					{[68, 172].map((cx) => (
						<g key={cx}>
							<ellipse
								cx={cx}
								cy={132}
								rx={love ? 18 : 15}
								ry={love ? 10 : 8.5}
								fill={love ? ROSE : ORCHID}
								opacity={love ? 0.7 : 0.85}
							/>
							<path
								d={`M${cx - 9} 136L${cx - 4} 127M${cx - 2} 137L${cx + 3} 128M${cx + 5} 136L${cx + 10} 127`}
								stroke={love ? PLUM : ROSE}
								strokeWidth={1.8}
								strokeLinecap='round'
								opacity={love ? 0.55 : 0.9}
							/>
						</g>
					))}
				</g>

				<Eye side='left' cx={86} expression={expression} look={gaze} />
				<Eye
					side='right'
					cx={154}
					expression={expression}
					look={gaze}
				/>

				<g data-part='mouth' style={origin('50% 50%')}>
					<path
						d='M116 117Q120 115 124 117Q121.5 121.5 120 121.5Q118.5 121.5 116 117Z'
						fill={ROSE}
						stroke={PLUM}
						strokeWidth={1.4}
						strokeLinejoin='round'
					/>
					{expression === 'surprised' ? (
						<ellipse
							data-shape='o'
							cx={120}
							cy={130}
							rx={4}
							ry={5}
							fill={PLUM}
						/>
					) : (
						<path
							data-shape='w'
							d='M110 124Q115 131 120 124Q125 131 130 124'
							fill='none'
							stroke={PLUM}
							strokeWidth={2.6}
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					)}
				</g>
			</g>
		</svg>
	)
}
