import type { CameraPose } from '@/shared/lib/math/projection'
import type { Vec3 } from '@/shared/lib/math/vec3'

/** Starting values from plan §3.4 and §3.5; tuned at Gate 1. */

export const CAMERA_NEAR = 0.05
export const CAMERA_FAR = 30

export const HERO_CAMERA: CameraPose = {
	position: [1.05, 1.42, 0.9],
	target: [0.35, 0.92, -1.15],
	fov: 32,
}

/** Control point of the quadratic Bézier the dive flies along. */
export const DIVE_CONTROL: Vec3 = [0.55, 1.26, -0.05]

/** The dive stops 1.5% closer than the exact fit, so the bezel is never seen. */
export const END_OVERSHOOT = 0.985

/** Frames the monitor and the cat sitting to its right, from a little left of centre (Gate 2, round 3). */
export const DAWN_CAMERA: CameraPose = {
	position: [-0.15, 1.46, 1.0],
	target: [0.4, 1.0, -1.22],
	fov: 34,
}

/** Control point of the pull-back from the screen to the dawn camera. */
export const FINALE_CONTROL: Vec3 = [0, 1.3, 0.1]

/** Lite mode pushes a stage camera away on narrow viewports: `max(1, LITE_PULLBACK / aspect)`. */
export const LITE_PULLBACK = 1.0

/**
 * Lite mode on portrait viewports (plan §3.4): the pulled-back camera aims
 * lower than the stock one, so the desk top sits at this share of the frame's
 * height from the top. The hero leaves the bottom to the name, the dawn
 * leaves it to the credits. Blended in between `portraitFrom` and
 * `portraitTo` (viewport aspects) so a square window gets the stock aim.
 */
export const LITE_FRAMING = {
	deskShare: { hero: 0.42, dawn: 0.36 },
	portraitFrom: 1.0,
	portraitTo: 0.8,
	/** The lite dive's Bézier control point, relative to the midpoint of the path. */
	diveBow: [-0.2, 0, -0.15] as Vec3,
} as const

/**
 * Gate 2 round 6 (`config/phone-variant.ts`): the stage cameras of the three
 * phone variants, composed for a portrait frame from close by instead of
 * backing the stock cameras off. Each is blended to the stock pose on
 * landscape viewports over `LITE_FRAMING.portraitTo..portraitFrom`.
 */
export const PHONE_CAMERAS = {
	/** The still: the cat from its right, the monitor over its shoulder; the dawn one leaves the bottom half to the credits. */
	a: {
		hero: {
			position: [1.5, 1.05, 0.54],
			target: [0.7, 0.8, -0.84],
			fov: 55,
		},
		dawn: {
			position: [1.45, 1.0, 0.55],
			target: [0.65, 0.88, -0.85],
			fov: 48,
		},
	},
	/** The short dive: the stock hero framing with a phone's field of view, so the monitor is in the shot to fly into. */
	b: {
		hero: {
			position: [1.15, 1.35, 0.8],
			target: [0.52, 0.9, -1.1],
			fov: 52,
		},
		dawn: {
			position: [0.0, 1.4, 0.9],
			target: [0.5, 0.72, -1.0],
			fov: 50,
		},
	},
	/** The card: frontal and level, the cat in the lower half under the name, the portrait monitor beside it. */
	c: {
		hero: {
			position: [0.95, 1.18, 0.75],
			target: [0.55, 1.18, -0.9],
			fov: 55,
		},
		dawn: {
			position: [1.0, 1.0, 0.8],
			target: [0.55, 0.85, -0.9],
			fov: 50,
		},
	},
} as const satisfies Record<string, { hero: CameraPose; dawn: CameraPose }>

/** Variant b: the dive is a straight push-in; the pull-back bows forward, around the desk, to the dawn camera. Offsets from the midpoint. */
export const PHONE_BOW = {
	dive: [0, 0, 0] as Vec3,
	finale: [0.1, 0.1, 0.35] as Vec3,
} as const

/**
 * Variant c: the monitor is a vertical panel, 9:16 at the narrowest (a coder's
 * second screen turned portrait); the page card grows out of it over the
 * whole dive track and is back in it by `finaleEnd` of the finale's.
 */
export const PHONE_CARD = {
	screenAspectFloor: 0.5625,
	finaleEnd: 0.45,
} as const

/** Dive progress map (0..1 of the pinned scroll). */
export const DIVE = {
	hold: 0.08,
	travelEnd: 0.9,
	/** The camera target reaches the screen centre at this share of the travel. */
	targetLock: 0.7,
	tailFlick: [0.55, 0.8] as const,
	dock: 0.9,
	inside: 0.985,
} as const

/** Finale progress map. */
export const FINALE = {
	/** The phase turns `finale` past this progress (full mode). */
	phaseStart: 0.015,
	undock: 0.1,
	pullBackEnd: 0.85,
	dawnRamp: [0.1, 0.9] as const,
} as const
