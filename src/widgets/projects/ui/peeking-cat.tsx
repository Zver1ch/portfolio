'use client'

import { useRef } from 'react'
import { BoopCat } from '@/features/boop-cat/ui/boop-cat'
import { gsap, useGSAP } from '@/shared/lib/gsap/register'
import { cn } from '@/shared/lib/utils'

/**
 * Sits behind the edge of an opaque sibling (z-10) so only ears and head show.
 * The parent must be `relative`.
 */
export function PeekingCat({ className }: { className?: string }) {
	const scope = useRef<HTMLDivElement>(null)

	useGSAP(
		() => {
			const mm = gsap.matchMedia(scope.current ?? undefined)
			mm.add('(prefers-reduced-motion: no-preference)', () => {
				gsap.set(scope.current, { y: 64 })
				gsap.to(scope.current, {
					y: 0,
					duration: 0.9,
					ease: 'back.out(1.6)',
					scrollTrigger: {
						trigger: scope.current,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				})
				gsap.timeline({ repeat: -1, repeatDelay: 2.2, delay: 1.5 })
					.to('[data-part="ear-left"]', {
						rotation: -14,
						duration: 0.08,
						yoyo: true,
						repeat: 3,
					})
					.to(
						'[data-part="ear-right"]',
						{ rotation: 14, duration: 0.08, yoyo: true, repeat: 3 },
						'<0.12',
					)
					.to('[data-part="head"]', {
						rotation: -5,
						duration: 0.5,
						ease: 'sine.inOut',
						yoyo: true,
						repeat: 1,
					})
			})
			return () => mm.revert()
		},
		{ scope },
	)

	return (
		<div ref={scope} className={cn('absolute z-0 w-28 sm:w-32', className)}>
			<BoopCat idle={false} />
		</div>
	)
}
