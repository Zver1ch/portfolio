'use client'

import { PawPrint } from 'lucide-react'
import { useRef } from 'react'
import { BoopCat } from '@/features/boop-cat/ui/boop-cat'
import { STORY_REDUCED_QUERY } from '@/shared/config/motion'
import { profile } from '@/shared/config/profile'
import { gsap, SplitText, useGSAP } from '@/shared/lib/gsap/register'
import { ChapterLabel } from '@/shared/ui/chapter-label'

export function StoryPrologue() {
	const scope = useRef<HTMLElement>(null)
	const title = useRef<HTMLHeadingElement>(null)
	const role = useRef<HTMLParagraphElement>(null)

	useGSAP(
		() => {
			const mm = gsap.matchMedia(scope.current ?? undefined)

			mm.add(
				{ motion: '(prefers-reduced-motion: no-preference)' },
				() => {
					const split = SplitText.create(title.current, {
						type: 'chars',
						charsClass: 'inline-block',
					})
					const tl = gsap.timeline({
						defaults: { ease: 'power3.out' },
					})
					tl.from(split.chars, {
						x: () => gsap.utils.random(-360, 360),
						y: () => gsap.utils.random(-220, 220),
						rotation: () => gsap.utils.random(-160, 160),
						scale: () => gsap.utils.random(0.2, 2),
						autoAlpha: 0,
						duration: 1.3,
						ease: 'back.out(1.5)',
						stagger: { each: 0.05, from: 'random' },
					})
						.from(
							'[data-reveal="label"]',
							{ autoAlpha: 0, y: 12, duration: 0.6 },
							0.2,
						)
						.from(
							'[data-reveal="cat"]',
							{
								autoAlpha: 0,
								scale: 0.7,
								y: 40,
								duration: 1,
								ease: 'back.out(1.8)',
							},
							0.1,
						)
						.from(
							role.current,
							{ autoAlpha: 0, y: 24, duration: 0.8 },
							'-=0.5',
						)
						.from(
							'[data-reveal="hint"]',
							{ autoAlpha: 0, duration: 0.8 },
							'-=0.2',
						)
					// Chars are scattered now; show the heading (hidden by CSS until JS ran).
					title.current?.classList.remove('story-pending')
					role.current?.classList.remove('story-pending')

					gsap.to('[data-hint-paw]', {
						y: 10,
						duration: 0.6,
						ease: 'sine.inOut',
						yoyo: true,
						repeat: -1,
					})
					gsap.to('[data-hero-content]', {
						yPercent: -12,
						autoAlpha: 0.2,
						ease: 'none',
						scrollTrigger: {
							trigger: scope.current,
							start: 'top top',
							end: 'bottom top',
							scrub: true,
						},
					})
				},
			)

			mm.add(STORY_REDUCED_QUERY, () => {
				title.current?.classList.remove('story-pending')
				role.current?.classList.remove('story-pending')
				gsap.from('[data-hero-content]', {
					autoAlpha: 0,
					duration: 0.6,
				})
			})

			return () => mm.revert()
		},
		{ scope },
	)

	return (
		<section
			id='prologue'
			ref={scope}
			className='relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-4 pt-24 pb-28'
		>
			<div
				aria-hidden
				className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_50%_35%,color-mix(in_oklch,var(--rose)_22%,transparent),transparent_70%),radial-gradient(30rem_24rem_at_85%_80%,color-mix(in_oklch,var(--lavender)_14%,transparent),transparent_70%)]'
			/>
			<div
				data-hero-content
				className='flex w-full max-w-4xl flex-col items-center text-center'
			>
				<div data-reveal='label' className='mb-6'>
					<ChapterLabel number='I' title='Пролог' />
				</div>
				<div data-reveal='cat' className='w-40 sm:w-52'>
					<BoopCat trackPointer className='w-full' />
				</div>
				<h1
					ref={title}
					className='story-pending mt-8 font-display text-[clamp(2.25rem,8vw,5.75rem)] leading-[1.05] font-semibold tracking-tight text-balance'
				>
					{profile.name}
				</h1>
				<p
					ref={role}
					className='story-pending mt-5 max-w-xl text-lg text-lavender sm:text-xl'
				>
					{profile.role}
				</p>
			</div>
			<a
				href='#about'
				data-reveal='hint'
				className='absolute bottom-8 flex flex-col items-center gap-1 rounded-md px-3 py-1 font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring'
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
