import type { Quad } from '@/shared/lib/math/homography'
import type { CameraPose } from '@/shared/lib/math/projection'
import type { Vec3 } from '@/shared/lib/math/vec3'
import type { PoseName } from '../config/poses'
import type { OverlayPlacement } from '../lib/overlay'

export type Phase = 'room' | 'inside' | 'finale' | 'off'

/** Everything the scene needs for one frame; written by the director, read by `RoomScene.render`. */
export type DirectorFrame = {
	phase: Phase
	camera: CameraPose
	/** Clamped, accumulated animation time in seconds. */
	time: number
	/** 0 at night, 1 at full dawn. */
	dawn: number
	/** Scroll progress of the dive, drives the tail flick. */
	dive: number
	/** CSS pixel size of the layer. */
	viewport: { width: number; height: number }
	/** Pointer in CSS pixels, when there is one. */
	pointer: { x: number; y: number } | null
	/** Base pose for the phase; the scene blends reactions on top. */
	pose: PoseName
	/** World point the cat looks at; null looks at the camera. */
	lookAt: Vec3 | null
	/** The scene was off screen since the last frame: a pose change is a cut, not a blend. */
	cut: boolean
	/** The `inside` phase: the cat alone through an orthographic camera in CSS px; the room is hidden. */
	overlay: OverlayPlacement | null
	/** World point the left paw reaches for (the fish), or null. */
	reach: Vec3 | null
	/** Roll of the reaching forearm, degrees; the tuning value when absent (a lab override). */
	reachTwistDeg?: number
	/** The dropped fish: where it is, or that the paw holds it now. */
	fish: { position: Vec3; held: boolean } | null
	/** Quantise the animation clock to 12 steps a second (lab toggle). */
	stepped: boolean
	/**
	 * Phone variant `c`: a screen-space hole in CSS px (TL TR BR BL) that
	 * follows the page card, so the real page shows through wherever the card
	 * is while the camera holds; absent otherwise.
	 */
	hole?: Quad | null
}
