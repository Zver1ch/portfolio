'use client'

import { ArrowUpRight, PawPrint } from 'lucide-react'
import { type Ref, useRef } from 'react'
import { STORY_FULL_QUERY } from '@/shared/config/motion'
import { type ProfileProject, profile } from '@/shared/config/profile'
import { gsap, useGSAP } from '@/shared/lib/gsap/register'
import { drift } from '@/shared/lib/gsap/scene'
import { cn } from '@/shared/lib/utils'
import { ChapterLabel } from '@/shared/ui/chapter-label'
import { ChapterNumeral } from '@/shared/ui/chapter-numeral'
import { isWebLink } from '../lib/is-web-link'
import { Easel } from './easel'
import { PeekingCat } from './peeking-cat'

function ProjectCard({
	project,
	index,
}: {
	project: ProfileProject
	index: number
}) {
	const linked = isWebLink(project.href)
	return (
		<article
			data-project
			className='relative z-10 flex w-full flex-col rounded-3xl border border-border bg-ink-2 p-7 sm:p-9 story:h-[28rem] story:w-[min(30rem,40vw)] story:shrink-0'
		>
			<span className='font-display text-5xl font-semibold text-rose/80'>
				{String(index + 1).padStart(2, '0')}
			</span>
			<h3 className='mt-6 font-display text-2xl leading-tight font-semibold text-balance'>
				{project.title}
			</h3>
			<p className='mt-3 text-base leading-relaxed text-muted-foreground'>
				{project.description}
			</p>
			<ul className='mt-5 flex flex-wrap gap-2'>
				{project.tags.map((tag) => (
					<li
						key={tag}
						className='rounded-full bg-ink-3 px-3 py-1 font-mono text-xs text-lavender'
					>
						{tag}
					</li>
				))}
			</ul>
			<div className='mt-auto pt-6'>
				{linked ? (
					<a
						href={project.href}
						target='_blank'
						rel='noreferrer'
						className='inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-rose outline-none hover:text-orchid focus-visible:ring-3 focus-visible:ring-ring'
					>
						Смотреть
						<ArrowUpRight aria-hidden className='size-4' />
					</a>
				) : project.href ? (
					<p className='font-mono text-xs text-muted-foreground'>
						{project.href}
					</p>
				) : null}
			</div>
		</article>
	)
}

/** Empty picture frames on the gallery wall: slots waiting for the first live demo. */
function WallFrame({ className }: { className?: string }) {
	return (
		<div
			aria-hidden
			data-frame
			className={cn(
				'pointer-events-none absolute flex items-center justify-center rounded-xl border-2 border-dashed border-lavender/20',
				className,
			)}
		>
			<PawPrint className='size-6 text-lavender/25' />
		</div>
	)
}

function EmptyProjects() {
	return (
		<div className='mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20'>
			<div className='relative mx-auto w-full max-w-sm pt-24'>
				<PeekingCat className='right-14 bottom-[calc(100%-7.5rem)] sm:right-16' />
				<Easel />
			</div>
			<div data-empty>
				<ChapterLabel number='IV' title='Проекты' />
				<h2 className='mt-5 font-display text-[clamp(1.75rem,4.5vw,3.25rem)] leading-tight font-semibold text-balance'>
					Проекты появятся здесь вместе с живыми демо
				</h2>
				<p className='mt-5 max-w-lg text-lg text-muted-foreground'>
					Кот сторожит пустой холст: сюда попадает только то, что
					можно открыть и потрогать.
				</p>
				<p className='mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-ink-2 px-4 py-2 text-base'>
					<span
						aria-hidden
						className='size-2.5 animate-pulse rounded-full bg-rose shadow-[0_0_12px_var(--rose)] motion-reduce:animate-none'
					/>
					<span className='font-mono text-xs tracking-widest text-muted-foreground uppercase'>
						Сейчас
					</span>
					{profile.now}
				</p>
			</div>
		</div>
	)
}

