import { profile } from '@/shared/config/profile'
import { MetaCaption } from '@/shared/ui/meta-caption'

const facts = [
	{ label: 'Handle', value: profile.handle },
	{ label: 'Location', value: profile.location },
	{ label: 'Languages', value: profile.languages.join(' · ') },
	{ label: 'Now', value: profile.now },
]

export function About() {
	return (
		<section
			id='about'
			className='scroll-mt-16 border-t border-border px-4 py-24 sm:px-6 sm:py-32'
		>
			<div className='mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16'>
				<MetaCaption index='02'>About</MetaCaption>
				<div>
					<p className='font-display text-[clamp(1.5rem,3.2vw,3rem)] leading-tight font-medium text-balance'>
						{profile.about}
					</p>
					<dl className='mt-12 grid gap-x-10 gap-y-6 sm:grid-cols-2'>
						{facts.map((fact) => (
							<div key={fact.label}>
								<dt className='font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase'>
									{fact.label}
								</dt>
								<dd className='mt-1 text-lg text-foreground'>
									{fact.value}
								</dd>
							</div>
						))}
					</dl>
				</div>
			</div>
		</section>
	)
}
