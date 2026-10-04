import type { Vec3 } from '@/shared/lib/math/vec3'
import type { CatBoneKey } from './cat-rig.gen'

/**
 * Bones a pose may touch. `popka*` are never animated, `shoulder_*` have
 * degenerate bind matrices and carry no vertices (an arm is
 * `arm → elbow → wrist`), `_end` leaves move nothing and the skeleton root
 * is driven through `root`.
 */
export type PosableBoneKey = Exclude<
	CatBoneKey,
	`popka${string}` | `shoulder_${string}` | `${string}_end` | '_rootjoint'
>

export type BonePose = {
	/** Local Euler XYZ offset in degrees on top of the rest rotation. */
	rot?: Vec3
	/**
	 * Direction the bone should point in character space (+Y up, +Z forward,
	 * +X the cat's left), resolved parent-first by shortest arc.
	 */
	aim?: Vec3
	/**
	 * The same, but in world space of the placed cat (after `root.rotation`):
	 * +X along the desk towards the head side, +Y up, +Z towards the visitor.
	 * Lying poses are far easier to write this way.
	 */
	aimWorld?: Vec3
	/** Roll about the bone axis after `aim`, degrees. */
	twist?: number
}

export type Pose = {
	/** Placement of the whole cat relative to its spot: metres and degrees (XYZ). */
	root?: { position: Vec3; rotation: Vec3 }
	/** Offset of the pelvis bone (`spine` in this rig), character metres. */
	hips?: Vec3
	bones: Partial<Record<PosableBoneKey, BonePose>>
}

export type PoseName =
	| 'rest'
	| 'sit'
	| 'stretch'
	| 'sleep'
	| 'peek'
	| 'reach'
	| 'tail-up'

/*
 * Character space: +Y up, +Z forward (the face), +X the cat's own left.
 * The sitting poses keep the root upright and facing the visitor; the sleep
 * pose turns the whole cat with `root.rotation`, so its limbs are written in
 * `aimWorld`.
 *
 * Bone axes (rest pose, character space): spine chain +Y; thighs and shins
 * -Y; upper arms and forearms ±X (T-pose, left arm +X); tail chain -Z then
 * curving; ears up and out; eyes +Z.
 *
 * Local `rot` axes, read off the probe sheets (`pnpm assets:shots --probe
 * <bone>`, +30° about each axis; the right side mirrors X and Y):
 * - head: X nods forward, Y turns towards the cat's left, Z rolls the left ear up.
 * - neck, chest, hips: as the head (pitch, yaw, roll of the spine chain).
 * - arm_l / elbow_l: X raises the arm in the frontal plane, Y rolls it about
 *   its length, Z swings it forward.
 * - leg_l / knee_l: X swings the leg forward, Y rolls it, Z swings it outward.
 * - jaw: X opens the mouth (the pink interior shows).
 * - ear_l (and the ear001 / ear002 segments): X tilts the ear forward,
 *   Z tilts it outward; the twitch layer uses Z.
 */

/**
 * Seated on the desk: the character origin (the standing feet) drops by the
 * height of the seat, 19 cm at the 0.354 model scale (the hip joints sit at
 * 26 cm, the pelvis bone at 33 cm), so the seat meets the desk top and the
 * thighs rest on it with the shins bent over the edge.
 */
const SIT_ROOT = {
	position: [0, -0.19, 0] as Vec3,
	rotation: [0, 0, 0] as Vec3,
}

