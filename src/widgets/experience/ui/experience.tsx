import { profile } from '@/shared/config/profile'
import { MetaCaption } from '@/shared/ui/meta-caption'

export function Experience() {
	return (
		<section
			id='work'
			className='scroll-mt-16 border-t border-border px-4 py-24 sm:px-6 sm:py-32'
		>
			<div className='mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16'>
				<MetaCaption index='03'>Work</MetaCaption>
				<ol className='divide-y divide-border border-y border-border'>
					{profile.experience.map((job) => (
						<li key={job.place} className='py-8'>
							<div className='flex flex-wrap items-baseline justify-between gap-x-10 gap-y-2'>
								<h3 className='font-display text-xl font-medium sm:text-2xl'>
									{job.place}
								</h3>
								<p className='font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase'>
									{job.period}
								</p>
							</div>
							<p className='mt-4 max-w-2xl text-lg text-foreground'>
								{job.summary}
							</p>
						</li>
					))}
				</ol>
			</div>
		</section>
	)
}
