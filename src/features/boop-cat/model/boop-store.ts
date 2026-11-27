import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'boop-count'

const listeners = new Set<() => void>()
let count: number | undefined
/** True once this visit has petted the cat; the counter then announces changes. */
let boopedThisVisit = false

/** Undefined when storage is unavailable, so the in-memory count stays authoritative. */
function readStored(): number | undefined {
	try {
		const stored = Number(window.localStorage.getItem(STORAGE_KEY))
		return Number.isInteger(stored) && stored > 0 ? stored : 0
	} catch {
		return undefined
	}
}

function notify() {
	for (const listener of listeners) listener()
}

function onStorage(event: StorageEvent) {
	if (event.key !== null && event.key !== STORAGE_KEY) return
	count = readStored() ?? count ?? 0
	notify()
}

export function getBoopCount(): number {
	count ??= readStored() ?? 0
	return count
}

export function incrementBoops(): number {
	// Another tab may have counted since this one last read.
	const next = (readStored() ?? getBoopCount()) + 1
	count = next
	boopedThisVisit = true
	try {
		window.localStorage.setItem(STORAGE_KEY, String(next))
	} catch {
		// Private mode or blocked storage: the counter lives for this session only.
	}
	notify()
	return next
}

function subscribe(listener: () => void) {
	if (listeners.size === 0) window.addEventListener('storage', onStorage)
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
		if (listeners.size === 0)
			window.removeEventListener('storage', onStorage)
	}
}

const getServerSnapshot = () => 0

export function useBoopCount(): number {
	return useSyncExternalStore(subscribe, getBoopCount, getServerSnapshot)
}

const getBoopedThisVisit = () => boopedThisVisit
const getServerBooped = () => false

export function useBoopedThisVisit(): boolean {
	return useSyncExternalStore(subscribe, getBoopedThisVisit, getServerBooped)
}
