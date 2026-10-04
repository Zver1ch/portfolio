import {
	clamp01,
	easeInOutCubic,
	mix,
	smoothstep,
	unlerp,
} from '@/shared/lib/math/ease'
import type { CameraPose } from '@/shared/lib/math/projection'
import {
	add,
	bezier2,
	lerp,
	scale,
	sub,
	type Vec3,
} from '@/shared/lib/math/vec3'
import {
	DAWN_CAMERA,
	DIVE,
	DIVE_CONTROL,
	END_OVERSHOOT,
	FINALE,
	FINALE_CONTROL,
	HERO_CAMERA,
	LITE_PULLBACK,
} from '../config/camera-tracks'
import { SCREEN } from '../config/room-layout'

export type Track = 'dive' | 'finale'

/**
 * The camera at the end of the dive: on the screen normal, at the distance
 * where the screen's height fills the viewport's height at the hero fov,
 * pulled in by `overshoot` so the bezel never shows.
 */
export function endCamera(overshoot = END_OVERSHOOT): CameraPose {
	const fov = HERO_CAMERA.fov
	const distance =
		(SCREEN.height / (2 * Math.tan((fov * Math.PI) / 360))) * overshoot
	const [x, y, z] = SCREEN.center
	return { position: [x, y, z + distance], target: SCREEN.center, fov }
}

/** Lite mode: the hero camera pushed away from its target on narrow viewports. */
export function liteHeroCamera(aspect: number): CameraPose {
	const factor = Math.max(1, LITE_PULLBACK / aspect)
	const offset = sub(HERO_CAMERA.position, HERO_CAMERA.target)
	return {
		...HERO_CAMERA,
		position: add(HERO_CAMERA.target, scale(offset, factor)),
	}
}

/** Camera pose for a scroll progress on a track. The aspect is kept for symmetry with the DOM warp. */
export function cameraAt(track: Track, p: number, _aspect: number): CameraPose {
	return track === 'dive' ? diveCamera(p) : finaleCamera(p)
}

function diveCamera(p: number): CameraPose {
	const end = endCamera()
	if (p <= DIVE.hold) return HERO_CAMERA
	if (p >= DIVE.travelEnd) return end
	const t = easeInOutCubic(unlerp(DIVE.hold, DIVE.travelEnd, p))
	return {
		position: bezier2(HERO_CAMERA.position, DIVE_CONTROL, end.position, t),
		target: lerp(
			HERO_CAMERA.target,
			end.target,
			clamp01(t / DIVE.targetLock),
		),
		fov: HERO_CAMERA.fov,
	}
}

function finaleCamera(p: number): CameraPose {
	const start = endCamera()
	if (p <= FINALE.undock) return start
	if (p >= FINALE.pullBackEnd) return DAWN_CAMERA
	const t = easeInOutCubic(unlerp(FINALE.undock, FINALE.pullBackEnd, p))
	return {
		position: bezier2(
			start.position,
			FINALE_CONTROL,
			DAWN_CAMERA.position,
			t,
		),
		target: lerp(start.target, DAWN_CAMERA.target, t),
		fov: mix(start.fov, DAWN_CAMERA.fov, t),
	}
}

/** How far the room has turned to dawn during the finale: 0.55 → 1. */
export function dawnFactor(finaleProgress: number): number {
	const [from, to] = FINALE.dawnRamp
	return 0.55 + 0.45 * smoothstep(from, to, finaleProgress)
}

/** Tail flick progress during the dive: 0 before, 1 after, eased between. */
export function tailFlick(diveProgress: number): number {
	const [from, to] = DIVE.tailFlick
	return smoothstep(from, to, diveProgress)
}

export type { Vec3 }
