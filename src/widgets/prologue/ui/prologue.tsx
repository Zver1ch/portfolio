'use client'

import { PawPrint } from 'lucide-react'
import { useRef } from 'react'
import { BoopCat } from '@/features/boop-cat/ui/boop-cat'
import { profile } from '@/shared/config/profile'
import { gsap, SplitText, useGSAP } from '@/shared/lib/gsap/register'
import { playWhileOnScreen } from '@/shared/lib/gsap/scene'
import { ChapterLabel } from '@/shared/ui/chapter-label'
import { NightSky } from './night-sky'

export function StoryPrologue() {
	const scope = useRef<HTMLElement>(null)
	const title = useRef<HTMLHeadingElement>(null)

	useGSAP(
		() => {
			const mm = gsap.matchMedia(scope.current ?? undefined)

			mm.add('(prefers-reduced-motion: no-preference)', () => {
				const section = scope.current as Element
				// The name is painted before hydration and only ever moves, so it stays the LCP element.
				const split = SplitText.create(title.current, {
					type: 'words,chars',
					wordsClass: 'inline-block whitespace-nowrap',
					charsClass: 'inline-block',
				})
				gsap.from(split.chars, {
					x: () => gsap.utils.random(-160, 160),
					y: () => gsap.utils.random(-110, 110),
					rotation: () => gsap.utils.random(-80, 80),
					scale: () => gsap.utils.random(0.4, 1.6),
					duration: 1.2,
					ease: 'back.out(1.4)',
					stagger: { each: 0.035, from: 'random' },
				})

				playWhileOnScreen(section, [
					gsap.to('[data-hint-paw]', {
						y: 10,
						duration: 0.6,
						ease: 'sine.inOut',
						yoyo: true,
						repeat: -1,
					}),
				])

				const leaving = {
					trigger: section,
					start: 'top top',
					end: 'bottom top',
					scrub: true,
				}
				gsap.to('[data-hero-content]', {
					yPercent: -12,
					autoAlpha: 0.2,
					ease: 'none',
					scrollTrigger: leaving,
				})
				gsap.to('[data-moon]', {
					yPercent: 70,
					ease: 'none',
					scrollTrigger: leaving,
				})
				gsap.to('[data-stars]', {
					yPercent: 22,
					ease: 'none',
					scrollTrigger: leaving,
				})

				return () => split.revert()
			})

			return () => mm.revert()
		},
		{ scope },
	)

	return (
		<section
			id='prologue'
			ref={scope}
			className='relative isolate flex min-h-dvh items-center justify-center overflow-x-clip px-4 pt-24 pb-28'
		>
			<NightSky />
			<div
				data-hero-content
				className='flex w-full max-w-4xl flex-col items-center text-center'
			>
				<div className='hero-enter mb-6 [--enter-delay:0.15s]'>
					<ChapterLabel number='I' title='Пролог' />
				</div>
				<div className='hero-enter w-40 sm:w-52'>
					<BoopCat trackPointer className='w-full' />
				</div>
				<h1
					ref={title}
					className='mt-8 font-display text-[clamp(2.25rem,8vw,5.75rem)] leading-[1.05] font-semibold tracking-tight text-balance'
				>
					{profile.name}
				</h1>
				<p className='hero-enter mt-5 max-w-xl text-lg text-lavender [--enter-delay:0.35s] sm:text-xl'>
					{profile.role}
				</p>
				<p className='hero-enter mt-4 max-w-md text-sm text-muted-foreground [--enter-delay:0.5s]'>
					История про вёрстку, в которой главный герой — кот.
				</p>
			</div>
			<a
				href='#about'
				className='hero-enter absolute bottom-8 flex flex-col items-center gap-1 rounded-md px-3 py-1 font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase outline-none [--enter-delay:0.9s] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring'
			>
				листай
				<PawPrint
					aria-hidden
					data-hint-paw
					className='size-6 rotate-180 fill-rose text-rose'
				/>
			</a>
		</section>
	)
}
