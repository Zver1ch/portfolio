import { PawPrint } from 'lucide-react'
import { profile } from '@/shared/config/profile'
import { BoykisserCat } from '@/shared/ui/boykisser-cat/boykisser-cat'

/** Epilogue easter egg: the cat has fallen asleep by the end of the story. */
function SleepingCat() {
	return (
		<div aria-hidden className='relative w-16 shrink-0'>
			<BoykisserCat expression='sleepy' className='w-full' />
			{[0, 1, 2].map((index) => (
				<span
					key={index}
					className='zz absolute top-0 left-[72%] font-display text-xs font-semibold text-orchid'
					style={{ animationDelay: `${index * 0.9}s` }}
				>
					z
				</span>
			))}
		</div>
	)
}

export function StoryFooter() {
	return (
		<footer className='relative border-t border-border bg-ink-2/60 px-4 py-8 sm:px-6'>
			<div className='mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 text-sm text-muted-foreground'>
				<p>
					{profile.handle} · {profile.location}
				</p>
				<div className='flex items-center gap-4'>
					<SleepingCat />
					<p className='flex items-center gap-2'>
						<PawPrint aria-hidden className='size-4 text-rose' />
						Конец истории. Кот остаётся.
					</p>
				</div>
			</div>
		</footer>
	)
}
