import { cn } from '@/shared/lib/utils'

export function ChapterLabel({
	number,
	title,
	className,
}: {
	number: string
	title: string
	className?: string
}) {
	return (
		<p
			className={cn(
				'flex items-center gap-3 font-mono text-xs tracking-[0.25em] text-rose uppercase',
				className,
			)}
		>
			<span aria-hidden className='h-px w-8 bg-rose/60' />
			Глава {number}
			<span aria-hidden>·</span>
			{title}
		</p>
	)
}
