/**
 * "Feed the cat" from anywhere on the page (the header button, plan §3.10):
 * the room layer listens and hands the request to the director. A null
 * drop point means "somewhere sensible".
 */
export type Drop = { x: number; y: number }

type Listener = (drop: Drop | null) => void

const listeners = new Set<Listener>()

export function requestFeed(drop: Drop | null = null) {
	for (const listener of listeners) listener(drop)
}

export function onFeedRequest(listener: Listener): () => void {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}
