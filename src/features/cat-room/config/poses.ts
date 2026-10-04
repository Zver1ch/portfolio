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
	/**
	 * Local Euler XYZ offset in degrees applied last, after `aim` and
	 * `twist`: the same thing the lab's sliders and `bone/axis/deg` do, so a
	 * value found there bakes in as it is.
	 */
	post?: Vec3
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
	| 'sit-boop'
	| 'stretch'
	| 'sleep'
	| 'sleep-stretch'
	| 'peek'
	| 'peek-boop'
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
	 * visitor: thighs on the desk, shins dangling over the edge, leaning back
	 * a little on both paws planted behind the hips, tail curled on the desk
	 * round the left side. The root drops the standing origin by the seat
	 * height so the seat lands on the desk top.
	 */
	sit: {
		root: SIT_ROOT,
		bones: {
			hips: { aim: [0, 1, -0.18] },
			chest: { aim: [0, 1, -0.08] },
			neck: { aim: [0, 0.97, 0.22] },
			head: { aim: [0, 0.98, 0.2] },
			// Leaning back on both paws, planted on the desk behind the hips and
			// hidden by the body from the front.
			arm_l: { aim: [0.3, -0.72, -0.62] },
			elbow_l: { aim: [0.05, -0.85, -0.52] },
			wrist_l: { aim: [-0.25, -0.25, -0.93] },
			arm_r: { aim: [-0.3, -0.72, -0.62] },
			elbow_r: { aim: [-0.05, -0.85, -0.52] },
			wrist_r: { aim: [0.25, -0.25, -0.93] },
			// Thighs forward on the desk, shins hanging past the edge, toes down.
			leg_l: { aim: [0.2, 0.02, 0.98] },
			knee_l: { aim: [0.05, -0.95, 0.32] },
			foot_l: { aim: [0, -0.5, 0.85] },
			leg_r: { aim: [-0.2, 0.02, 0.98] },
			knee_r: { aim: [-0.05, -0.95, 0.3] },
			foot_r: { aim: [0, -0.5, 0.85] },
			// Tail along the desk behind, a gentle arc round the left hip: about
			// 30° per joint over the seven tail bones.
			tailroot: { aim: [0.1, -0.45, -0.88] },
			tail: { aim: [0.45, -0.25, -0.86] },
			tail001: { aim: [0.8, -0.08, -0.6] },
			tail002: { aim: [0.98, 0, -0.2] },
			tail003: { aim: [0.92, 0.02, 0.38] },
			tail004: { aim: [0.65, 0.02, 0.76] },
			tail005: { aim: [0.25, 0.02, 0.97] },
			ear_l: { rot: [0, 0, 6] },
			ear_r: { rot: [0, 0, -6] },
		},
	},

	/**
	 * The click reaction, seated (Gate 2, round 2): face only. Masked to neck,
	 * head and ears: the head tips to the side and down a little towards the
	 * visitor, the ears flatten; the jaw layer opens the mouth. Paws and tail
	 * stay where the sitting pose has them.
	 */
	'sit-boop': {
		root: SIT_ROOT,
		bones: {
			neck: { aim: [0.12, 0.93, 0.34] },
			head: { aim: [0.3, 0.88, 0.36], twist: 14 },
			ear_l: { rot: [0, 0, -26] },
			ear_r: { rot: [0, 0, 26] },
		},
	},

	/** A full-body stretch, seated: paws up and out, back arched, legs kicking forward, tail up. Kept for the lab; the click reaction is `sit-boop`. */
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
			tail004: { aim: [0, 0.4, 0.92] },
			tail005: { aim: [0, 0.2, 0.98] },
			ear_l: { rot: [0, 0, -14] },
			ear_r: { rot: [0, 0, 14] },
		},
	},

	/**
	 * Asleep on the desk in front of the monitor (Gate 2, round 1): curled on
	 * the left side, back to the monitor, belly to the visitor, head towards the
	 * lamp. Written in character space, which lying on the left side maps to
	 * the world as: +Y along the desk towards the head (+X world), +Z to the
	 * visitor, +X down into the desk. The spine bends gently towards the
	 * belly, so the face turns along the desk towards the dawn camera; the
	 * forearms fold under the chin; the thighs come up towards the belly with
	 * the shins folded back; the tail trails behind and curls round the feet.
	 */
	sleep: {
		root: { position: [-0.7, 0.1, -0.34], rotation: [-20, 0, -90] },
		bones: {
			hips: { aim: [0, 1, 0.1] },
			chest: { aim: [0, 0.95, 0.3] },
			neck: { aim: [0, 0.9, 0.44] },
			head: { aim: [0, 0.78, 0.63], post: [0, 0, 60] },
			// Upper arms along the chest towards the chin, forearms folded in
			// front of it, paws tucked under the chin (the `post` raise is what
			// the lab's sliders found): the lower (left) arm on the desk, the
			// right one over it. The forearm twists turn the palms towards each
			// other, the lower one up and the upper one down (measured from the
			// pad vertices in the lab, Gate 2 round 2).
			arm_l: { aim: [0.5, 0.75, 0.45], post: [40, 0, 0] },
			elbow_l: { aim: [0.2, 0.3, 0.93], twist: -85 },
			wrist_l: { aim: [0, 0.5, 0.86] },
			arm_r: { aim: [-0.1, 0.8, 0.6], post: [40, 0, 0] },
			elbow_r: { aim: [0.1, 0.2, 0.97], twist: 100 },
			wrist_r: { aim: [0, 0.4, 0.9] },
			// Thighs up towards the belly, shins folded back, the right leg lying
			// on the left one.
			leg_l: { aim: [0.15, 0.45, 0.88] },
			knee_l: { aim: [0.05, -0.95, 0.3] },
			foot_l: { aim: [0, -0.8, 0.6] },
			leg_r: { aim: [0.05, 0.45, 0.88] },
			knee_r: { aim: [0, -0.95, 0.3] },
			foot_r: { aim: [0, -0.8, 0.6] },
			// The tail trails behind along the desk and curls round the feet.
			tailroot: { aim: [0.1, -0.8, -0.6] },
			tail: { aim: [0.1, -1, -0.1] },
			tail001: { aim: [0.1, -0.9, 0.4] },
			tail002: { aim: [0.1, -0.6, 0.8] },
			tail003: { aim: [0.1, -0.2, 1] },
			tail004: { aim: [0.05, 0.2, 0.98] },
			tail005: { aim: [0.05, 0.5, 0.86] },
			ear_l: { rot: [0, 0, 20] },
			ear_r: { rot: [0, 0, -20] },
			lefteye: { rot: [180, 0, 0] },
			righteye: { rot: [180, 0, 0] },
		},
	},

	/**
	 * The pet reaction of the sleeper, played over `sleep` (same root, eyes
	 * still shut): the front legs push out along the desk past the head, the
	 * back arches, the hind legs straighten with the toes spread, the head
	 * lifts a little, the ears come up, the tail straightens behind. The jaw
	 * layer adds the yawn. Character space, as `sleep`.
	 */
	'sleep-stretch': {
		root: { position: [-0.7, 0.1, -0.34], rotation: [-20, 0, -90] },
		bones: {
			hips: { aim: [0, 1, -0.05] },
			chest: { aim: [0, 0.95, -0.2] },
			neck: { aim: [0, 0.95, 0.1] },
			head: { aim: [0, 0.9, 0.4], post: [0, 0, 45] },
			arm_l: { aim: [0.05, 0.95, 0.3] },
			elbow_l: { aim: [0, 0.95, 0.3] },
			wrist_l: { aim: [0, 0.9, 0.44] },
			arm_r: { aim: [-0.2, 0.9, 0.4] },
			elbow_r: { aim: [0, 0.95, 0.3] },
			wrist_r: { aim: [0, 0.9, 0.44] },
			leg_l: { aim: [0.05, -0.9, 0.42] },
			knee_l: { aim: [0.05, -0.95, 0.3] },
			foot_l: { aim: [0, -0.7, 0.7] },
			leg_r: { aim: [-0.1, -0.85, 0.5] },
			knee_r: { aim: [-0.05, -0.95, 0.3] },
			foot_r: { aim: [0, -0.6, 0.8] },
			tailroot: { aim: [0.1, -0.9, -0.4] },
			tail: { aim: [0.1, -1, -0.1] },
			tail001: { aim: [0.1, -1, 0.1] },
			tail002: { aim: [0.1, -0.95, 0.3] },
			tail003: { aim: [0.05, -0.9, 0.44] },
			tail004: { aim: [0.05, -0.85, 0.5] },
			tail005: { aim: [0, -0.8, 0.6] },
			ear_l: { rot: [0, 0, 6] },
			ear_r: { rot: [0, 0, -6] },
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

	/** The pet reaction while peeking, masked to neck, head and ears: a tilt and flat ears. */
	'peek-boop': {
		bones: {
			neck: { aim: [0.1, 0.85, 0.5] },
			head: { aim: [0.3, 0.7, 0.65], twist: 18 },
			ear_l: { rot: [0, 0, -24] },
			ear_r: { rot: [0, 0, 24] },
		},
	},

	/**
	 * Overlay gag: the left paw reaching up for the fish or the cursor. The
	 * arm itself is placed by the IK; the wrist's flex (`post`) curls the paw
	 * towards the head so the pads face it, and `GAGS.fish.pawTwistDeg` rolls
	 * the forearm so that curl faces the visitor.
	 */
	reach: {
		bones: {
			chest: { aim: [0.15, 0.95, 0.15] },
			arm_l: { aim: [0.3, 0.9, 0.3] },
			elbow_l: { aim: [0.1, 0.95, 0.25] },
			wrist_l: { aim: [0, 0.9, 0.4], post: [70, 0, 0] },
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
			tail004: { aim: [0.25, 0.4, 0.88] },
			tail005: { aim: [0.25, 0.25, 0.94] },
		},
	},
}
