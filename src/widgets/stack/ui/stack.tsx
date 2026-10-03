'use client'

import { useRef } from 'react'
import { BoopCat } from '@/features/boop-cat/ui/boop-cat'
import {
	STORY_FULL_QUERY,
	STORY_LITE_QUERY,
	STORY_REDUCED_QUERY,
} from '@/shared/config/motion'
import { profile } from '@/shared/config/profile'
import { gsap, ScrollTrigger, useGSAP } from '@/shared/lib/gsap/register'
import { ChapterLabel } from '@/shared/ui/chapter-label'

const FLY_FROM = [
	{ x: -120, y: 60, rotation: -8 },
	{ x: 0, y: 120, rotation: 5 },
	{ x: 120, y: 60, rotation: 9 },
	{ x: 0, y: -90, rotation: -5 },
]

export function StoryStack() {
	const scope = useRef<HTMLElement>(null)

	useGSAP(
		() => {
			const mm = gsap.matchMedia(scope.current ?? undefined)
			const cards = gsap.utils.toArray<HTMLElement>('[data-skill]')

			mm.add(
				{ full: STORY_FULL_QUERY, lite: STORY_LITE_QUERY },
				(context) => {
					const wide = Boolean(context.conditions?.full)
					cards.forEach((card, index) => {
						const from = FLY_FROM[index % FLY_FROM.length]
						gsap.from(card, {
							...from,
							x: wide ? from.x : from.x / 3,
							autoAlpha: 0,
							duration: 0.9,
							ease: 'back.out(1.3)',
							scrollTrigger: {
								trigger: card,
								start: 'top 88%',
								toggleActions: 'play none none reverse',
							},
						})
					})

					gsap.to('[data-part="tail"]', {
						rotation: 8,
						duration: 1.6,
						ease: 'sine.inOut',
						yoyo: true,
						repeat: -1,
					})

					const present = gsap.timeline({
						paused: true,
						defaults: { ease: 'power2.out' },
					})
					present
						.to('[data-part="paw-right"]', {
							y: -64,
							x: 14,
							rotation: -18,
							duration: 0.7,
						})
						.to('[data-part="paw-right"]', {
							rotation: 8,
							duration: 0.35,
							ease: 'sine.inOut',
							yoyo: true,
							repeat: 5,
						})
						.to(
							'[data-part="head"]',
							{ rotation: 4, duration: 0.7, ease: 'sine.inOut' },
							0,
						)
					ScrollTrigger.create({
						trigger: scope.current,
						start: 'top 60%',
						end: 'bottom 20%',
						onEnter: () => present.play(),
						onEnterBack: () => present.play(),
						onLeave: () => present.reverse(),
						onLeaveBack: () => present.reverse(),
					})
				},
			)

			mm.add(STORY_REDUCED_QUERY, () => {
				gsap.from(cards, {
					autoAlpha: 0,
					duration: 0.6,
					stagger: 0.08,
					scrollTrigger: { trigger: scope.current, start: 'top 70%' },
				})
			})

			return () => mm.revert()
		},
		{ scope },
	)

	return (
		<section
			id='stack'
			ref={scope}
			className='relative isolate overflow-hidden px-4 py-28 sm:px-6 sm:py-36'
		>
			<div
				aria-hidden
				className='pointer-events-none absolute -right-40 top-10 -z-10 size-[34rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--orchid)_14%,transparent),transparent)]'
			/>
			<div className='mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-20'>
				<div className='mx-auto w-44 sm:w-56 lg:w-full'>
					<BoopCat idle={false} />
					<p className='mt-4 text-center font-mono text-xs text-muted-foreground'>
						кот представляет
					</p>
				</div>
				<div>
					<ChapterLabel number='III' title='Стек' />
					<h2 className='mt-5 font-display text-[clamp(1.75rem,4.5vw,3.25rem)] leading-tight font-semibold text-balance'>
						Чем я мурчу над задачами
					</h2>
					<ul className='mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
						{profile.skills.map((skill, index) => (
							<li
								key={skill}
								data-skill
								className='group relative rounded-2xl border border-border bg-ink-2 p-5 transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1 hover:border-rose/60 hover:bg-ink-3'
							>
								<span className='font-mono text-xs text-rose'>
									{String(index + 1).padStart(2, '0')}
								</span>
								<p className='mt-3 font-display text-base leading-snug font-medium text-pretty'>
									{skill}
								</p>
							</li>
						))}
					</ul>
				</div>
			</div>
		</section>
	)
}
