import { ArrowUpRight } from 'lucide-react'
import { CatFaceButton } from '@/features/boop-cat/ui/cat-face-button'
import { profile } from '@/shared/config/profile'
import { MetaCaption } from '@/shared/ui/meta-caption'

export function Contact() {
	return (
		<section
			id='contact'
			className='scroll-mt-16 border-t border-border px-4 py-24 sm:px-6 sm:py-32'
		>
			<div className='mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16'>
				<MetaCaption index='04'>Contact</MetaCaption>
				<div>
					<p className='max-w-2xl font-display text-[clamp(1.5rem,3.2vw,3rem)] leading-tight font-medium text-balance'>
						Write to me, tell me about the task, or just pet the
						cat.
					</p>
					<dl className='mt-12 grid gap-x-10 gap-y-6 sm:grid-cols-[auto_1fr] sm:items-baseline'>
						<dt className='font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase'>
							Looking for
						</dt>
						<dd>
							<ul className='flex flex-wrap gap-2'>
								{profile.lookingFor.map((item) => (
									<li
										key={item}
										className='rounded-full border border-rose/40 bg-rose/10 px-3 py-1 text-sm text-snow'
									>
										{item}
									</li>
								))}
							</ul>
						</dd>
						<dt className='font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase'>
							Now
						</dt>
						<dd className='flex items-center gap-2.5 text-base text-blush'>
							<span
								aria-hidden
								className='size-2 rounded-full bg-rose shadow-[0_0_10px_var(--rose)]'
							/>
							{profile.now}
						</dd>
					</dl>
					<ul className='mt-14 divide-y divide-border border-y border-border'>
						{profile.links.map((link) => (
							<li key={link.href}>
								<a
									href={link.href}
									target='_blank'
									rel='noreferrer'
									className='group flex items-center justify-between gap-4 rounded-md py-6 font-display text-[clamp(2rem,5vw,4.5rem)] leading-none font-semibold tracking-tight outline-none transition-colors hover:text-rose focus-visible:ring-3 focus-visible:ring-ring'
								>
									{link.label}
									<ArrowUpRight
										aria-hidden
										className='size-[0.8em] shrink-0 text-rose transition-transform group-hover:translate-x-1 group-hover:-translate-y-1'
									/>
								</a>
							</li>
						))}
					</ul>
					<div className='mt-14 flex items-center gap-6 room-full:hidden'>
						<CatFaceButton />
						<p className='max-w-xs text-sm text-muted-foreground'>
							The cat accepts pets at any time of day.
						</p>
					</div>
				</div>
			</div>
		</section>
	)
}
