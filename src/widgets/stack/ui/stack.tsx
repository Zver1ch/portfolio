'use client'

import { useRef, useState } from 'react'
import { BoopCat } from '@/features/boop-cat/ui/boop-cat'
import { STORY_FULL_QUERY, STORY_LITE_QUERY } from '@/shared/config/motion'
import { profile } from '@/shared/config/profile'
import { gsap, ScrollTrigger, useGSAP } from '@/shared/lib/gsap/register'
import { drift, playWhileOnScreen } from '@/shared/lib/gsap/scene'
import { cn } from '@/shared/lib/utils'
import { ChapterLabel } from '@/shared/ui/chapter-label'
import { ChapterNumeral } from '@/shared/ui/chapter-numeral'

const FLY_FROM = [
	{ x: -120, y: 60, rotation: -8 },
	{ x: 0, y: 120, rotation: 5 },
	{ x: 120, y: 60, rotation: 9 },
	{ x: 0, y: -90, rotation: -5 },
]

function Shelf({
	title,
	note,
	items,
	tone,
	className,
	...props
}: {
	title: string
	note: string
	items: string[]
	tone: 'solid' | 'sketch'
	className?: string
	'data-learning'?: true
}) {
	const sketch = tone === 'sketch'
	return (
		<div className={cn('relative', className)} {...props}>
			<div className='flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1'>
				<h3
					className={cn(
						'font-mono text-xs tracking-[0.25em] uppercase',
						sketch ? 'text-orchid' : 'text-rose',
					)}
				>
					{title}
				</h3>
				<p className='text-sm text-muted-foreground'>{note}</p>
			</div>
			<ul className='relative mt-4 grid gap-4 pb-3 after:absolute after:inset-x-[-0.75rem] after:bottom-0 after:h-0.5 after:rounded-full after:bg-lavender/20 sm:grid-cols-2 xl:grid-cols-4'>
				{items.map((item, index) => (
					<li
						key={item}
						data-skill
						className={cn(
							'group relative rounded-2xl border p-5 transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1',
							sketch
								? 'border-dashed border-lavender/40 bg-ink/40 hover:border-orchid/70 hover:bg-ink-2/80'
								: 'border-border bg-ink-2 shadow-[0_12px_30px_-18px_rgb(0_0_0/0.9)] hover:border-rose/60 hover:bg-ink-3',
						)}
					>
						<div className='flex items-center justify-between'>
							<span
								className={cn(
									'font-mono text-xs',
									sketch ? 'text-lavender/80' : 'text-rose',
								)}
							>
								{String(index + 1).padStart(2, '0')}
							</span>
							{sketch ? (
								<span className='rounded-full border border-orchid/40 px-2 py-0.5 font-mono text-[0.6rem] tracking-widest text-orchid uppercase'>
									учусь
								</span>
							) : (
								<span
									aria-hidden
									className='size-2 rounded-full bg-rose shadow-[0_0_10px_var(--rose)]'
								/>
							)}
						</div>
						<p
							className={cn(
								'mt-3 font-display text-base leading-snug font-medium text-pretty',
								sketch && 'text-blush',
							)}
						>
							{item}
						</p>
					</li>
				))}
			</ul>
		</div>
	)
}

export function StoryStack() {
	const scope = useRef<HTMLElement>(null)
	const [curious, setCurious] = useState(false)

	useGSAP(
		() => {
			const mm = gsap.matchMedia(scope.current ?? undefined)
			const cards = gsap.utils.toArray<HTMLElement>('[data-skill]')

			mm.add(
				{ full: STORY_FULL_QUERY, lite: STORY_LITE_QUERY },
				(context) => {
					const section = scope.current as Element
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

					playWhileOnScreen(section, [
						gsap.to('[data-part="tail"]', {
							rotation: 8,
							duration: 1.6,
							ease: 'sine.inOut',
							yoyo: true,
							repeat: -1,
						}),
					])
					drift('[data-numeral]', section, 12)

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
						trigger: section,
						start: 'top 60%',
						end: 'bottom 20%',
						onEnter: () => present.play(),
						onEnterBack: () => present.play(),
						onLeave: () => present.reverse(),
						onLeaveBack: () => present.reverse(),
					})
				},
			)

			// Easter egg: the cat is as curious about the learning shelf as the reader.
			const learning = scope.current?.querySelector('[data-learning]')
			const curiousOn = () => setCurious(true)
			const curiousOff = () => setCurious(false)
			learning?.addEventListener('pointerenter', curiousOn)
			learning?.addEventListener('pointerleave', curiousOff)

			return () => {
				learning?.removeEventListener('pointerenter', curiousOn)
				learning?.removeEventListener('pointerleave', curiousOff)
				mm.revert()
			}
		},
		{ scope },
	)

	return (
		<section
			id='stack'
			ref={scope}
			className='relative isolate overflow-hidden px-4 py-20 sm:px-6 sm:py-28'
		>
			<div
				aria-hidden
				className='pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(48rem_36rem_at_100%_0%,color-mix(in_oklch,var(--orchid)_14%,transparent),transparent_70%)]'
			/>
			<div
				aria-hidden
				className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle,color-mix(in_oklch,var(--lavender)_22%,transparent)_1px,transparent_1.5px)] bg-[size:28px_28px] [mask-image:radial-gradient(70%_70%_at_60%_50%,#000,transparent)]'
			/>
			<ChapterNumeral className='top-[-0.1em] left-[-0.06em]'>
				III
			</ChapterNumeral>
			<div className='mx-auto grid w-full max-w-6xl items-start gap-12 lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-20'>
				<div className='mx-auto w-44 sm:w-56 lg:sticky lg:top-28 lg:w-full'>
					<BoopCat
						idle={false}
						decorative
						expression={curious ? 'surprised' : 'idle'}
					/>
					<p className='mt-4 text-center font-mono text-xs text-muted-foreground'>
						кот представляет
					</p>
				</div>
				<div>
					<ChapterLabel number='III' title='Стек' />
					<h2 className='mt-5 font-display text-[clamp(1.75rem,4.5vw,3.25rem)] leading-tight font-semibold text-balance'>
						Чем я <span className='text-orchid'>мурчу</span> над
						задачами
					</h2>
					<div className='mt-10 space-y-12'>
						<Shelf
							title='Использую'
							note='в работе сегодня'
							items={profile.skills}
							tone='solid'
						/>
						<Shelf
							title='В процессе'
							note='переедут выше с первым живым демо'
							items={profile.learning}
							tone='sketch'
							data-learning
						/>
					</div>
				</div>
			</div>
		</section>
	)
}
