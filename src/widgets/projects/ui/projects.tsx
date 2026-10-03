'use client'

import { ArrowUpRight } from 'lucide-react'
import { type Ref, useRef } from 'react'
import { STORY_FULL_QUERY } from '@/shared/config/motion'
import { type ProfileProject, profile } from '@/shared/config/profile'
import { gsap, useGSAP } from '@/shared/lib/gsap/register'
import { ChapterLabel } from '@/shared/ui/chapter-label'
import { isWebLink } from '../lib/is-web-link'
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

function EmptyProjects() {
	return (
		<div className='mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20'>
			<div className='relative mx-auto w-full max-w-sm pt-24'>
				<PeekingCat className='right-14 bottom-[calc(100%-7.5rem)] sm:right-16' />
				<svg
					aria-hidden
					viewBox='0 0 320 320'
					className='relative z-10 w-full'
					fill='none'
				>
					<path
						d='M96 230L62 310M224 230L258 310M160 230V312'
						stroke='var(--lavender)'
						strokeOpacity={0.55}
						strokeWidth={6}
						strokeLinecap='round'
					/>
					<rect
						x={34}
						y={8}
						width={252}
						height={206}
						rx={14}
						fill='var(--ink-2)'
						stroke='var(--lavender)'
						strokeOpacity={0.6}
						strokeWidth={4}
					/>
					<rect
						x={52}
						y={26}
						width={216}
						height={170}
						rx={8}
						stroke='var(--rose)'
						strokeOpacity={0.5}
						strokeWidth={2.5}
						strokeDasharray='3 10'
						strokeLinecap='round'
					/>
					<path
						d='M130 146C130 146 106 128 106 111A12 12 0 0 1 130 105A12 12 0 0 1 154 111C154 128 130 146 130 146Z'
						fill='var(--rose)'
						fillOpacity={0.28}
						transform='translate(30 -6)'
					/>
					<rect
						x={96}
						y={214}
						width={128}
						height={12}
						rx={6}
						fill='var(--lavender)'
						fillOpacity={0.45}
					/>
				</svg>
			</div>
			<div data-empty>
				<ChapterLabel number='IV' title='Проекты' />
				<h2 className='mt-5 font-display text-[clamp(1.75rem,4.5vw,3.25rem)] leading-tight font-semibold text-balance'>
					Проекты появятся здесь вместе с живыми демо
				</h2>
				<p className='mt-6 inline-flex items-center gap-3 rounded-full border border-border bg-ink-2 px-4 py-2 text-base'>
					<span
						aria-hidden
						className='size-2.5 animate-pulse rounded-full bg-rose motion-reduce:animate-none'
					/>
					<span className='font-mono text-xs tracking-widest text-muted-foreground uppercase'>
						Сейчас
					</span>
					этот сайт в работе
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
				gsap.from(empty ? '[data-empty]' : '[data-project]', {
					autoAlpha: 0,
					y: 40,
					duration: 0.8,
					stagger: 0.15,
					scrollTrigger: { trigger: scope.current, start: 'top 70%' },
				})
			})

			mm.add(STORY_FULL_QUERY, () => {
				const trackEl = track.current
				if (empty || !trackEl) return
				const distance = () =>
					Math.max(0, trackEl.scrollWidth - window.innerWidth)
				gsap.to(trackEl, {
					x: () => -distance(),
					ease: 'none',
					scrollTrigger: {
						trigger: scope.current,
						start: 'top top',
						end: () => `+=${distance()}`,
						pin: pin.current,
						scrub: 0.8,
						anticipatePin: 1,
						invalidateOnRefresh: true,
					},
				})
			})

			return () => mm.revert()
		},
		{ scope, dependencies: [empty] },
	)

	return (
		<section id='projects' ref={scope} className='relative'>
			{empty ? (
				<div className='px-4 py-28 sm:px-6 sm:py-36'>
					<EmptyProjects />
				</div>
			) : (
				<div
					ref={pin}
					className='overflow-hidden px-4 py-28 sm:px-6 story:flex story:h-dvh story:items-center story:p-0'
				>
					<ProjectsGallery ref={track} projects={projects} />
				</div>
			)}
		</section>
	)
}
