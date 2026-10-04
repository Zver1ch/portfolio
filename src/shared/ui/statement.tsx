import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

/** Giant uppercase display type: the statement after the dive and the finale's. */
export function Statement({
	as: Tag = 'p',
	children,
	className,
}: {
	as?: 'p' | 'h2'
	children: ReactNode
	className?: string
}) {
	return (
		<Tag
			className={cn(
				'font-display text-[clamp(2.25rem,8.5vw,8.5rem)] leading-[0.95] font-semibold tracking-tight text-balance uppercase',
				className,
			)}
		>
			{children}
		</Tag>
	)
}
