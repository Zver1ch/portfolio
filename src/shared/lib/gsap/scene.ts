import { gsap, ScrollTrigger } from './register'

type Loop = { play(): unknown; pause(): unknown }

/** Looping tweens only run while their chapter is on screen. */
export function playWhileOnScreen(trigger: Element, loops: Loop[]) {
	for (const loop of loops) loop.pause()
	return ScrollTrigger.create({
		trigger,
		start: 'top bottom',
		end: 'bottom top',
		onToggle: ({ isActive }) => {
			for (const loop of loops) {
				if (isActive) loop.play()
				else loop.pause()
			}
		},
	})
}

/** Slow vertical drift of a background layer while its chapter scrolls by. */
export function drift(
	target: string | Element | null,
	trigger: Element,
	percent = 18,
) {
	return gsap.fromTo(
		target,
		{ yPercent: percent },
		{
			yPercent: -percent,
			ease: 'none',
			scrollTrigger: {
				trigger,
				start: 'top bottom',
				end: 'bottom top',
				scrub: true,
			},
		},
	)
}
