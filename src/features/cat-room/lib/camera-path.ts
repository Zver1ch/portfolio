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
	length,
	lerp,
	normalize,
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
	LITE_FRAMING,
	LITE_PULLBACK,
} from '../config/camera-tracks'
import { DESK_TOP, SCREEN } from '../config/room-layout'

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
 * Lite mode (plan §3.4): a stage camera for a narrow viewport. Landscape
 * viewports keep the stock pose. Portrait ones back the camera off along its
 * own line of sight by `max(1, LITE_PULLBACK / aspect)`, so the desk fits the
 * width, and aim it lower, so the desk top sits at `deskShare` of the frame
 * and the bottom is free for the name or the credits; the aim blends back to
 * the stock one towards a square window.
 */
function liteStageCamera(
	stock: CameraPose,
	aspect: number,
	deskShare: number,
): CameraPose {
	const factor = Math.max(1, LITE_PULLBACK / aspect)
	// Wide viewports keep the camera as is (no rounding through the maths).
	if (factor === 1) return stock
	const offset = sub(stock.position, stock.target)
	const distance = length(offset) * factor
	const fieldHeight = 2 * distance * Math.tan((stock.fov * Math.PI) / 360)
	const portrait =
		1 -
		smoothstep(LITE_FRAMING.portraitTo, LITE_FRAMING.portraitFrom, aspect)
	const target: Vec3 = [
		stock.target[0],
		mix(
			stock.target[1],
			DESK_TOP - (0.5 - deskShare) * fieldHeight,
			portrait,
		),
		stock.target[2],
	]
	return {
		...stock,
		position: add(target, scale(normalize(offset), distance)),
		target,
	}
}

/** Lite mode: the hero camera, the start of the lite dive. */
export function liteHeroCamera(aspect: number): CameraPose {
	return liteStageCamera(HERO_CAMERA, aspect, LITE_FRAMING.deskShare.hero)
}

/** Lite mode and the portrait dawn poster: the dawn camera, the end of the lite pull-back. */
export function liteDawnCamera(aspect: number): CameraPose {
	return liteStageCamera(DAWN_CAMERA, aspect, LITE_FRAMING.deskShare.dawn)
}

/**
 * Lite mode: the camera at the end of the dive, the exact fit with no
 * overshoot. The screen's page column (`columnCorners`) lands on the
 * viewport precisely, so the painted page can crossfade into the real one.
 */
export function liteEndCamera(): CameraPose {
	return endCamera(1)
}

/** Lite mode: the dive from the lite hero camera to the exact fit, on the full dive's progress map. */
export function liteDiveCamera(p: number, aspect: number): CameraPose {
	const start = liteHeroCamera(aspect)
	const end = liteEndCamera()
	if (p <= DIVE.hold) return start
	if (p >= DIVE.travelEnd) return end
	const t = easeInOutCubic(unlerp(DIVE.hold, DIVE.travelEnd, p))
	return {
		position: bezier2(
			start.position,
			add(lerp(start.position, end.position, 0.5), LITE_FRAMING.diveBow),
			end.position,
			t,
		),
		target: lerp(start.target, end.target, clamp01(t / DIVE.targetLock)),
		fov: start.fov,
	}
}

/** Lite mode: the pull-back from the exact fit to the lite dawn camera, on the full finale's progress map. */
export function liteFinaleCamera(p: number, aspect: number): CameraPose {
	const start = liteEndCamera()
	const end = liteDawnCamera(aspect)
	if (p <= FINALE.undock) return start
	if (p >= FINALE.pullBackEnd) return end
	const t = easeInOutCubic(unlerp(FINALE.undock, FINALE.pullBackEnd, p))
	return {
		position: bezier2(
			start.position,
			lerp(start.position, end.position, 0.5),
			end.position,
			t,
		),
		target: lerp(start.target, end.target, t),
		fov: mix(start.fov, end.fov, t),
	}
}

/**
 * Lite mode: the layer's opacity over a stage, the crossfade between the
 * page painted on the monitor and the real page under the canvas. The dive
 * fades the room out over its docking stretch, once the camera has arrived;
 * the finale fades it in over the undock stretch, before the camera moves.
 */
export function liteFade(track: Track, p: number): number {
	return track === 'dive'
		? 1 - smoothstep(DIVE.dock, 1, p)
		: smoothstep(0, FINALE.undock, p)
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
