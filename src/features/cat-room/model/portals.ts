import type { Track } from '../lib/camera-path'
import type { Portal } from '../lib/portal'

/**
 * The page's portal elements by track (plan §3.5): the stage registers
 * its portal on mount, the director and the stage's own scroll handler
 * write transforms to it, the stage unregisters on unmount.
 */
const portals = new Map<Track, Portal>()

export function registerPortal(track: Track, portal: Portal): () => void {
	portals.set(track, portal)
	return () => {
		if (portals.get(track) === portal) portals.delete(track)
	}
}

export function getPortal(track: Track): Portal | undefined {
	return portals.get(track)
}

/** Test hook. */
export function resetPortals() {
	portals.clear()
}
