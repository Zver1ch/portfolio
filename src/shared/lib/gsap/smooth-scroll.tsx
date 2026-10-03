'use client'

import Lenis from 'lenis'
import { useEffect } from 'react'
import { FINE_POINTER_QUERY } from '@/shared/config/motion'
import { gsap, ScrollTrigger } from './register'

/** Lenis only for desktop pointers; touch keeps native scrolling. */
export function SmoothScroll() {
	useEffect(() => {
		const query = window.matchMedia(FINE_POINTER_QUERY)
		let lenis: Lenis | undefined
		let tick: ((time: number) => void) | undefined

		const stop = () => {
			if (tick) gsap.ticker.remove(tick)
			lenis?.destroy()
			lenis = undefined
			tick = undefined
		}
		const start = () => {
			stop()
			if (!query.matches) return
			const instance = new Lenis({ anchors: true, syncTouch: false })
			instance.on('scroll', ScrollTrigger.update)
			const raf = (time: number) => instance.raf(time * 1000)
			gsap.ticker.add(raf)
			gsap.ticker.lagSmoothing(0)
			lenis = instance
			tick = raf
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
