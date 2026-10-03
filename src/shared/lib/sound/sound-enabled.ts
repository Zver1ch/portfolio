import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'sound-enabled'

const listeners = new Set<() => void>()
let enabled: boolean | undefined

export function getSoundEnabled(): boolean {
	if (enabled === undefined) {
		try {
			enabled = window.localStorage.getItem(STORAGE_KEY) !== 'false'
		} catch {
			enabled = true
		}
	}
	return enabled
}

export function setSoundEnabled(value: boolean): void {
	enabled = value
	try {
		window.localStorage.setItem(STORAGE_KEY, String(value))
	} catch {
		// Private mode or blocked storage: keep the choice for this session only.
	}
	for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

const getServerSnapshot = () => true

export function useSoundEnabled(): boolean {
	return useSyncExternalStore(subscribe, getSoundEnabled, getServerSnapshot)
}
