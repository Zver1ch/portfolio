/** Animation and rendering constants (plan §3.6 and §3.8). */

/** The cat's rest-pose height after normalisation, metres. */
export const CAT_REST_HEIGHT = 0.62

export const BREATHING = { hz: 0.28, pitchDeg: 1 } as const

export const LOOK_AT = {
	yawDeg: 60,
	pitchDeg: 40,
	neckShare: 0.35,
	headShare: 0.65,
	/** Exponential damping rate, 1/s. */
	lambda: 6,
} as const

export const EAR_TWITCH = {
	minGap: 4,
	maxGap: 9,
	deg: 16,
	duration: 0.32,
} as const

export const MEOW = { jawDeg: 18, durationMs: 350 } as const

/**
 * The pet reaction (plan §2): the overlay pose played over the base pose,
 * its envelope in seconds and the delay before the jaw opens.
 */
export const PET = {
	/** Seated: only the face reacts (Gate 2, round 2), the paws and the tail stay put. */
	awake: {
		pose: 'sit-boop',
		fadeIn: 0.18,
		hold: 0.55,
		fadeOut: 0.45,
		jawDelay: 0.08,
		bones: ['neck', 'head', 'ear_l', 'ear_r'],
	},
	/** Peeking from the edge: only neck, head and ears react. */
	peeking: {
		pose: 'peek-boop',
		fadeIn: 0.15,
		hold: 0.45,
		fadeOut: 0.4,
		jawDelay: 0.05,
		bones: ['neck', 'head', 'ear_l', 'ear_r'],
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
	/** Half thickness of the tail: how high above the desk its spring chain is floored. */
	tailRadius: 0.075,
	tail: { stiffness: 140, inertia: 0.9, gravity: 0.8, maxBendDeg: 40 },
	ear: { stiffness: 320, inertia: 0.85, gravity: 0, maxBendDeg: 14 },
	hair: { stiffness: 260, inertia: 0.86, gravity: 0.3, maxBendDeg: 18 },
} as const satisfies Record<string, ChainParams | number>

/** Face tones baked into the room geometry from each face's normal. */
export const ROOM_TONES = { top: 1, front: 0.9, side: 0.8, away: 0.68 } as const

export const DPR_CAP = { full: 1.75, lite: 1.5 } as const

/** The pixel-ratio governor (plan §3.6). */
export const GOVERNOR = {
	windowSeconds: 2.5,
	lowFps: 40,
	highFps: 58,
	maxFlips: 3,
} as const

/** Loading the room (plan §3.11): give up after this and stay static. */
export const ROOM_LOAD = {
	timeoutMs: 15_000,
	/** Lite mode starts loading once a stage is this close to the viewport. */
	nearPx: 120,
} as const

/** The cat looks at the cursor as a point this far in front of the camera, metres. */
export const POINTER_LOOK_DEPTH = 0.8

/** The orthographic overlay of the `inside` phase (plan §3.10): the cat alone, in CSS px. */
export const OVERLAY = {
	/** CSS px per metre: `clamp(0.9 * H, minScale, maxScale)`. */
	minScale: 520,
	maxScale: 900,
	/** The camera sits this far in front of the cat's origin plane, metres. */
	cameraDistance: 3,
	/** Depth in front of the cat's origin plane where pointer and fish live, metres. */
	depth: 0.15,
	/** The cat looks at the pointer as a point this far in front of it, metres. */
	lookDepth: 0.8,
} as const

/** Edge intrusions (plan §3.10): budgets, odds and the shape of each gag. Seconds and metres. */
export const GAGS = {
	maxDuration: 4,
	minGap: 6,
	/** Escape silences automatic gags for this long. */
	silence: 60,
	peek: {
		duration: 3.2,
		/** Rise and sink take this long each. */
		rise: 0.5,
		/** Metres of the cat above the bottom edge at full rise: ears and eyes. */
		show: 0.2,
		xRange: [0.18, 0.82] as const,
		/** Odds of a peek on a section entry, after the first one. */
		chance: 0.75,
	},
	typing: { duration: 2.4, chance: 0.5 },
	fish: {
		/** CSS px per second². */
		gravity: 2400,
		/** The paw catches the fish this far above the bottom edge, metres. */
		catchAbove: 0.3,
		rise: 0.4,
		hold: 0.25,
		sink: 0.5,
		show: 0.2,
		xRange: [0.12, 0.88] as const,
		/**
		 * Roll of the reaching forearm about its axis, degrees: with the
		 * wrist's flex in the `reach` pose the pads face the head and the
		 * visitor, like a hook, instead of the sky.
		 */
		pawTwistDeg: -90,
	},
} as const
