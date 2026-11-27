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

/**
 * Lite mode (plan §3.4, the owner's choice at Gate 2 round 6): the stage
 * cameras of a portrait viewport, the stock framings with a phone's field of
 * view, composed from close by so the whole desk and a big cat fill the
 * frame and the monitor is in the shot to fly into. The hero camera leaves
 * the bottom to the name; the dawn one, from the left, keeps the cat on the
 * right above the credits. Each is blended to the stock pose on landscape
 * viewports over `LITE_FRAMING.portraitTo..portraitFrom` (viewport aspects),
 * so a square window gets the stock framing.
 */
export const LITE_CAMERAS = {
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
} as const satisfies Record<string, CameraPose>

export const LITE_FRAMING = {
	portraitFrom: 1.0,
	portraitTo: 0.8,
} as const

/**
 * Lite mode: the dive is a straight push into the monitor; the pull-back
 * bows forward, around the desk, to the dawn camera (an offset from the
 * midpoint of the path).
 */
export const LITE_FINALE_BOW: Vec3 = [0.1, 0.1, 0.35]

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
