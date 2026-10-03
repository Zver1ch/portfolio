import { PawPrint } from 'lucide-react'
import { profile } from '@/shared/config/profile'

export function StoryFooter() {
	return (
		<footer className='border-t border-border px-4 py-8 sm:px-6'>
			<div className='mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground'>
				<p>
					{profile.handle} · {profile.location}
				</p>
				<p className='flex items-center gap-2'>
					<PawPrint aria-hidden className='size-4 text-rose' />
					Конец истории. Кот остаётся.
				</p>
			</div>
		</footer>
	)
}
