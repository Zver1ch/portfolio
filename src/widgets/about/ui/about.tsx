'use client'

import { useRef } from 'react'
import { BoopCat } from '@/features/boop-cat/ui/boop-cat'
import { STORY_FULL_QUERY, STORY_LITE_QUERY } from '@/shared/config/motion'
import { profile } from '@/shared/config/profile'
import { pinEnd } from '@/shared/lib/gsap/ranges'
import {
	gsap,
	ScrollTrigger,
	SplitText,
	useGSAP,
} from '@/shared/lib/gsap/register'
import { drift } from '@/shared/lib/gsap/scene'
import { ChapterLabel } from '@/shared/ui/chapter-label'
import { ChapterNumeral } from '@/shared/ui/chapter-numeral'
import { Hills } from './hills'
import { YarnBall } from './yarn-ball'

const WALK_PATH =
	'M0 150Q62 60 125 150T250 150T375 150T500 150T625 150T750 150T875 150T1000 150'
const WALK_PARTS =
	'[data-part="body"],[data-part="head"],[data-part="paw-left"],[data-part="paw-right"]'
const WALK_DURATION = 10

const facts = [
	{ label: 'Ник', value: profile.handle },
	{ label: 'Формат', value: profile.location },
	{ label: 'Языки', value: profile.languages.join(' · ') },
]

export function StoryAbout() {
	const scope = useRef<HTMLElement>(null)
	const pin = useRef<HTMLDivElement>(null)
	const walker = useRef<HTMLDivElement>(null)
	const yarn = useRef<HTMLDivElement>(null)
	const factList = useRef<HTMLDListElement>(null)
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
						tag: 'span',
						// Screen readers keep the original text flow; no aria-label on a paragraph.
						aria: 'none',
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
				const walkPath = path.current as SVGPathElement
				tl.to(
					walker.current,
					{
						motionPath: {
							path: walkPath,
							align: walkPath,
							alignOrigin: [0.5, 1],
						},
						duration: WALK_DURATION,
					},
					0,
				)
					// The yarn ball keeps a lead and gets caught right at the end of the chapter.
					.to(
						yarn.current,
						{
							motionPath: {
								path: walkPath,
								align: walkPath,
								alignOrigin: [0.5, 0.5],
								offsetY: -16,
								start: 0.1,
								end: 1,
							},
							rotation: 1080,
							duration: WALK_DURATION * 0.9,
						},
						0,
					)
					.to(
						WALK_PARTS,
						{
							y: -7,
							duration: WALK_DURATION / (steps * 2),
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
							duration: WALK_DURATION / (steps * 2),
							repeat: steps * 2 - 1,
							yoyo: true,
							ease: 'sine.inOut',
						},
						0,
					)
				return tl
			}

			// Kept out of the scrubbed walk: invalidateOnRefresh there drops the hidden start state.
			const revealFacts = () =>
				gsap.from('[data-fact]', {
					autoAlpha: 0,
					y: 20,
					stagger: 0.15,
					duration: 0.8,
					ease: 'power2.out',
					scrollTrigger: {
						trigger: factList.current,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				})

			mm.add(STORY_FULL_QUERY, () => {
				const section = scope.current as Element
				const end = pinEnd(2.4)
				ScrollTrigger.create({
					trigger: section,
					start: 'top top',
					end,
					pin: pin.current,
					anticipatePin: 1,
				})
				revealLines(
					section,
					'top top',
					() => `+=${Math.round(window.innerHeight * 1.2)}`,
				)
				walk({
					trigger: section,
					start: 'top top',
					end,
					scrub: 0.8,
					invalidateOnRefresh: true,
				})
				revealFacts()
			})

			mm.add(STORY_LITE_QUERY, () => {
				const section = scope.current as Element
				revealLines(section, 'top 70%', 'top 25%')
				walk({
					trigger: walker.current?.parentElement,
					start: 'top 85%',
					end: 'bottom 45%',
					scrub: 0.8,
					invalidateOnRefresh: true,
				})
				revealFacts()
				drift('[data-numeral]', section)
			})

			return () => mm.revert()
		},
		{ scope },
	)

	return (
		<section id='about' ref={scope} className='relative'>
			<div
				ref={pin}
				className='relative isolate flex flex-col justify-between gap-10 overflow-hidden px-4 pt-20 pb-6 sm:px-6 story:h-dvh story:pt-24'
			>
				<div
					aria-hidden
					className='pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(64rem_34rem_at_8%_100%,color-mix(in_oklch,var(--lavender)_18%,transparent),transparent_70%),radial-gradient(40rem_24rem_at_92%_0%,color-mix(in_oklch,var(--orchid)_8%,transparent),transparent_70%)]'
				/>
				<ChapterNumeral className='top-[-0.08em] right-[-0.04em]'>
					II
				</ChapterNumeral>
				<Hills className='absolute inset-x-0 bottom-0 -z-10 h-52 w-full sm:h-64 story:h-[34vh]' />

				<div className='mx-auto w-full max-w-6xl'>
					<ChapterLabel number='II' title='Обо мне' />
					<h2
						data-split
						className='mt-5 max-w-3xl font-display text-[clamp(1.75rem,4.5vw,3.25rem)] leading-tight font-semibold text-balance'
					>
						Кот идёт <span className='text-orchid'>рядом</span>,
						пока я рассказываю
					</h2>
					<p
						data-split
						className='mt-6 max-w-2xl text-lg leading-relaxed text-blush sm:text-xl'
					>
						{profile.about}
					</p>
					<dl ref={factList} className='mt-8 flex flex-wrap gap-3'>
						{facts.map((fact) => (
							<div
								key={fact.label}
								data-fact
								className='rounded-xl border border-border bg-ink-2/80 px-4 py-3 backdrop-blur-sm'
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

				<div className='relative mx-auto h-44 w-full max-w-6xl sm:h-52 story:h-[28vh]'>
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
						ref={yarn}
						className='absolute bottom-6 left-[12%] w-8 sm:w-9'
					>
						<YarnBall className='w-full [filter:drop-shadow(0_6px_6px_rgb(0_0_0/0.35))]' />
					</div>
					<div
						ref={walker}
						className='absolute right-[6%] bottom-2 w-24 sm:w-28 story:w-32'
					>
						<BoopCat idle={false} decorative />
					</div>
				</div>
			</div>
		</section>
	)
}
