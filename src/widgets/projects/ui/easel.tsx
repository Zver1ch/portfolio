import { cn } from '@/shared/lib/utils'

/** The empty easel: a blank canvas, a swinging «скоро» tag and room for the peeking cat. */
export function Easel({ className }: { className?: string }) {
	return (
		<div className={cn('relative', className)}>
			<svg
				aria-hidden
				viewBox='0 0 320 320'
				className='relative z-10 w-full'
				fill='none'
			>
				<path
					d='M96 230L62 310M224 230L258 310M160 230V312'
					stroke='var(--lavender)'
					strokeOpacity={0.55}
					strokeWidth={6}
					strokeLinecap='round'
				/>
				<rect
					x={34}
					y={8}
					width={252}
					height={206}
					rx={14}
					fill='var(--ink-2)'
					stroke='var(--lavender)'
					strokeOpacity={0.6}
					strokeWidth={4}
				/>
				<rect
					x={52}
					y={26}
					width={216}
					height={170}
					rx={8}
					stroke='var(--rose)'
					strokeOpacity={0.5}
					strokeWidth={2.5}
					strokeDasharray='3 10'
					strokeLinecap='round'
				/>
				<path
					d='M130 146C130 146 106 128 106 111A12 12 0 0 1 130 105A12 12 0 0 1 154 111C154 128 130 146 130 146Z'
					fill='var(--rose)'
					fillOpacity={0.28}
					transform='translate(30 -6)'
				/>
				<rect
					x={96}
					y={214}
					width={128}
					height={12}
					rx={6}
					fill='var(--lavender)'
					fillOpacity={0.45}
				/>
			</svg>
			<span
				aria-hidden
				className='swing-tag absolute top-[3%] right-[9%] z-20 flex flex-col items-center'
			>
				<span className='h-5 w-px bg-lavender/60' />
				<span className='rounded-md border border-lavender/50 bg-ink-3 px-2 py-1 font-mono text-[0.65rem] tracking-[0.2em] text-orchid uppercase shadow-[0_8px_20px_-10px_rgb(0_0_0/0.8)]'>
					скоро
				</span>
			</span>
		</div>
	)
}
