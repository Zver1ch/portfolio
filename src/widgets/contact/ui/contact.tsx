'use client'

import { ArrowUpRight } from 'lucide-react'
import { useRef } from 'react'
import { spawnHeart } from '@/features/boop-cat/lib/stamp-hearts'
import { BoopCat } from '@/features/boop-cat/ui/boop-cat'
import { FINE_POINTER_QUERY, STORY_REDUCED_QUERY } from '@/shared/config/motion'
import { profile } from '@/shared/config/profile'
import { gsap, ScrollTrigger, useGSAP } from '@/shared/lib/gsap/register'
import { ChapterLabel } from '@/shared/ui/chapter-label'

const TRAIL_STEP = 64

export function StoryContact() {
	const scope = useRef<HTMLElement>(null)
	const cat = useRef<HTMLDivElement>(null)

	useGSAP(
		() => {
			const mm = gsap.matchMedia(scope.current ?? undefined)

			mm.add('(prefers-reduced-motion: no-preference)', () => {
				gsap.timeline({ repeat: -1 })
					.to('[data-part="paw-right"]', {
						y: -66,
						x: 16,
						rotation: -14,
						duration: 0.6,
						ease: 'power2.out',
					})
					.to('[data-part="paw-right"]', {
						rotation: 14,
						duration: 0.28,
						ease: 'sine.inOut',
						yoyo: true,
						repeat: 5,
					})
					.to('[data-part="paw-right"]', {
						y: 0,
						x: 0,
						rotation: 0,
						duration: 0.5,
						ease: 'power2.in',
					})
					.to({}, { duration: 1.2 })
				gsap.to('[data-part="tail"]', {
					rotation: 10,
					duration: 1.4,
					ease: 'sine.inOut',
					yoyo: true,
					repeat: -1,
				})

				const ambient = gsap
					.timeline({ repeat: -1, paused: true })
					.call(() => {
						const rect = cat.current?.getBoundingClientRect()
						if (!rect) return
						spawnHeart(
							rect.left +
								rect.width * gsap.utils.random(0.2, 0.8),
							rect.top + rect.height * 0.25,
							{ size: gsap.utils.random(12, 20), rise: 120 },
						)
					})
					.to({}, { duration: 0.9 })
				ScrollTrigger.create({
					trigger: scope.current,
					start: 'top 60%',
					onToggle: (self) =>
						self.isActive ? ambient.play() : ambient.pause(),
				})
			})

			mm.add(FINE_POINTER_QUERY, () => {
				const section = scope.current
				if (!section) return
				let last: { x: number; y: number } | undefined
				const onMove = (event: PointerEvent) => {
					if (
						last &&
						Math.hypot(
							event.clientX - last.x,
							event.clientY - last.y,
						) < TRAIL_STEP
					)
						return
					last = { x: event.clientX, y: event.clientY }
					spawnHeart(event.clientX, event.clientY, {
						size: gsap.utils.random(10, 16),
						rise: 50,
					})
				}
				section.addEventListener('pointermove', onMove)
				return () => section.removeEventListener('pointermove', onMove)
			})

			mm.add(STORY_REDUCED_QUERY, () => {
				gsap.from('[data-fade]', {
					autoAlpha: 0,
					duration: 0.6,
					stagger: 0.1,
					scrollTrigger: { trigger: scope.current, start: 'top 75%' },
				})
			})

			return () => mm.revert()
		},
		{ scope },
	)

	return (
		<section
			id='contact'
			ref={scope}
			className='relative isolate flex min-h-[90dvh] items-center overflow-hidden px-4 py-28 sm:px-6'
		>
			<div
				aria-hidden
				className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(48rem_30rem_at_20%_70%,color-mix(in_oklch,var(--rose)_16%,transparent),transparent_70%)]'
			/>
			<div className='mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_minmax(0,20rem)] lg:gap-20'>
				<div>
					<div data-fade>
						<ChapterLabel number='V' title='Связаться' />
					</div>
					<h2
						data-fade
						className='mt-5 font-display text-[clamp(1.75rem,5vw,3.75rem)] leading-tight font-semibold text-balance'
					>
						Помахать лапой в ответ?
					</h2>
					<p
						data-fade
						className='mt-5 max-w-lg text-lg text-muted-foreground'
					>
						Напишите мне, расскажите про задачу или просто погладьте
						кота.
					</p>
					<ul className='mt-10 max-w-lg divide-y divide-border border-y border-border'>
						{profile.links.map((link) => (
							<li key={link.href} data-fade>
								<a
									href={link.href}
									target='_blank'
									rel='noreferrer'
									className='group flex items-center justify-between gap-4 rounded-md py-5 font-display text-xl outline-none transition-colors hover:text-rose focus-visible:ring-3 focus-visible:ring-ring sm:text-2xl'
								>
									{link.label}
									<ArrowUpRight
										aria-hidden
										className='size-6 text-rose transition-transform group-hover:translate-x-1 group-hover:-translate-y-1'
									/>
								</a>
							</li>
						))}
					</ul>
				</div>
				<div ref={cat} className='mx-auto w-52 lg:w-full'>
					<BoopCat idle={false} />
				</div>
			</div>
		</section>
	)
}
