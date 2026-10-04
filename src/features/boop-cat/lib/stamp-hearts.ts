import { gsap } from '@/shared/lib/gsap/register'

const HEART_PATH =
	'M12 21C12 21 3 14.5 3 8.5A4.5 4.5 0 0 1 12 6.5A4.5 4.5 0 0 1 21 8.5C21 14.5 12 21 12 21Z'
const SVG_NS = 'http://www.w3.org/2000/svg'

export type HeartOptions = {
	size?: number
	/** Rise distance in px; heart stamps barely move, trail hearts float. */
	rise?: number
	reduced?: boolean
}

export function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function createHeart(size: number): HTMLSpanElement {
	const el = document.createElement('span')
	el.setAttribute('aria-hidden', 'true')
	el.style.cssText = `position:fixed;left:0;top:0;z-index:60;pointer-events:none;width:${size}px;height:${size}px;color:var(--rose);will-change:transform,opacity;`
	const svg = document.createElementNS(SVG_NS, 'svg')
	svg.setAttribute('viewBox', '0 0 24 24')
	svg.setAttribute('width', String(size))
	svg.setAttribute('height', String(size))
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute('d', HEART_PATH)
	path.setAttribute('fill', 'currentColor')
	svg.append(path)
	el.append(svg)
	return el
}

/** One heart that pops at (x, y) in viewport coordinates and fades out. */
export function spawnHeart(
	x: number,
	y: number,
	{ size = 22, rise = 60, reduced }: HeartOptions = {},
) {
	const still = reduced ?? prefersReducedMotion()
	const el = createHeart(size)
	if (gsap.utils.random(0, 1) > 0.5) el.style.color = 'var(--orchid)'
	document.body.append(el)
	const done = () => el.remove()

	if (still) {
		gsap.set(el, { x: x - size / 2, y: y - size / 2 })
		gsap.fromTo(
			el,
			{ opacity: 0 },
			{
				opacity: 1,
				duration: 0.2,
				yoyo: true,
				repeat: 1,
				repeatDelay: 0.5,
				onComplete: done,
			},
		)
		return
	}
	const tilt = gsap.utils.random(-25, 25)
	gsap.set(el, { x: x - size / 2, y: y - size / 2, rotation: tilt, scale: 0 })
	gsap.timeline({ onComplete: done })
		.to(el, { scale: 1, duration: 0.35, ease: 'back.out(2.4)' })
		.to(
			el,
			{
				y: y - size / 2 - rise,
				x: `+=${gsap.utils.random(-18, 18)}`,
				opacity: 0,
				duration: 0.9,
				ease: 'power1.out',
			},
			'>-0.05',
		)
}

/** The boop burst: a handful of hearts scattered around the cat. */
export function stampHearts(origin: { x: number; y: number }) {
	const reduced = prefersReducedMotion()
	const count = reduced ? 2 : 7
	for (let i = 0; i < count; i++) {
		const angle = gsap.utils.random(0, Math.PI * 2)
		const radius = gsap.utils.random(40, 150)
		gsap.delayedCall(reduced ? 0 : i * 0.04, () =>
			spawnHeart(
				origin.x + Math.cos(angle) * radius,
				origin.y + Math.sin(angle) * radius * 0.8 - 30,
				{ size: gsap.utils.random(18, 34), reduced },
			),
		)
	}
}
