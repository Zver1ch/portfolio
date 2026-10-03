import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'boop-count'

const listeners = new Set<() => void>()
let count: number | undefined

export function getBoopCount(): number {
	if (count === undefined) {
		try {
			const stored = Number(window.localStorage.getItem(STORAGE_KEY))
			count = Number.isInteger(stored) && stored > 0 ? stored : 0
		} catch {
			count = 0
		}
	}
	return count
}

export function incrementBoops(): number {
	const next = getBoopCount() + 1
	count = next
	try {
		window.localStorage.setItem(STORAGE_KEY, String(next))
	} catch {
		// Private mode or blocked storage: the counter lives for this session only.
	}
	for (const listener of listeners) listener()
	return next
}

function subscribe(listener: () => void) {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

const getServerSnapshot = () => 0

export function useBoopCount(): number {
	return useSyncExternalStore(subscribe, getBoopCount, getServerSnapshot)
}
