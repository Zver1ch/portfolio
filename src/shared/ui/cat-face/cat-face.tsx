import type { ComponentProps, CSSProperties } from 'react'
import { cn } from '@/shared/lib/utils'
import styles from './cat-face.module.css'

export type CatFaceProps = Omit<
	ComponentProps<'svg'>,
	'children' | 'viewBox' | 'role'
> & {
	/** CSS-only ear twitch; off under reduced motion. */
	idle?: boolean
	/** Eyes shut, for the sleeping finale. */
	asleep?: boolean
	title?: string
}

const SNOW = 'var(--snow, #f4f4f8)'
const INK = 'var(--ink, #120d16)'
const ROSE = 'var(--rose, #da85af)'
const ORCHID = 'var(--orchid, #eab8e3)'
const LAVENDER = 'var(--lavender, #c3b9e3)'

function origin(transformOrigin: string): CSSProperties {
	return { transformBox: 'fill-box', transformOrigin }
}

/**
 * Original 2D face drawn after the avatar: the wide wedge of a head with
 * cheek tufts, tall ears with rose insides, slanted black almond eyes with a
 * single highlight, three blush dots on each cheek and a small `w` mouth.
 * Server-renderable (no hooks). Parts carry `data-part` (`ear-left`,
 * `ear-right`, `eye-left`, `eye-right`, `blush`, `mouth`) for CSS or GSAP.
 */
export function CatFace({
	idle = true,
	asleep = false,
	title = 'Cat',
	className,
	...props
}: CatFaceProps) {
	return (
		<svg
			viewBox='0 0 240 220'
			role='img'
			aria-label={title}
			className={cn(idle && styles.idle, className)}
			{...props}
		>
			<title>{title}</title>
			{/* Ears */}
			<g data-part='ear-left' style={origin('78% 92%')}>
				<path
					d='M44 116C30 80 34 40 52 14C55 9 61 9 65 14C84 40 97 62 104 82Z'
					fill={SNOW}
					stroke={INK}
					strokeWidth={4}
					strokeLinejoin='round'
				/>
				<path
					d='M56 98C48 72 51 50 59 34C71 50 81 65 87 80Z'
					fill={ROSE}
				/>
			</g>
			<g data-part='ear-right' style={origin('22% 92%')}>
				<path
					d='M196 116C210 80 206 40 188 14C185 9 179 9 175 14C156 40 143 62 136 82Z'
					fill={SNOW}
					stroke={INK}
					strokeWidth={4}
					strokeLinejoin='round'
				/>
				<path
					d='M184 98C192 72 189 50 181 34C169 50 159 65 153 80Z'
					fill={ROSE}
				/>
			</g>
			{/* Head: a wide wedge with cheek tufts */}
			<path
				d='M120 62C158 62 190 78 202 102Q212 106 222 108Q212 116 206 122Q214 128 220 136Q204 136 196 138C184 170 156 190 120 190C84 190 56 170 44 138Q36 136 20 136Q26 128 34 122Q28 116 18 108Q28 106 38 102C50 78 82 62 120 62Z'
				fill={SNOW}
				stroke={INK}
				strokeWidth={4}
				strokeLinejoin='round'
			/>
			{/* Crown tuft */}
			<path
				d='M102 68Q108 50 118 62Q126 48 138 68'
				fill={SNOW}
				stroke={INK}
				strokeWidth={3.5}
				strokeLinecap='round'
				strokeLinejoin='round'
			/>
			{/* Blush: three dots a side, as on the avatar's cheeks */}
			<g data-part='blush' fill={ROSE}>
				<circle cx={56} cy={146} r={3.6} />
				<circle cx={67} cy={152} r={3.6} />
				<circle cx={78} cy={146} r={3.6} />
				<circle cx={162} cy={146} r={3.6} />
				<circle cx={173} cy={152} r={3.6} />
				<circle cx={184} cy={146} r={3.6} />
			</g>
			{/* Eyes: slanted black almonds, bored, or shut when asleep */}
			{asleep ? (
				<g
					data-part='eyes'
					fill='none'
					stroke={INK}
					strokeWidth={5}
					strokeLinecap='round'
				>
					<path d='M68 128Q86 140 104 126' />
					<path d='M136 126Q154 140 172 128' />
				</g>
			) : (
				<g>
					<g data-part='eye-left' style={origin('50% 50%')}>
						<path
							d='M66 124C74 108 96 108 106 122C100 138 76 140 66 124Z'
							fill={INK}
						/>
						<ellipse cx={92} cy={120} rx={4} ry={3} fill={SNOW} />
						<circle cx={80} cy={130} r={2} fill={LAVENDER} />
					</g>
					<g data-part='eye-right' style={origin('50% 50%')}>
						<path
							d='M174 124C166 108 144 108 134 122C140 138 164 140 174 124Z'
							fill={INK}
						/>
						<ellipse cx={148} cy={120} rx={4} ry={3} fill={SNOW} />
						<circle cx={160} cy={130} r={2} fill={LAVENDER} />
					</g>
					{/* Heavy upper lids: the bored look */}
					<path
						d='M66 123C76 114 92 112 106 120'
						fill='none'
						stroke={INK}
						strokeWidth={5}
						strokeLinecap='round'
					/>
					<path
						d='M174 123C164 114 148 112 134 120'
						fill='none'
						stroke={INK}
						strokeWidth={5}
						strokeLinecap='round'
					/>
				</g>
			)}
			{/* Nose and mouth */}
			<g
				data-part='mouth'
				fill='none'
				stroke={INK}
				strokeWidth={3}
				strokeLinecap='round'
				strokeLinejoin='round'
			>
				<path
					d='M115 148Q120 145 125 148Q121.5 153 120 153Q118.5 153 115 148Z'
					fill={ORCHID}
				/>
				<path d='M109 157Q114.5 164 120 157Q125.5 164 131 157' />
			</g>
		</svg>
	)
}
