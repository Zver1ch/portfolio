'use client'

import { ArrowUpRight } from 'lucide-react'
import { useRef } from 'react'
import { spawnHeart } from '@/features/boop-cat/lib/stamp-hearts'
import { BoopCat } from '@/features/boop-cat/ui/boop-cat'
import { FINE_POINTER_QUERY } from '@/shared/config/motion'
import { profile } from '@/shared/config/profile'
import { gsap, ScrollTrigger, useGSAP } from '@/shared/lib/gsap/register'
import { drift, playWhileOnScreen } from '@/shared/lib/gsap/scene'
import { ChapterLabel } from '@/shared/ui/chapter-label'
import { ChapterNumeral } from '@/shared/ui/chapter-numeral'
import { Sun, Sunset } from './sunset'

const TRAIL_STEP = 64

export function StoryContact() {
	const scope = useRef<HTMLElement>(null)
	const cat = useRef<HTMLDivElement>(null)

	useGSAP(
		() => {
			const mm = gsap.matchMedia(scope.current ?? undefined)

			mm.add('(prefers-reduced-motion: no-preference)', () => {
				const section = scope.current as Element
				const wave = gsap
					.timeline({ repeat: -1 })
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
				const tail = gsap.to('[data-part="tail"]', {
					rotation: 10,
					duration: 1.4,
					ease: 'sine.inOut',
					yoyo: true,
					repeat: -1,
				})
				playWhileOnScreen(section, [wave, tail])
				drift('[data-numeral]', section, 12)
				drift('[data-sun]', section, 14)

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
					trigger: section,
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

			return () => mm.revert()
		},
		{ scope },
	)

	return (
		<section
			id='contact'
			ref={scope}
			className='relative isolate flex min-h-[90dvh] items-center overflow-hidden px-4 pt-20 pb-32 sm:px-6 sm:pt-28'
		>
			<Sunset />
			<ChapterNumeral className='top-[-0.1em] left-[-0.04em]'>
				V
			</ChapterNumeral>
			<div className='mx-auto grid w-full max-w-6xl items-end gap-12 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-20'>
				<div>
					<ChapterLabel number='V' title='Связаться' />
					<h2 className='mt-5 font-display text-[clamp(1.75rem,5vw,3.75rem)] leading-tight font-semibold text-balance'>
						Помахать <span className='text-orchid'>лапой</span> в
						ответ?
					</h2>
					<p className='mt-5 max-w-lg text-lg text-muted-foreground'>
						Напишите мне, расскажите про задачу или просто погладьте
						кота.
					</p>
					<dl className='mt-8 grid max-w-xl gap-x-8 gap-y-4 sm:grid-cols-[auto_1fr] sm:items-baseline'>
						<dt className='font-mono text-xs tracking-[0.25em] text-orchid uppercase'>
							Ищу
						</dt>
						<dd>
							<ul className='flex flex-wrap gap-2'>
								{profile.lookingFor.map((item) => (
									<li
										key={item}
										className='rounded-full border border-rose/40 bg-rose/10 px-3 py-1 text-sm text-snow'
									>
										{item}
									</li>
								))}
							</ul>
						</dd>
						<dt className='font-mono text-xs tracking-[0.25em] text-orchid uppercase'>
							Сейчас
						</dt>
						<dd className='flex items-center gap-2.5 text-base text-blush'>
							<span
								aria-hidden
								className='size-2 rounded-full bg-rose shadow-[0_0_10px_var(--rose)]'
							/>
							{profile.now}
						</dd>
					</dl>
					<ul className='mt-10 max-w-lg divide-y divide-border border-y border-border'>
						{profile.links.map((link) => (
							<li key={link.href}>
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
				<div ref={cat} className='relative mx-auto w-56 lg:w-full'>
					<Sun />
					<BoopCat idle={false} label='Погладить кота на прощание' />
				</div>
			</div>
		</section>
	)
}
