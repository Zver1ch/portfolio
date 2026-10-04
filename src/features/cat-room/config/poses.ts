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
	| 'lounge'
	| 'stretch'
	| 'sleep'
	| 'peek'
	| 'reach'
	| 'tail-up'

/*
 * Character space: +Y up, +Z forward (the face), +X the cat's own left.
 * Lying poses turn the whole cat with `root.rotation` ([0, 0, -90] lays the
 * head towards +X with the left side down), so limb aims are written as if
 * the cat stood up and were then tipped over.
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

const LYING_ROOT = {
	position: [0, 0.07, 0] as Vec3,
	rotation: [0, 0, -90] as Vec3,
}

export const POSES: Record<PoseName, Pose> = {
	rest: { bones: {} },

	/**
	 * On the left side along the desk, head towards the visitor, bored. With
	 * the root turned by -90° about Z a world direction (x, y, z) is written
	 * here as (-y, x, z): the desk runs along world X (the head at +X), the
	 * visitor sits at +Z, up is +Y.
	 */
	lounge: {
		root: LYING_ROOT,
		bones: {
			// Torso flat along the desk, the chest lifting a little towards the visitor.
			hips: { aim: [0.05, 1, 0.1] },
			chest: { aim: [-0.25, 0.95, 0.15] },
			neck: { aim: [-0.65, 0.7, 0.2] },
			head: { aim: [-0.8, 0.55, -0.25] },
			// Lower (left) arm: upper arm forward and down, forearm up, cheek on the paw.
			arm_l: { aim: [0.45, 0.3, 0.85] },
			elbow_l: { aim: [-0.9, 0.35, 0.25] },
			wrist_l: { aim: [-0.8, 0.5, 0.3] },
			// Upper (right) arm reaches over to the keyboard in front.
			arm_r: { aim: [0.55, -0.2, 0.8] },
			elbow_r: { aim: [0.5, -0.3, 0.8] },
			wrist_r: { aim: [0.25, -0.35, 0.9] },
			// Knees drawn forward and stacked, bent about 90°: thighs towards the
			// visitor and down the body, shins back and further down, never
			// folded into the thighs.
			leg_l: { aimWorld: [-0.5, -0.12, 0.85] },
			knee_l: { aimWorld: [-0.8, -0.12, -0.55] },
			foot_l: { aimWorld: [-0.95, 0.1, -0.3] },
			leg_r: { aimWorld: [-0.45, 0.04, 0.88] },
			knee_r: { aimWorld: [-0.78, 0.02, -0.6] },
			foot_r: { aimWorld: [-0.92, 0.2, -0.3] },
			// Tail clears the back, then rises in front of the screen (world up is character -X).
			tailroot: { aim: [-0.6, -0.15, -0.78] },
			tail: { aim: [-0.97, -0.1, -0.2] },
			tail001: { aim: [-0.95, 0.3, 0.05] },
			tail002: { aim: [-0.6, 0.75, 0.25] },
			tail003: { aim: [-0.1, 0.9, 0.4] },
			ear_l: { rot: [0, 0, 8] },
			ear_r: { rot: [0, 0, -8] },
		},
	},

	/** The click reaction: arms out past the head, legs long, back arched, mouth open through the jaw layer. */
	stretch: {
		root: LYING_ROOT,
		bones: {
			hips: { aim: [0.05, 1, -0.05] },
			chest: { aim: [0.1, 1, -0.2] },
			neck: { aim: [-0.3, 0.9, -0.3] },
			head: { aim: [-0.6, 0.7, -0.4] },
			arm_l: { aim: [0.1, 0.8, 0.55] },
			elbow_l: { aim: [-0.1, 0.95, 0.3] },
			wrist_l: { aim: [-0.2, 0.95, 0.25] },
			arm_r: { aim: [-0.25, 0.85, 0.45] },
			elbow_r: { aim: [-0.35, 0.9, 0.25] },
			wrist_r: { aim: [-0.4, 0.9, 0.2] },
			leg_l: { aim: [0.1, -0.9, 0.4] },
			knee_l: { aim: [0.05, -1, -0.1] },
			foot_l: { aim: [0.2, -0.6, -0.75] },
			leg_r: { aim: [-0.05, -0.92, 0.38] },
			knee_r: { aim: [-0.1, -1, -0.1] },
			foot_r: { aim: [0.1, -0.6, -0.78] },
			tailroot: { aim: [-0.4, -0.2, -0.9] },
			tail: { aim: [-0.9, -0.2, -0.4] },
			tail001: { aim: [-1, -0.2, 0] },
			tail002: { aim: [-0.95, -0.3, 0.15] },
			tail003: { aim: [-0.8, -0.4, 0.4] },
			ear_l: { rot: [0, 0, -14] },
			ear_r: { rot: [0, 0, 14] },
		},
	},

	/**
	 * Asleep at dawn, sprawled on the back the way real cats do: belly up and
	 * rolled a little towards the visitor, head tipped back, both front paws
	 * stretched past the head, hind legs long and loose, tail curled away.
	 * The 180° roll of the eye bones turns the pupils into the head and brings
	 * the closed lids built on the back of those bones to the front
	 * (`lib/scene/cat/eyelids.ts`). Look-at is off while this pose is active.
	 */
	sleep: {
		root: { position: [0, 0.05, 0], rotation: [-75, 0, -90] },
		bones: {
			hips: { aimWorld: [1, 0.08, 0.02] },
			chest: { aimWorld: [1, 0.12, -0.05] },
			neck: { aimWorld: [0.95, -0.1, -0.2] },
			head: { aimWorld: [0.85, -0.45, -0.25], twist: 25 },
			// Front paws up past the head; the far one bent at the wrist.
			arm_l: { aimWorld: [0.85, 0.2, 0.45] },
			elbow_l: { aimWorld: [0.95, 0.2, 0.2] },
			wrist_l: { aimWorld: [0.8, 0.5, 0.3] },
			arm_r: { aimWorld: [0.9, 0.15, -0.4] },
			elbow_r: { aimWorld: [0.75, 0.55, -0.35] },
			wrist_r: { aimWorld: [0.2, 0.9, -0.3] },
			// Hind legs stretched the other way, slightly splayed, toes up.
			leg_l: { aimWorld: [-0.85, -0.1, 0.5] },
			knee_l: { aimWorld: [-0.95, 0, 0.3] },
			foot_l: { aimWorld: [-0.85, 0.45, 0.3] },
			leg_r: { aimWorld: [-0.85, 0.05, -0.5] },
			knee_r: { aimWorld: [-0.9, 0.15, -0.4] },
			foot_r: { aimWorld: [-0.75, 0.6, -0.3] },
			// Tail out along the desk behind the body, curling towards the head.
			tailroot: { aimWorld: [-0.5, -0.15, -0.85] },
			tail: { aimWorld: [-0.1, -0.05, -1] },
			tail001: { aimWorld: [0.5, 0, -0.85] },
			tail002: { aimWorld: [0.9, 0.05, -0.4] },
			tail003: { aimWorld: [1, 0.1, 0.15] },
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