function ProjectsGallery({
	projects,
	ref,
}: {
	projects: ProfileProject[]
	ref: Ref<HTMLDivElement>
}) {
	return (
		<div
			ref={ref}
			className='mx-auto flex w-full max-w-xl flex-col gap-10 story:mx-0 story:w-max story:max-w-none story:flex-row story:items-center story:gap-8 story:px-[8vw]'
		>
			<div className='story:w-[34vw] story:shrink-0'>
				<ChapterLabel number='IV' title='Проекты' />
				<h2 className='mt-5 font-display text-[clamp(1.75rem,4.5vw,3.25rem)] leading-tight font-semibold text-balance'>
					Что уже вышло из-под лап
				</h2>
				<p className='mt-4 hidden font-mono text-xs tracking-widest text-muted-foreground uppercase story:block'>
					листай вбок →
				</p>
			</div>
			{projects.map((project, index) => (
				<div key={project.title} className='relative mt-16 story:mt-24'>
					{index === 0 ? (
						<PeekingCat className='right-10 bottom-[calc(100%-2.6rem)]' />
					) : null}
					<ProjectCard project={project} index={index} />
				</div>
			))}
			<p className='font-display text-xl text-lavender story:w-[22vw] story:shrink-0'>
				…продолжение следует
			</p>
		</div>
	)
}

export function StoryProjects({
	projects = profile.projects,
}: {
	projects?: ProfileProject[]
}) {
	const scope = useRef<HTMLElement>(null)
	const pin = useRef<HTMLDivElement>(null)
	const track = useRef<HTMLDivElement>(null)
	const empty = projects.length === 0

	useGSAP(
		() => {
			const mm = gsap.matchMedia(scope.current ?? undefined)

			mm.add('(prefers-reduced-motion: no-preference)', () => {
				const section = scope.current as Element
				gsap.from(empty ? '[data-empty] > *' : '[data-project]', {
					autoAlpha: 0,
					y: 40,
					duration: 0.8,
					stagger: 0.12,
					scrollTrigger: { trigger: section, start: 'top 70%' },
				})
				drift('[data-numeral]', section, 12)
				gsap.utils
					.toArray<Element>('[data-frame]')
					.forEach((frame, index) => {
						drift(frame, section, 8 + index * 6)
					})
			})

			mm.add(STORY_FULL_QUERY, () => {
				const trackEl = track.current
				const pinEl = pin.current
				if (empty || !trackEl || !pinEl) return
				const distance = () =>
					Math.max(0, trackEl.scrollWidth - window.innerWidth)
				const tween = gsap.to(trackEl, {
					x: () => -distance(),
					ease: 'none',
					scrollTrigger: {
						trigger: scope.current,
						start: 'top top',
						end: () => `+=${distance()}`,
						pin: pinEl,
						scrub: 0.8,
						anticipatePin: 1,
						invalidateOnRefresh: true,
					},
				})
				// Keyboard focus inside the pinned gallery: scroll the page to where the card is on screen.
				const onFocus = (event: FocusEvent) => {
					const trigger = tween.scrollTrigger
					const card = (event.target as Element).closest(
						'[data-project]',
					)
					if (!trigger || !card) return
					pinEl.scrollLeft = 0
					const left =
						card.getBoundingClientRect().left -
						trackEl.getBoundingClientRect().left
					const progress = gsap.utils.clamp(
						0,
						1,
						(left - window.innerWidth * 0.3) / distance(),
					)
					window.scrollTo({
						top:
							trigger.start +
							progress * (trigger.end - trigger.start),
						behavior: 'instant',
					})
				}
				trackEl.addEventListener('focusin', onFocus)
				return () => trackEl.removeEventListener('focusin', onFocus)
			})

			return () => mm.revert()
		},
		{ scope, dependencies: [empty] },
	)

	return (
		<section
			id='projects'
			ref={scope}
			className='relative isolate overflow-hidden'
		>
			<div
				aria-hidden
				className='pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(44rem_36rem_at_28%_0%,color-mix(in_oklch,var(--blush)_13%,transparent),transparent_70%)]'
			/>
			<ChapterNumeral className='right-[2vw] bottom-[-0.14em]'>
				IV
			</ChapterNumeral>
			<WallFrame className='top-[12%] left-[4%] hidden h-28 w-36 rotate-[-4deg] lg:flex' />
			<WallFrame className='top-[18%] right-[6%] hidden h-24 w-24 rotate-[5deg] lg:flex' />
			<WallFrame className='bottom-[8%] left-[38%] hidden h-20 w-28 rotate-[3deg] xl:flex' />
			{empty ? (
				<div className='px-4 py-20 sm:px-6 sm:py-28'>
					<EmptyProjects />
				</div>
			) : (
				<div
					ref={pin}
					className='overflow-hidden px-4 py-20 sm:px-6 story:flex story:h-dvh story:items-center story:p-0'
				>
					<ProjectsGallery ref={track} projects={projects} />
				</div>
			)}
		</section>
	)
}
