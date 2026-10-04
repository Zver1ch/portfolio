import type { Vec3 } from '@/shared/lib/math/vec3'

/**
 * Where things stand in the room. World metres, +Y up, the camera looks
 * towards −Z: the back wall with the window and the monitor are at negative
 * z, the visitor sits at positive z. Starting values from plan §3.5, tuned at
 * Gate 1.
 */

export const DESK_TOP = 0.74

export const SCREEN = {
	/** Centre of the visible screen; the quad faces +Z. */
	center: [0.25, 1.13, -1.33] as Vec3,
	height: 0.34,
	/** The monitor takes the viewport's aspect inside this range. */
	aspectRange: [1.2, 3.6] as const,
	/** Bezel width around the screen; its colour equals `--ink`. */
	bezel: 0.016,
	depth: 0.028,
} as const

export const ROOM = {
	floorY: 0,
	backWallZ: -1.62,
	leftWallX: -1.75,
	height: 2.7,
} as const

export const DESK = {
	center: [0.25, DESK_TOP - 0.02, -1.15] as Vec3,
	size: [1.56, 0.04, 0.72] as Vec3,
	/** Side panels stand this far in from the ends. */
	panelInset: 0.06,
} as const

export const MONITOR_STAND = {
	neck: [0.05, 0.19, 0.03] as Vec3,
	base: [0.28, 0.014, 0.19] as Vec3,
} as const

export const KEYBOARD = {
	/** Centre of the footprint on the desk. */
	center: [0.22, DESK_TOP, -0.9] as Vec3,
	/** Width and depth of the footprint. */
	size: [0.42, 0.145] as const,
	heightBack: 0.024,
	heightFront: 0.013,
	chamfer: 0.006,
	rows: 5,
	columns: 14,
	yawDeg: 3,
} as const

export const MOUSE = {
	/** Centre of the footprint on the desk. */
	center: [0.58, DESK_TOP, -0.88] as Vec3,
	size: [0.062, 0.036, 0.1] as Vec3,
	yawDeg: -12,
} as const

/** A small-form-factor tower standing on the desk, left of the monitor. */
export const TOWER = {
	center: [-0.37, DESK_TOP + 0.2, -1.36] as Vec3,
	size: [0.17, 0.4, 0.38] as Vec3,
} as const

/** The 2D face sticker on the tower's front (+Z) face. */
export const STICKER = {
	center: [
		TOWER.center[0] - 0.03,
		DESK_TOP + 0.25,
		TOWER.center[2] + TOWER.size[2] / 2 + 0.002,
	] as Vec3,
	size: 0.13,
	tiltDeg: -9,
} as const

/** An articulated desk lamp: base, post, two arms with knobs, a bell shade aimed at the desk. */
export const LAMP = {
	base: [0.9, DESK_TOP, -1.4] as Vec3,
	baseRadius: 0.07,
	postHeight: 0.07,
	elbow: [0.82, 1.2, -1.55] as Vec3,
	head: [0.74, 1.12, -1.3] as Vec3,
	armRadius: 0.011,
	shadeRadius: 0.085,
	shadeLength: 0.13,
	/** Where the shade points: a pool of light on the desk between the cat and the mouse. */
	headTarget: [0.66, DESK_TOP, -1.1] as Vec3,
} as const

export const WINDOW = {
	// Low enough for the moon to sit inside the hero framing (the camera's top edge meets the wall near y 1.57).
	center: [-0.5, 1.38, ROOM.backWallZ + 0.002] as Vec3,
	size: [0.86, 0.9] as const,
	frame: 0.045,
	moon: { center: [-0.27, 1.49] as const, radius: 0.08 },
} as const

/** A pair of socks on the floor in front of the desk, paw prints up. */
export const SOCKS = {
	center: [0.02, ROOM.floorY, -0.48] as Vec3,
	size: [0.09, 0.05, 0.2] as Vec3,
	gap: 0.05,
	yawDeg: 24,
} as const

/** Where the cat's feet-origin sits on the desk (character space origin). */
export const CAT_SPOT = {
	position: [0.0, DESK_TOP, -1.14] as Vec3,
} as const
