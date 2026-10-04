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

export const DAWN_CAMERA: CameraPose = {
	position: [-0.35, 1.48, 0.95],
	target: [0.05, 1.02, -1.25],
	fov: 34,
}

/** Control point of the pull-back from the screen to the dawn camera. */
export const FINALE_CONTROL: Vec3 = [-0.12, 1.3, 0.1]

/** Lite mode pushes the hero camera away on narrow viewports: `max(1, LITE_PULLBACK / aspect)`. */
export const LITE_PULLBACK = 1.0

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
