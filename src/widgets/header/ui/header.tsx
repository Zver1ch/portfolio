'use client'

import { Heart, PawPrint } from 'lucide-react'
import { useRef } from 'react'
import { useBoopCount } from '@/features/boop-cat/model/boop-store'
import { SoundToggle } from '@/features/toggle-sound/ui/sound-toggle'
import { profile } from '@/shared/config/profile'
import { gsap, ScrollTrigger, useGSAP } from '@/shared/lib/gsap/register'

const NAV = [
	{ href: '#prologue', label: 'Пролог' },
	{ href: '#about', label: 'Обо мне' },
	{ href: '#stack', label: 'Стек' },
	{ href: '#projects', label: 'Проекты' },
	{ href: '#contact', label: 'Связаться' },
] as const

export function StoryHeader() {
	const root = useRef<HTMLElement>(null)
	const barRef = useRef<HTMLDivElement>(null)
	const fillRef = useRef<HTMLDivElement>(null)
	const pawRef = useRef<HTMLDivElement>(null)
	const boops = useBoopCount()

	useGSAP(
		() => {
			const fill = gsap.quickSetter(fillRef.current, 'scaleX')
			const paw = gsap.quickSetter(pawRef.current, 'left', '%')
			ScrollTrigger.create({
				start: 0,
				end: 'max',
				onUpdate: (self) => {
					fill(self.progress)
					paw(self.progress * 100)
					barRef.current?.setAttribute(
						'aria-valuenow',
						String(Math.round(self.progress * 100)),
					)
				},
			})
		},
		{ scope: root },
	)

	return (
		<header
			ref={root}
			className='fixed inset-x-0 top-0 z-50 border-b border-border bg-ink/75 backdrop-blur-md'
		>
			<div
				role='progressbar'
				aria-label='Прогресс чтения'
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={0}
				ref={barRef}
				className='absolute inset-x-0 top-0 h-[3px] bg-ink-3'
			>
				<div
					ref={fillRef}
					style={{ transform: 'scaleX(0)' }}
					className='h-full origin-left bg-gradient-to-r from-rose to-orchid'
				/>
				<div ref={pawRef} className='absolute top-0 left-0'>
					<PawPrint
						aria-hidden
						className='-mt-1.5 -ml-2.5 size-5 -rotate-12 fill-orchid text-orchid'
					/>
				</div>
			</div>
			<div className='mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6'>
				<a
					href='#prologue'
					className='rounded-md font-display text-sm font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring'
				>
					{profile.handle}
				</a>
				<nav aria-label='Главы' className='hidden md:block'>
					<ul className='flex items-center gap-1'>
						{NAV.map((item) => (
							<li key={item.href}>
								<a
									href={item.href}
									className='rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring'
								>
									{item.label}
								</a>
							</li>
						))}
					</ul>
				</nav>
				<div className='flex items-center gap-1 sm:gap-2'>
					<p
						className='flex items-center gap-1.5 rounded-full bg-ink-3 px-3 py-1.5 font-mono text-xs whitespace-nowrap text-orchid'
						aria-live='polite'
					>
						<Heart
							aria-hidden
							className='size-3.5 fill-rose text-rose'
						/>
						<span>
							<span className='sr-only sm:not-sr-only'>
								чмоков:{' '}
							</span>
							<span data-testid='boop-count'>{boops}</span>
						</span>
					</p>
					<a
						href='#contact'
						className='rounded-md px-2 py-2 text-sm text-rose outline-none focus-visible:ring-3 focus-visible:ring-ring md:hidden'
					>
						Связаться
					</a>
					<SoundToggle />
				</div>
			</div>
		</header>
	)
}
