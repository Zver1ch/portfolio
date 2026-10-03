import { cn } from '@/shared/lib/utils'

/** Outlined roman numeral behind a chapter; parents drift it with `[data-numeral]`. */
export function ChapterNumeral({
	children,
	className,
}: {
	children: string
	className?: string
}) {
	return (
		<span
			aria-hidden
			data-numeral
			className={cn(
				'chapter-numeral pointer-events-none absolute -z-10 hidden font-display text-[clamp(10rem,18vw,16rem)] leading-none font-semibold select-none lg:block',
				className,
			)}
		>
			{children}
		</span>
	)
}