export const POSES: Record<PoseName, Pose> = {
	rest: { bones: {} },

	/**
	 * Sitting on the front edge of the desk next to the mouse, facing the
	 * visitor: thighs on the desk, shins dangling over the edge, the left paw
	 * propped beside the hip, the right paw resting on the mouse, tail curled
	 * on the desk round the left side. The root drops the standing origin by
	 * the hip height so the seat lands on the desk top.
	 */
	sit: {
		root: SIT_ROOT,
		bones: {
			hips: { aim: [0, 1, -0.08] },
			chest: { aim: [0, 1, 0.06] },
			neck: { aim: [0, 0.98, 0.15] },
			head: { aim: [0, 0.98, 0.2] },
			// Left paw on the desk beside the hip.
			arm_l: { aim: [0.3, -0.95, 0.05] },
			elbow_l: { aim: [0.1, -0.97, 0.2] },
			wrist_l: { aim: [0.05, -0.15, 1] },
			// Right paw over to the mouse.
			arm_r: { aim: [-0.5, -0.88, 0.22] },
			elbow_r: { aim: [-0.4, -0.88, 0.35] },
			wrist_r: { aim: [-0.2, -0.3, 0.93] },
			// Thighs forward on the desk, shins hanging past the edge, toes down.
			leg_l: { aim: [0.2, 0.02, 0.98] },
			knee_l: { aim: [0.05, -0.95, 0.32] },
			foot_l: { aim: [0, -0.5, 0.85] },
			leg_r: { aim: [-0.2, 0.02, 0.98] },
			knee_r: { aim: [-0.05, -0.95, 0.3] },
			foot_r: { aim: [0, -0.5, 0.85] },
			// Tail along the desk behind, curling round the left hip.
			tailroot: { aim: [0.3, -0.5, -0.8] },
			tail: { aim: [0.8, -0.1, -0.6] },
			tail001: { aim: [1, 0, 0.1] },
			tail002: { aim: [0.7, 0, 0.7] },
			tail003: { aim: [0.2, 0.05, 1] },
			ear_l: { rot: [0, 0, 6] },
			ear_r: { rot: [0, 0, -6] },
		},
	},

	/** The click reaction, seated: paws thrown up and out, back arched, legs kicking forward, tail up, mouth open through the jaw layer. */
	stretch: {
		root: SIT_ROOT,
		bones: {
			hips: { aim: [0, 1, -0.15] },
			chest: { aim: [0, 0.95, -0.3] },
			neck: { aim: [0, 0.8, 0.55] },
			head: { aim: [0, 0.7, 0.7] },
			arm_l: { aim: [0.55, 0.8, 0.15] },
			elbow_l: { aim: [0.35, 0.93, 0.1] },
			wrist_l: { aim: [0.25, 0.93, 0.25] },
			arm_r: { aim: [-0.55, 0.8, 0.15] },
			elbow_r: { aim: [-0.35, 0.93, 0.1] },
			wrist_r: { aim: [-0.25, 0.93, 0.25] },
			leg_l: { aim: [0.25, 0.1, 0.96] },
			knee_l: { aim: [0.1, -0.55, 0.83] },
			foot_l: { aim: [0, -0.2, 1] },
			leg_r: { aim: [-0.25, 0.1, 0.96] },
			knee_r: { aim: [-0.1, -0.55, 0.83] },
			foot_r: { aim: [0, -0.2, 1] },
			tailroot: { aim: [0.2, 0.4, -0.9] },
			tail: { aim: [0.3, 0.9, -0.3] },
			tail001: { aim: [0.2, 1, 0.1] },
			tail002: { aim: [0.1, 0.9, 0.45] },
			tail003: { aim: [0, 0.6, 0.8] },
			ear_l: { rot: [0, 0, -14] },
			ear_r: { rot: [0, 0, 14] },
		},
	},

	sleep: {
		// Relative to the sitting spot: the sleeper lies along the desk from x = 0.
		root: { position: [-0.7, 0.12, -0.26], rotation: [-75, 0, -90] },
		bones: {
			hips: { aimWorld: [1, 0.08, 0.02] },
			chest: { aimWorld: [1, 0.12, -0.05] },
			neck: { aimWorld: [0.95, -0.1, -0.2] },
			head: { aimWorld: [0.9, -0.3, -0.25], twist: 25 },
			// Front paws stretched past the head and resting on the desk.
			arm_l: { aimWorld: [0.7, -0.45, 0.4] },
			elbow_l: { aimWorld: [0.95, -0.08, 0.25] },
			wrist_l: { aimWorld: [1, 0.1, 0.15] },
			arm_r: { aimWorld: [0.75, -0.45, -0.3] },
			elbow_r: { aimWorld: [0.95, -0.08, -0.2] },
			wrist_r: { aimWorld: [1, 0.1, -0.1] },
			// Hind legs stretched the other way, slightly splayed, toes up.
			leg_l: { aimWorld: [-0.85, 0.1, 0.45] },
			knee_l: { aimWorld: [-0.95, 0.12, 0.3] },
			foot_l: { aimWorld: [-0.85, 0.45, 0.3] },
			leg_r: { aimWorld: [-0.88, 0.12, -0.3] },
			knee_r: { aimWorld: [-0.92, 0.2, -0.25] },
			foot_r: { aimWorld: [-0.75, 0.6, -0.3] },
			// Tail thrown over the near thigh and down along the shin: the only
			// room on the desk (the monitor base is behind, the keyboard in front).
			tailroot: { aimWorld: [-0.35, 0.45, 0.8] },
			tail: { aimWorld: [-0.8, 0.2, 0.45] },
			tail001: { aimWorld: [-0.95, 0.05, -0.1] },
			tail002: { aimWorld: [-0.95, 0, -0.3] },
			tail003: { aimWorld: [-0.9, 0, -0.45] },
			ear_l: { rot: [0, 0, 20] },
			ear_r: { rot: [0, 0, -20] },
			lefteye: { rot: [180, 0, 0] },
			righteye: { rot: [180, 0, 0] },
		},
	},

	/** Overlay gag: standing below the bottom edge, ears and eyes rising. */
	peek: {
		bones: {
			neck: { aim: [0, 0.9, 0.45] },
			head: { aim: [0, 0.85, 0.5] },
			arm_l: { aim: [0.3, -0.9, 0.3] },
			elbow_l: { aim: [0.1, -0.6, 0.8] },
			arm_r: { aim: [-0.3, -0.9, 0.3] },
			elbow_r: { aim: [-0.1, -0.6, 0.8] },
		},
	},

	/** Overlay gag: the left paw reaching up for the fish or the cursor. */
	reach: {
		bones: {
			chest: { aim: [0.15, 0.95, 0.15] },
			arm_l: { aim: [0.3, 0.9, 0.3] },
			elbow_l: { aim: [0.1, 0.95, 0.25] },
			wrist_l: { aim: [0, 0.9, 0.4] },
			arm_r: { aim: [-0.3, -0.9, 0.3] },
			elbow_r: { aim: [-0.1, -0.6, 0.8] },
		},
	},

	/** Tail raised for the sweep across the viewport edge. */
	'tail-up': {
		bones: {
			tailroot: { aim: [0, 0.3, -0.95] },
			tail: { aim: [0, 0.8, -0.6] },
			tail001: { aim: [0, 1, -0.1] },
			tail002: { aim: [0.1, 0.9, 0.4] },
			tail003: { aim: [0.2, 0.6, 0.75] },
		},
	},
}
