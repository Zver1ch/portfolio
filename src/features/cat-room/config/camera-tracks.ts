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
