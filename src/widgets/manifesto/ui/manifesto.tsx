import { profile } from '@/shared/config/profile'
import { Statement } from '@/shared/ui/statement'

/**
 * The first 2D section: what the dive lands on, so it is the page shown on
 * the monitor. Opaque on purpose; the corner captions and the typing line
 * are decoration around the statement.
 */
export function Manifesto() {
	return (
		<div
			data-manifesto
			className='relative flex min-h-svh flex-col justify-between bg-ink px-4 py-24 sm:px-6'
		>
			<div className='mx-auto flex w-full max-w-7xl justify-between font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase'>
				<span>{profile.handle}</span>
				<span>{profile.location}</span>
			</div>
			<div className='mx-auto w-full max-w-7xl py-12'>
				<Statement>{profile.statement}</Statement>
			</div>
			<div className='mx-auto flex w-full max-w-7xl items-end justify-between gap-6 font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase'>
				<span>{profile.languages.join(' · ')}</span>
				<span
					data-typing-line
					aria-hidden
					className='min-w-[10ch] text-right tracking-normal normal-case'
				>
					asdfghjkl
				</span>
			</div>
		</div>
	)
}
