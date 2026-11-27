import { clamp } from '@/shared/lib/math/ease'
import { GAGS } from '../config/tuning'

/**
 * The gag scheduler (plan §3.10): pure and seeded, so a visit's gags are
 * reproducible and testable. `now` is wall-clock seconds from the caller;
 * nothing here touches the DOM or draws.
 */

export type GagKind = 'peek' | 'typing' | 'fish'

export type Gag = {
	kind: GagKind
	startedAt: number
	/** Seconds the gag runs unless ended earlier. */
	duration: number
	/** Horizontal anchor, share of the viewport width. */
	xShare: number
	/** Where the fish was dropped, CSS px; other gags have none. */
	drop: { x: number; y: number } | null
}

export type GagState = {
	seed: number
	active: Gag | null
	lastEndedAt: number
	/** Escape silences automatic gags until then. */
	silencedUntil: number
	/** Automatic gags started so far: the first section entry always peeks. */
	automatic: number
}

export function createGagState(seed = 0x2545f491): GagState {
	return {
		seed,
		active: null,
		lastEndedAt: Number.NEGATIVE_INFINITY,
		silencedUntil: Number.NEGATIVE_INFINITY,
		automatic: 0,
	}
}

/** Deterministic 0..1 noise from the seed; mulberry32, one step per call. */
export function nextRandom(state: GagState): number {
	state.seed = (state.seed + 0x6d2b79f5) | 0
	let t = state.seed
	t = Math.imul(t ^ (t >>> 15), t | 1)
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Ends an expired gag and returns it, so a peek can be followed by typing. */
export function tickGags(state: GagState, now: number): Gag | null {
	const gag = state.active
	if (!gag || now < gag.startedAt + gag.duration) return null
	state.active = null
	state.lastEndedAt = now
	return gag
}

/** The runner finished a gag early (the fish is eaten). */
export function endGag(state: GagState, now: number) {
	if (!state.active) return
	state.active = null
	state.lastEndedAt = now
}

/** Escape: whatever runs stops, and nothing automatic starts for a while. */
export function cancelGags(state: GagState, now: number) {
	endGag(state, now)
	state.silencedUntil = now + GAGS.silence
}

function mayStartAutomatic(state: GagState, now: number): boolean {
	return (
		!state.active &&
		now >= state.silencedUntil &&
		now - state.lastEndedAt >= GAGS.minGap
	)
}

/**
 * A section came on screen: at most one automatic gag per entry. The first
 * one of the visit is always a peek; later entries roll the dice. `isFree`
 * says whether the head would land clear of interactive elements at that
 * share of the width; a few candidates are tried, then the entry passes.
 */
export function onSectionEntry(
	state: GagState,
	now: number,
	isFree: (xShare: number) => boolean,
): Gag | null {
	if (!mayStartAutomatic(state, now)) return null
	if (state.automatic > 0 && nextRandom(state) > GAGS.peek.chance) return null
	const [from, to] = GAGS.peek.xRange
	for (let attempt = 0; attempt < 4; attempt++) {
		const xShare = from + nextRandom(state) * (to - from)
		if (!isFree(xShare)) continue
		state.automatic += 1
		state.active = {
			kind: 'peek',
			startedAt: now,
			duration: GAGS.peek.duration,
			xShare,
			drop: null,
		}
		return state.active
	}
	return null
}

/** After a peek, at random, the typing line gets a visit: the same gag's tail, no gap. */
export function maybeType(
	state: GagState,
	now: number,
	ended: Gag,
	typingLineVisible: boolean,
): Gag | null {
	if (ended.kind !== 'peek' || !typingLineVisible || state.active) return null
	if (now < state.silencedUntil) return null
	if (nextRandom(state) > GAGS.typing.chance) return null
	state.active = {
		kind: 'typing',
		startedAt: now,
		duration: GAGS.typing.duration,
		xShare: ended.xShare,
		drop: null,
	}
	return state.active
}

/** The visitor asked for it: a fish drops now, whatever else was going on, silence included. */
export function requestFish(
	state: GagState,
	now: number,
	drop: { x: number; y: number },
	viewportWidth: number,
): Gag {
	const [from, to] = GAGS.fish.xRange
	state.active = {
		kind: 'fish',
		startedAt: now,
		duration: GAGS.maxDuration,
		xShare: clamp(drop.x / Math.max(viewportWidth, 1), from, to),
		drop,
	}
	return state.active
}
