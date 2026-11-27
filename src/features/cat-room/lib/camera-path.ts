import {
	clamp01,
	easeInOutCubic,
	mix,
	smoothstep,
	unlerp,
} from '@/shared/lib/math/ease'
import type { CameraPose } from '@/shared/lib/math/projection'
import { add, bezier2, lerp, type Vec3 } from '@/shared/lib/math/vec3'
import {
	DAWN_CAMERA,
	DIVE,
	DIVE_CONTROL,
	END_OVERSHOOT,
	FINALE,
	FINALE_CONTROL,
	HERO_CAMERA,
	LITE_CAMERAS,
	LITE_FINALE_BOW,
	LITE_FRAMING,
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

/**
 * Lite mode (plan §3.4): a stage camera for a viewport. Portrait viewports
 * get the lite pose, landscape ones the stock pose, blended between
 * `LITE_FRAMING.portraitTo` and `portraitFrom`.
 */
function liteStageCamera(
	pose: CameraPose,
	stock: CameraPose,
	aspect: number,
): CameraPose {
	const portrait =
		1 -
		smoothstep(LITE_FRAMING.portraitTo, LITE_FRAMING.portraitFrom, aspect)
	if (portrait <= 0) return stock
	if (portrait >= 1) return pose
	return {
		position: lerp(stock.position, pose.position, portrait),
		target: lerp(stock.target, pose.target, portrait),
		fov: mix(stock.fov, pose.fov, portrait),
	}
}

/** Lite mode: the hero camera, the start of the lite dive. */
export function liteHeroCamera(aspect: number): CameraPose {
	return liteStageCamera(LITE_CAMERAS.hero, HERO_CAMERA, aspect)
}

/** Lite mode and the portrait dawn poster: the dawn camera, the end of the lite pull-back. */
export function liteDawnCamera(aspect: number): CameraPose {
	return liteStageCamera(LITE_CAMERAS.dawn, DAWN_CAMERA, aspect)
}

/**
 * Lite mode: the camera at the end of the dive, the exact fit with no
 * overshoot. The screen's page column (`columnCorners`) lands on the
 * viewport precisely, so the warped section docks onto the real one.
 */
export function liteEndCamera(): CameraPose {
	return endCamera(1)
}

/**
 * Lite mode: the dive, a straight push from the lite hero camera to the
 * exact fit on the full dive's progress map, the field of view narrowing to
 * the fit's.
 */
export function liteDiveCamera(p: number, aspect: number): CameraPose {
	const start = liteHeroCamera(aspect)
	if (p <= DIVE.hold) return start
	const end = liteEndCamera()
	if (p >= DIVE.travelEnd) return end
	const t = easeInOutCubic(unlerp(DIVE.hold, DIVE.travelEnd, p))
	return {
		position: lerp(start.position, end.position, t),
		target: lerp(start.target, end.target, clamp01(t / DIVE.targetLock)),
		fov: mix(start.fov, end.fov, t),
	}
}

/** Lite mode: the pull-back from the exact fit to the lite dawn camera, bowed around the desk, on the full finale's progress map. */
export function liteFinaleCamera(p: number, aspect: number): CameraPose {
	const start = liteEndCamera()
	if (p <= FINALE.undock) return start
	const end = liteDawnCamera(aspect)
	if (p >= FINALE.pullBackEnd) return end
	const t = easeInOutCubic(unlerp(FINALE.undock, FINALE.pullBackEnd, p))
	return {
		position: bezier2(
			start.position,
			add(lerp(start.position, end.position, 0.5), LITE_FINALE_BOW),
			end.position,
			t,
		),
		target: lerp(start.target, end.target, t),
		fov: mix(start.fov, end.fov, t),
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

/**
 * The finale portal's progress in the dive's terms (plan §3.5): identity at
 * the start of the stage, the docking lerp run backwards over the undock
 * stretch, the bare projected quad once the camera pulls back.
 */
export function finaleUndock(finaleProgress: number): number {
	if (finaleProgress <= 0) return 1
	if (finaleProgress >= FINALE.undock) return DIVE.dock
	return 1 - (1 - DIVE.dock) * (finaleProgress / FINALE.undock)
}

/** Tail flick progress during the dive: 0 before, 1 after, eased between. */
export function tailFlick(diveProgress: number): number {
	const [from, to] = DIVE.tailFlick
	return smoothstep(from, to, diveProgress)
}

export type { Vec3 }
