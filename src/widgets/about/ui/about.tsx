'use client'

import { useRef } from 'react'
import { BoopCat } from '@/features/boop-cat/ui/boop-cat'
import {
	STORY_FULL_QUERY,
	STORY_LITE_QUERY,
	STORY_REDUCED_QUERY,
} from '@/shared/config/motion'
import { profile } from '@/shared/config/profile'
import { pinEnd } from '@/shared/lib/gsap/ranges'
import {
	gsap,
	ScrollTrigger,
	SplitText,
	useGSAP,
} from '@/shared/lib/gsap/register'
import { ChapterLabel } from '@/shared/ui/chapter-label'

const WALK_PATH =
	'M0 150Q62 60 125 150T250 150T375 150T500 150T625 150T750 150T875 150T1000 150'
const WALK_PARTS =
	'[data-part="body"],[data-part="head"],[data-part="paw-left"],[data-part="paw-right"]'

const facts = [
	{ label: 'Ник', value: profile.handle },
	{ label: 'Город', value: profile.location },
]

export function StoryAbout() {
	const scope = useRef<HTMLElement>(null)
	const pin = useRef<HTMLDivElement>(null)
	const walker = useRef<HTMLDivElement>(null)
	const path = useRef<SVGPathElement>(null)

	useGSAP(
		() => {
			const mm = gsap.matchMedia(scope.current ?? undefined)

			const revealLines = (
				trigger: Element,
				start: string,
				end: string | (() => string),
			) =>
				SplitText.create(
					scope.current?.querySelectorAll(
						'[data-split]',
					) as NodeListOf<Element>,
					{
						type: 'lines',
						mask: 'lines',
						autoSplit: true,
						onSplit: (self) =>
							gsap.from(self.lines, {
								yPercent: 115,
								ease: 'none',
								stagger: 0.35,
								scrollTrigger: {
									trigger,
									start,
									end,
									scrub: 0.6,
								},
							}),
					},
				)

			const walk = (scrollTrigger: ScrollTrigger.Vars) => {
				const tl = gsap.timeline({
					defaults: { ease: 'none' },
					scrollTrigger,
				})
				const steps = 8
				tl.to(
					walker.current,
					{
						motionPath: {
							path: path.current as SVGPathElement,
							align: path.current as SVGPathElement,
							alignOrigin: [0.5, 1],
						},
						duration: 10,
					},
					0,
				)
					.to(
						WALK_PARTS,
						{
							y: -7,
							duration: 10 / (steps * 2),
							repeat: steps * 2 - 1,
							yoyo: true,
							ease: 'sine.inOut',
						},
						0,
					)
					.to(
						'[data-part="tail"]',
						{
							rotation: 16,
							duration: 10 / (steps * 2),
							repeat: steps * 2 - 1,
							yoyo: true,
							ease: 'sine.inOut',
						},
						0,
					)
					.from(
						'[data-fact]',
						{
							autoAlpha: 0,
							y: 20,
							stagger: 0.6,
							duration: 1,
							ease: 'power2.out',
						},
						3,
					)
				return tl
			}

			mm.add(STORY_FULL_QUERY, () => {
				const end = pinEnd(2.4)
				ScrollTrigger.create({
					trigger: scope.current,
					start: 'top top',
					end,
					pin: pin.current,
					anticipatePin: 1,
				})
				revealLines(
					scope.current as Element,
					'top top',
					() => `+=${Math.round(window.innerHeight * 1.2)}`,
				)
				walk({
					trigger: scope.current,
					start: 'top top',
					end,
					scrub: 0.8,
					invalidateOnRefresh: true,
				})
			})

			mm.add(STORY_LITE_QUERY, () => {
				revealLines(scope.current as Element, 'top 70%', 'top 25%')
				walk({
					trigger: walker.current?.parentElement,
					start: 'top 85%',
					end: 'bottom 45%',
					scrub: 0.8,
					invalidateOnRefresh: true,
				})
			})

			mm.add(STORY_REDUCED_QUERY, () => {
				gsap.from('[data-fade]', {
					autoAlpha: 0,
					duration: 0.8,
					stagger: 0.15,
					scrollTrigger: { trigger: scope.current, start: 'top 70%' },
				})
			})

			return () => mm.revert()
		},
		{ scope },
	)

	return (
		<section id='about' ref={scope} className='relative'>
			<div
				ref={pin}
				className='relative flex flex-col justify-between gap-10 overflow-hidden px-4 pt-28 pb-6 sm:px-6 story:h-dvh story:pt-24'
			>
				<div className='mx-auto w-full max-w-6xl'>
					<div data-fade>
						<ChapterLabel number='II' title='Обо мне' />
					</div>
					<h2
						data-split
						className='mt-5 max-w-3xl font-display text-[clamp(1.75rem,4.5vw,3.25rem)] leading-tight font-semibold text-balance'
					>
						Кот идёт рядом, пока я рассказываю
					</h2>
					<p
						data-split
						data-fade
						className='mt-6 max-w-2xl text-lg leading-relaxed text-blush sm:text-xl'
					>
						{profile.about}
					</p>
					<dl className='mt-8 flex flex-wrap gap-3'>
						{facts.map((fact) => (
							<div
								key={fact.label}
								data-fact
								data-fade
								className='rounded-xl border border-border bg-ink-2 px-4 py-3'
							>
								<dt className='font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase'>
									{fact.label}
								</dt>
								<dd className='mt-0.5 text-base text-foreground'>
									{fact.value}
								</dd>
							</div>
						))}
					</dl>
				</div>

				<div className='relative mx-auto h-44 w-full max-w-6xl sm:h-52 story:h-[32vh]'>
					<svg
						aria-hidden
						viewBox='0 0 1000 200'
						preserveAspectRatio='none'
						className='absolute inset-0 h-full w-full overflow-visible'
					>
						<path
							ref={path}
							d={WALK_PATH}
							fill='none'
							stroke='var(--lavender)'
							strokeOpacity={0.45}
							strokeWidth={3}
							strokeLinecap='round'
							strokeDasharray='1 14'
							vectorEffect='non-scaling-stroke'
						/>
					</svg>
					<div
						ref={walker}
						className='absolute right-[6%] bottom-2 w-24 sm:w-28 story:w-32'
					>
						<BoopCat idle={false} />
					</div>
				</div>
			</div>
		</section>
	)
}
