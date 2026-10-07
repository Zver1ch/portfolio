import { useSyncExternalStore } from 'react'

/**
 * Gate 2 round 6: three candidate presentations of the room on phones, behind
 * `?phone=a|b|c`, pending the owner's choice. The choice is read on the client
 * only and kept in `sessionStorage`, so in-page navigation and a reload keep
 * it; `?phone=` with anything else forgets it. Only lite mode honours it (the
 * layer writes `data-phone-variant` on `<html>` there); `default` is the
 * round-5 lite. The losers go with this module.
 *
 * - `a`, the still: the camera never moves. The room is a backdrop under the
 *   page, the first section slides over it and the footer statement lifts
 *   off the dawn room.
 * - `b`, the short dive: one viewport height straight into the monitor, which
 *   is a hole showing the real first section, and a 0.8 pull-back.
 * - `c`, the card: the monitor is a portrait panel in the viewport's own
 *   aspect, the name sits at the top of the shot, and the page is a card
 *   that grows out of the screen while the camera holds (and shrinks back
 *   into it at the end).
 */
export type PhoneVariant = 'default' | 'a' | 'b' | 'c'

export type PhoneVariantTraits = {
	/** The monitor is a hole and the stuck section is the real page warped onto it; no painted page, a transparent layer. */
	domPage: boolean
	/** The screen takes the viewport's own (portrait) aspect instead of the monitor's range. */
	portraitMonitor: boolean
	/** The page is a card between the screen and the viewport while the camera holds. */
	card: boolean
	/** The room lies under the page: the layer is transparent and below `main`. */
	backdrop: boolean
}

export const PHONE_TRAITS: Record<PhoneVariant, PhoneVariantTraits> = {
	default: {
		domPage: false,
		portraitMonitor: false,
		card: false,
		backdrop: false,
	},
	a: { domPage: false, portraitMonitor: false, card: false, backdrop: true },
	b: { domPage: true, portraitMonitor: false, card: false, backdrop: false },
	c: { domPage: true, portraitMonitor: true, card: true, backdrop: false },
}

const PARAM = 'phone'
const STORAGE_KEY = 'cat-room.phone-variant'

function parse(value: string | null): PhoneVariant | null {
	return value === 'a' || value === 'b' || value === 'c' ? value : null
}

/** The variant the URL asks for, else the one remembered for this tab, else the default. */
export function readPhoneVariant(
	search: string,
	storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
): PhoneVariant {
	const asked = new URLSearchParams(search).get(PARAM)
	try {
		if (asked !== null) {
			const chosen = parse(asked) ?? 'default'
			if (chosen === 'default') storage?.removeItem(STORAGE_KEY)
			else storage?.setItem(STORAGE_KEY, chosen)
			return chosen
		}
		return parse(storage?.getItem(STORAGE_KEY) ?? null) ?? 'default'
	} catch {
		return parse(asked) ?? 'default'
	}
}

let cached: PhoneVariant | null = null

/** Resolved once per page on the client; the server has no variant. */
export function getPhoneVariant(): PhoneVariant {
	if (typeof window === 'undefined') return 'default'
	if (cached === null) {
		let storage: Storage | null = null
		try {
			storage = window.sessionStorage
		} catch {
			storage = null
		}
		cached = readPhoneVariant(window.location.search, storage)
	}
	return cached
}

/** Test hook. */
export function resetPhoneVariant() {
	cached = null
}

const subscribe = () => () => {}
const serverSnapshot = (): PhoneVariant => 'default'

export function usePhoneVariant(): PhoneVariant {
	return useSyncExternalStore(subscribe, getPhoneVariant, serverSnapshot)
}
