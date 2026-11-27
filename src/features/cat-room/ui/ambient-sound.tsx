'use client'

import { useEffect } from 'react'
import {
	setAmbientMood,
	startAmbient,
	stopAmbient,
} from '@/shared/lib/sound/ambient-engine'
import { useSoundOptIn } from '@/shared/lib/sound/sound-enabled'
import { useRoomState } from '../model/room-store'

/**
 * Renders nothing (plan §3.12): runs the ambient after an explicit opt-in,
 * while the room is ready and the tab is visible, with the dawn mood in the
 * finale. An opt-in stored on an earlier visit comes without a gesture, so
 * a context the browser keeps suspended waits for the next pointer or key.
 */
export function AmbientSound() {
	const optIn = useSoundOptIn()
	const { status, phase } = useRoomState()
	const wanted = optIn && status === 'ready'

	useEffect(() => {
		if (!wanted) {
			stopAmbient()
			return
		}
		let cancelled = false
		const onGesture = () => void tryStart()
		// Touch activates on pointerup, not pointerdown.
		const arm = () => {
			window.addEventListener('pointerdown', onGesture)
			window.addEventListener('pointerup', onGesture)
			window.addEventListener('keydown', onGesture)
		}
		const disarm = () => {
			window.removeEventListener('pointerdown', onGesture)
			window.removeEventListener('pointerup', onGesture)
			window.removeEventListener('keydown', onGesture)
		}
		const tryStart = async () => {
			if (document.hidden) return
			// Armed before the await: a browser that keeps `resume()` pending
			// until a gesture never settles it, so the result cannot arm.
			arm()
			const started = await startAmbient()
			if (started && !cancelled) disarm()
		}
		const onVisibility = () => {
			if (document.hidden) stopAmbient()
			else void tryStart()
		}
		document.addEventListener('visibilitychange', onVisibility)
		void tryStart()
		return () => {
			cancelled = true
			disarm()
			document.removeEventListener('visibilitychange', onVisibility)
			stopAmbient()
		}
	}, [wanted])

	useEffect(() => {
		setAmbientMood(phase === 'finale' ? 1 : 0)
	}, [phase])

	return null
}
