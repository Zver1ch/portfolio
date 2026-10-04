import type { Vec3 } from '@/shared/lib/math/vec3'

/** Animation and rendering constants (plan §3.6 and §3.8). */

/** The cat's rest-pose height after normalisation, metres. */
export const CAT_REST_HEIGHT = 0.62

export const BREATHING = { hz: 0.28, pitchDeg: 1 } as const

export const LOOK_AT = {
	yawDeg: 50,
	pitchDeg: 25,
	neckShare: 0.35,
	headShare: 0.65,
	/** Exponential damping rate, 1/s. */
	lambda: 6,
	eyeYawDeg: 14,
	eyePitchDeg: 10,
} as const

export const EAR_TWITCH = {
	minGap: 4,
	maxGap: 9,
	deg: 16,
	duration: 0.32,
} as const

export const MEOW = { jawDeg: 18, durationMs: 350 } as const

/**
 * Closed eyes of the sleep pose (`lib/scene/cat/eyelids.ts`): the black eye
 * outlines collapse into the head and a `︶` stroke grows over each eye,
 * both driven by how far the eye bones have rolled.
 */
export const EYELIDS = {
	/** Head-bound black pieces this close to a pupil (in pupil sizes) are the eye's outline. */
	reach: 1,
	/** Where the outline collapses and the stroke grows from: this many pupil sizes behind the pupil. */
	hide: 1.5,
	/** The stroke floats this far off the eye surface, metres. */
	lift: 0.0025,
	/** Roll fractions of the eye bones between which the eyes count as closing. */
	rollEdges: [0.2, 0.8],
	line: {
		/** Span as a share of the outline's width (its outer part wraps around the head). */
		width: 0.68,
		/** Height of the line ends above the outline's centre, share of its height. */
		top: 0.1,
		/** How far the middle sags below the ends, share of the outline's height. */
		sag: 0.22,
		/** Thickness at the middle, share of the outline's height; the ends taper. */
		thickness: 0.09,
		segments: 16,
	},
} as const

export type ChainParams = {
	/** Spring pull towards the posed direction, 1/s². */
	stiffness: number
	/** Velocity kept per sub-step, 0..1. */
	inertia: number
	/** Downward pull in metres per second²; a hanging tail droops. */
	gravity: number
	/** Largest angle the spring may bend a bone away from its pose, degrees. */
	maxBendDeg: number
}

export const CHAINS = {
	subStep: 1 / 120,
	maxSubSteps: 4,
	tail: { stiffness: 140, inertia: 0.9, gravity: 0.8, maxBendDeg: 40 },
	ear: { stiffness: 320, inertia: 0.85, gravity: 0, maxBendDeg: 14 },
	hair: { stiffness: 260, inertia: 0.86, gravity: 0.3, maxBendDeg: 18 },
} as const satisfies Record<string, ChainParams | number>

/** Shading variant B: two-step tone from the flat normal against a key light. */
export const SHADING = {
	keyDirection: [-0.4, 0.75, 0.55] as Vec3,
	lit: 1,
	mid: 0.86,
	shade: 0.72,
	litAbove: 0.3,
	shadeBelow: -0.15,
} as const

/** Face tones baked into the room geometry from each face's normal. */
export const ROOM_TONES = { top: 1, front: 0.9, side: 0.8, away: 0.68 } as const

export const DPR_CAP = { full: 1.75, lite: 1.5 } as const
