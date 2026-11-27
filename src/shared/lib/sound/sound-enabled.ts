import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'sound-enabled'

type Stored = 'true' | 'false' | null

const listeners = new Set<() => void>()
let stored: Stored | undefined

function readStored(): Stored {
	if (stored === undefined) {
		try {
			const value = window.localStorage.getItem(STORAGE_KEY)
			stored = value === 'true' || value === 'false' ? value : null
		} catch {
			stored = null
		}
	}
	return stored
}

/** On unless the visitor muted: one flag for the ambient, the meow and the effects (owner decision, 2026-11-27). */
export function getSoundEnabled(): boolean {
	return readStored() !== 'false'
}

export function setSoundEnabled(value: boolean): void {
	stored = value ? 'true' : 'false'
	try {
		window.localStorage.setItem(STORAGE_KEY, stored)
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

const serverEnabled = () => true

export function useSoundEnabled(): boolean {
	return useSyncExternalStore(subscribe, getSoundEnabled, serverEnabled)
}
