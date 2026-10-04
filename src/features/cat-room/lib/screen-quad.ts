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
	const [cx, cy, cz] = SCREEN.center
	const hw = screenWidth(viewportAspect) / 2
	const hh = SCREEN.height / 2
	return [
		[cx - hw, cy + hh, cz],
		[cx + hw, cy + hh, cz],
		[cx + hw, cy - hh, cz],
		[cx - hw, cy - hh, cz],
	]
}

/** The screen as seen by `cam`, in CSS pixels, or null when a corner is behind the camera. */
export function projectScreen(
	cam: CameraPose,
	width: number,
	height: number,
): Quad | null {
	const corners = screenCorners(width / height).map((corner) =>
		projectPoint(corner, cam, width, height),
	)
	if (corners.some((corner) => corner === null)) return null
	return corners as unknown as Quad
}
