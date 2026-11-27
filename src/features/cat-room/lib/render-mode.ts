import { useSyncExternalStore } from 'react'
import { REDUCED_MOTION_QUERY } from '@/shared/config/motion'

function matches(query: string): boolean {
	if (typeof window.matchMedia !== 'function') return false
	return window.matchMedia(query).matches
}

function subscribeTo(query: string) {
	return (listener: () => void) => {
		if (typeof window.matchMedia !== 'function') return () => {}
		const list = window.matchMedia(query)
		list.addEventListener('change', listener)
		return () => list.removeEventListener('change', listener)
	}
}

const subscribers = new Map<string, (listener: () => void) => () => void>()
const matchers = new Map<string, () => boolean>()

/** A media query as external state; `serverSnapshot` is what SSR and hydration see. */
export function useMediaQuery(query: string, serverSnapshot: boolean): boolean {
	let subscribe = subscribers.get(query)
	if (!subscribe) {
		subscribe = subscribeTo(query)
		subscribers.set(query, subscribe)
	}
	let getSnapshot = matchers.get(query)
	if (!getSnapshot) {
		getSnapshot = () => matches(query)
		matchers.set(query, getSnapshot)
	}
	return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot)
}

/** Server snapshot is `true`, so SSR and hydration always render the static page. */
export function useReducedMotion(): boolean {
	return useMediaQuery(REDUCED_MOTION_QUERY, true)
}

let webglSupport: boolean | undefined

/** A software renderer would make the room crawl: that counts as "no WebGL". */
const PROBE_OPTIONS: WebGLContextAttributes = {
	failIfMajorPerformanceCaveat: true,
}

export function detectWebGL(): boolean {
	if (webglSupport === undefined) {
		try {
			const canvas = document.createElement('canvas')
			const context =
				canvas.getContext('webgl2', PROBE_OPTIONS) ??
				canvas.getContext('webgl', PROBE_OPTIONS)
			webglSupport = Boolean(context)
			// Free the probe context right away instead of waiting for GC.
			if (context && 'getExtension' in context)
				context.getExtension('WEBGL_lose_context')?.loseContext()
		} catch {
			webglSupport = false
		}
	}
	return webglSupport
}

/** Test hook: forget the cached probe result. */
export function resetWebGLDetection() {
	webglSupport = undefined
}

const noopSubscribe = () => () => {}
const never = () => false

/** `enabled: false` skips the probe entirely (reduced motion already forces static). */
export function useWebGLSupport(enabled = true): boolean {
	return useSyncExternalStore(
		noopSubscribe,
		enabled ? detectWebGL : never,
		never,
	)
}

type NavigatorWithConnection = Navigator & {
	connection?: { saveData?: boolean }
}

function getSaveData(): boolean {
	return (navigator as NavigatorWithConnection).connection?.saveData === true
}

/** The Save-Data hint: no megabyte of model for a visitor who asked for less. */
export function useSaveData(): boolean {
	return useSyncExternalStore(noopSubscribe, getSaveData, never)
}
