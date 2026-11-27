import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

/** "(02) About": the small mono caption that heads a section; the number is decoration. */
export function MetaCaption({
	index,
	as: Tag = 'h2',
	children,
	className,
}: {
	index: string
	as?: 'h2' | 'p'
	children: ReactNode
	className?: string
}) {
	return (
		<Tag
			className={cn(
				'font-mono text-xs tracking-[0.25em] text-rose uppercase',
				className,
			)}
		>
			<span aria-hidden>({index}) </span>
			{children}
		</Tag>
	)
}
