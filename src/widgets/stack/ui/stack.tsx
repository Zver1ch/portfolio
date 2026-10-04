import { profile } from '@/shared/config/profile'
import { MetaCaption } from '@/shared/ui/meta-caption'

const rows = [
	...profile.skills.map((skill) => ({ skill, status: 'In use' as const })),
	...profile.learning.map((skill) => ({
		skill,
		status: 'Learning' as const,
	})),
]

export function Stack() {
	return (
		<section
			id='stack'
			className='scroll-mt-16 border-t border-border px-4 py-24 sm:px-6 sm:py-32'
		>
			<div className='mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16'>
				<MetaCaption index='03'>Stack</MetaCaption>
				<div>
					<table className='w-full border-collapse text-left'>
						<caption className='sr-only'>
							Skills and whether each is in use or being learned
						</caption>
						<thead>
							<tr className='font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase'>
								<th scope='col' className='pb-4 font-normal'>
									Skill
								</th>
								<th scope='col' className='pb-4 font-normal'>
									Status
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<tr
									key={row.skill}
									className='border-t border-border'
								>
									<th
										scope='row'
										className='py-4 font-display text-xl font-medium sm:text-2xl'
									>
										{row.skill}
									</th>
									<td className='py-4'>
										<span className='inline-flex items-center gap-2 text-sm text-blush'>
											<span
												aria-hidden
												className={
													row.status === 'In use'
														? 'size-2 rounded-full bg-rose shadow-[0_0_10px_var(--rose)]'
														: 'size-2 rounded-full border border-orchid'
												}
											/>
											{row.status}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					<p className='mt-6 text-sm text-muted-foreground'>
						Learning rows move up with the first live demo.
					</p>
				</div>
			</div>
		</section>
	)
}
