import { clamp } from '@/shared/lib/math/ease'
import { type CameraPose, projectPoint } from '@/shared/lib/math/projection'
import type { Vec2, Vec3 } from '@/shared/lib/math/vec3'
import { SCREEN } from '../config/room-layout'

/** Corner order everywhere: top-left, top-right, bottom-right, bottom-left. */
export type Quad = readonly [Vec2, Vec2, Vec2, Vec2]

/** The monitor takes the viewport's aspect, so the dive ends exactly at identity. */
export function screenAspect(viewportAspect: number): number {
	return clamp(viewportAspect, SCREEN.aspectRange[0], SCREEN.aspectRange[1])
}

export function screenWidth(viewportAspect: number): number {
	return SCREEN.height * screenAspect(viewportAspect)
}

/** World corners of the screen quad (facing +Z) for a viewport aspect. */
export function screenCorners(
	viewportAspect: number,
): readonly [Vec3, Vec3, Vec3, Vec3] {
	return cornersOf(screenWidth(viewportAspect))
}

/**
 * Lite mode (plan §3.4): the part of the screen that stands in for the page,
 * a column of the screen's height in the viewport's own aspect, centred. On
 * landscape viewports it is the whole screen; a phone sees a narrow page in
 * the middle of the monitor, and the dive ends with that column on the
 * viewport exactly.
 */
export function columnWidth(viewportAspect: number): number {
	return Math.min(screenWidth(viewportAspect), SCREEN.height * viewportAspect)
}

export function columnCorners(
	viewportAspect: number,
): readonly [Vec3, Vec3, Vec3, Vec3] {
	return cornersOf(columnWidth(viewportAspect))
}

function cornersOf(width: number): readonly [Vec3, Vec3, Vec3, Vec3] {
	const [cx, cy, cz] = SCREEN.center
	const hw = width / 2
	const hh = SCREEN.height / 2
	return [
		[cx - hw, cy + hh, cz],
		[cx + hw, cy + hh, cz],
		[cx + hw, cy - hh, cz],
		[cx - hw, cy - hh, cz],
	]
}

/** The page column as seen by `cam`, in CSS pixels (the lite dive's docking check). */
export function projectColumn(
	cam: CameraPose,
	width: number,
	height: number,
): Quad | null {
	return projectQuad(columnCorners(width / height), cam, width, height)
}

/** The screen as seen by `cam`, in CSS pixels, or null when a corner is behind the camera. */
export function projectScreen(
	cam: CameraPose,
	width: number,
	height: number,
): Quad | null {
	return projectQuad(screenCorners(width / height), cam, width, height)
}

function projectQuad(
	world: readonly [Vec3, Vec3, Vec3, Vec3],
	cam: CameraPose,
	width: number,
	height: number,
): Quad | null {
	const corners = world.map((corner) =>
		projectPoint(corner, cam, width, height),
	)
	if (corners.some((corner) => corner === null)) return null
	return corners as unknown as Quad
}
