'use client'

import { PawPrint } from 'lucide-react'
import { useRef } from 'react'
import { gsap, useGSAP } from '@/shared/lib/gsap/register'
import { cn } from '@/shared/lib/utils'

const STEPS = [
	{ side: 'left', tilt: 'rotate-[160deg]' },
	{ side: 'right', tilt: 'rotate-[200deg]' },
	{ side: 'left', tilt: 'rotate-[165deg]' },
	{ side: 'right', tilt: 'rotate-[195deg]' },
	{ side: 'left', tilt: 'rotate-[160deg]' },
] as const

/** Paw prints that stamp in as the reader walks from one chapter to the next. */
export function ChapterTrail({ className }: { className?: string }) {
	const scope = useRef<HTMLDivElement>(null)

	useGSAP(
		() => {
			const mm = gsap.matchMedia(scope.current ?? undefined)
			mm.add('(prefers-reduced-motion: no-preference)', () => {
				gsap.from('[data-paw]', {
					scale: 0,
					autoAlpha: 0,
					transformOrigin: '50% 50%',
					stagger: 0.25,
					ease: 'back.out(2.2)',
					scrollTrigger: {
						trigger: scope.current,
						start: 'top 90%',
						end: 'bottom 55%',
						scrub: 0.4,
					},
				})
			})
			return () => mm.revert()
		},
		{ scope },
	)

	return (
		<div
			ref={scope}
			aria-hidden
			className={cn(
				'pointer-events-none mx-auto flex h-44 w-14 flex-col justify-between py-3',
				className,
			)}
		>
			{STEPS.map((step, index) => (
				<PawPrint
					// biome-ignore lint/suspicious/noArrayIndexKey: static decorative list
					key={index}
					data-paw
					className={cn(
						'size-5 fill-rose/70 text-rose/70',
						step.side === 'left' ? 'self-start' : 'self-end',
						step.tilt,
					)}
				/>
			))}
		</div>
	)
}
