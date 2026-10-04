import type { CameraPose } from '@/shared/lib/math/projection'
import type { Vec3 } from '@/shared/lib/math/vec3'
import type { PoseName } from '../config/poses'

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
	/** Quantise the animation clock to 12 steps a second (lab toggle). */
	stepped: boolean
}
