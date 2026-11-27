import { BUILT_WITH, type Credit, credits } from '@/shared/config/credits'

const LINK =
	'rounded-sm text-blush underline decoration-rose/50 underline-offset-4 outline-none hover:text-snow focus-visible:ring-3 focus-visible:ring-ring'

function CreditLine({ credit }: { credit: Credit }) {
	const author = credit.author.href ? (
		<a href={credit.author.href} className={LINK} rel='noreferrer'>
			{credit.author.name}
		</a>
	) : (
		credit.author.name
	)
	return (
		<li>
			{credit.prefix ? `${credit.prefix} ` : ''}
			<a href={credit.title.href} className={LINK} rel='noreferrer'>
				“{credit.title.label}”
			</a>{' '}
			by {author},{' '}
			<a href={credit.source} className={LINK} rel='noreferrer'>
				Sketchfab
			</a>
			{credit.id === 'cat-model' ? (
				<>
					, licensed under{' '}
					<a
						href={credit.licence.href}
						className={LINK}
						rel='noreferrer'
					>
						{credit.licence.label}
					</a>
					.
				</>
			) : (
				<>
					{' ('}
					<a
						href={credit.licence.href}
						className={LINK}
						rel='noreferrer'
					>
						{credit.licence.label}
					</a>
					).
				</>
			)}{' '}
			{credit.note}
		</li>
	)
}

/** Attribution for the models and the stack (plan §1.2); also in `CREDITS.md`. */
export function Credits() {
	return (
		<section aria-labelledby='credits-heading' data-credits>
			<h2
				id='credits-heading'
				className='font-mono text-xs tracking-[0.25em] text-rose uppercase'
			>
				Credits
			</h2>
			<ul className='mt-6 max-w-3xl space-y-4 text-sm leading-relaxed text-muted-foreground room-lite:mt-4 room-lite:space-y-3'>
				{credits.map((credit) => (
					<CreditLine key={credit.id} credit={credit} />
				))}
				<li>{BUILT_WITH}</li>
			</ul>
		</section>
	)
}
