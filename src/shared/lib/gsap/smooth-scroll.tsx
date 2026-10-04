'use client'

import Lenis from 'lenis'
import { useEffect } from 'react'
import { FINE_POINTER_QUERY } from '@/shared/config/motion'
import { gsap, ScrollTrigger } from './register'

export type InPageAnchor = { hash: string; element: Element }

/**
 * The in-page link under a plain left click, when this page should scroll to
 * it itself: same document, a fragment that exists, no modifier keys, not
 * already handled.
 */
export function inPageAnchor(event: MouseEvent): InPageAnchor | null {
	if (event.defaultPrevented || event.button !== 0) return null
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
		return null
	const anchor =
		event.target instanceof Element ? event.target.closest('a[href]') : null
	if (!(anchor instanceof HTMLAnchorElement)) return null
	if (anchor.target && anchor.target !== '_self') return null
	const url = new URL(anchor.href, window.location.href)
	if (
		url.origin !== window.location.origin ||
		url.pathname !== window.location.pathname ||
		!url.hash
	)
		return null
	let element: Element | null = null
	try {
		element = document.querySelector(decodeURIComponent(url.hash))
	} catch {
		return null
	}
	return element ? { hash: url.hash, element } : null
}

/**
 * Lenis only for desktop pointers; touch keeps native scrolling. In-page
 * links are scrolled by Lenis alone: left to the browser as well, the page
 * would jump to the fragment at once and Lenis would then scroll from where
 * it had been, one jump back and forth (the "shaking" of Gate 2, round 2).
 * The fragment lands in the URL once Lenis arrives, so history and the
 * keyboard's focus start behave as after a native jump.
 */
export function SmoothScroll() {
	useEffect(() => {
		const query = window.matchMedia(FINE_POINTER_QUERY)
		let lenis: Lenis | undefined
		let tick: ((time: number) => void) | undefined
		let onClick: ((event: MouseEvent) => void) | undefined

		const stop = () => {
			if (tick) gsap.ticker.remove(tick)
			if (onClick) document.removeEventListener('click', onClick)
			lenis?.destroy()
			lenis = undefined
			tick = undefined
			onClick = undefined
		}
		const start = () => {
			stop()
			if (!query.matches) return
			const instance = new Lenis({ syncTouch: false })
			instance.on('scroll', ScrollTrigger.update)
			const raf = (time: number) => instance.raf(time * 1000)
			// Lenis moves the page before anything else reads scroll in the tick.
			gsap.ticker.add(raf, false, true)
			gsap.ticker.lagSmoothing(0)
			const click = (event: MouseEvent) => {
				const target = inPageAnchor(event)
				if (!target) return
				event.preventDefault()
				// Lenis honours the target's scroll-margin itself.
				instance.scrollTo(target.element as HTMLElement, {
					onComplete: () => {
						// Already there, so the browser's own fragment scroll moves nothing.
						if (window.location.hash !== target.hash)
							window.location.hash = target.hash
					},
				})
			}
			document.addEventListener('click', click)
			lenis = instance
			tick = raf
			onClick = click
		}

		start()
		query.addEventListener('change', start)
		return () => {
			query.removeEventListener('change', start)
			stop()
			gsap.ticker.lagSmoothing(500, 33)
		}
	}, [])

	return null
}
