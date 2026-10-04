import { ArrowDown } from 'lucide-react'
import { CatFaceButton } from '@/features/boop-cat/ui/cat-face-button'
import { profile } from '@/shared/config/profile'
import { MetaCaption } from '@/shared/ui/meta-caption'

/**
 * Name, role and tagline over the hero. Server-rendered and never hidden:
 * the h1 is the LCP element (plan §3.15). The block itself lets pointer
 * events through to the room; only the face button takes them.
 */
export function HeroCopy() {
	return (
		<div
			data-hero-copy
			className='pointer-events-none absolute inset-x-0 top-0 z-[45] h-svh'
		>
			<div className='mx-auto flex h-full max-w-7xl flex-col px-4 pt-20 pb-16 sm:px-6 sm:pb-24'>
				<div className='pointer-events-auto mb-auto self-end'>
					<CatFaceButton priority />
				</div>
				<MetaCaption index='01' as='p'>
					Role
				</MetaCaption>
				<h1 className='mt-4 font-display text-[clamp(2.5rem,7vw,6rem)] leading-[1.02] font-semibold tracking-tight text-balance'>
					{profile.name}
				</h1>
				<p className='mt-4 text-lg text-lavender sm:text-xl'>
					{profile.role}
				</p>
				<p className='mt-2 max-w-xl text-base text-blush/90 sm:text-lg'>
					{profile.tagline}
				</p>
				<p className='mt-8 flex items-center gap-2 font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase'>
					Scroll to dive in
					<ArrowDown aria-hidden className='size-4 text-rose' />
				</p>
			</div>
		</div>
	)
}
