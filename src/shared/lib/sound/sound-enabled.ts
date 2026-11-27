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

/** On unless the visitor muted: the meow and the effects keep this default (plan §3.12). */
export function getSoundEnabled(): boolean {
	return readStored() !== 'false'
}

/** The stored value is exactly `'true'`: an explicit opt-in, which the ambient needs. */
export function getSoundOptIn(): boolean {
	return readStored() === 'true'
}

/** Whether a choice was ever stored; the "Enable sound" prompt shows until one is. */
export function hasSoundChoice(): boolean {
	return readStored() !== null
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
const serverFalse = () => false

export function useSoundEnabled(): boolean {
	return useSyncExternalStore(subscribe, getSoundEnabled, serverEnabled)
}

export function useSoundOptIn(): boolean {
	return useSyncExternalStore(subscribe, getSoundOptIn, serverFalse)
}

export function useHasSoundChoice(): boolean {
	return useSyncExternalStore(subscribe, hasSoundChoice, serverFalse)
}
