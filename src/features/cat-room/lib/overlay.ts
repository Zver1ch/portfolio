import { clamp } from '@/shared/lib/math/ease'
import type { Vec3 } from '@/shared/lib/math/vec3'
import { CAT_SPOT } from '../config/room-layout'
import { CAT_REST_HEIGHT, OVERLAY } from '../config/tuning'

/**
 * The overlay of the `inside` phase (plan §3.10): the cat stays where it is
 * in world metres and is seen through an orthographic camera whose frustum
 * is laid out in CSS pixels, so the page and the cat share one coordinate
 * system. A placement says where the cat's origin (its feet) lands on the
 * viewport and how many pixels a metre is.
 */
export type OverlayPlacement = {
	/** CSS px of the cat's origin; +y down. */
	origin: { x: number; y: number }
	/** CSS px per metre. */
	scale: number
}

export type Viewport = { width: number; height: number }
export type Point = { x: number; y: number }

/** Plan §3.10: the cat scaled to `clamp(0.9 * H, 520, 900)` px per metre. */
export function overlayScale(viewportHeight: number): number {
	return clamp(0.9 * viewportHeight, OVERLAY.minScale, OVERLAY.maxScale)
}

/**
 * A cat rising from the bottom edge at `xShare` of the width: `show` metres
 * of it stand above the edge at `rise` = 1, none at 0.
 */
export function risingPlacement(
	xShare: number,
	rise: number,
	show: number,
	viewport: Viewport,
): OverlayPlacement {
	const scale = overlayScale(viewport.height)
	return {
		origin: {
			x: xShare * viewport.width,
			y: viewport.height + (CAT_REST_HEIGHT - show * rise) * scale,
		},
		scale,
	}
}

/** World point of a CSS pixel in the overlay, `depth` metres in front of the cat's origin plane. */
export function overlayToWorld(
	point: Point,
	placement: OverlayPlacement,
	depth = 0,
): Vec3 {
	const [sx, sy, sz] = CAT_SPOT.position
	return [
		sx + (point.x - placement.origin.x) / placement.scale,
		sy + (placement.origin.y - point.y) / placement.scale,
		sz + depth,
	]
}

/** CSS pixel of a world point in the overlay (depth plays no part in an orthographic view). */
export function worldToOverlay(
	point: Vec3,
	placement: OverlayPlacement,
): Point {
	const [sx, sy] = CAT_SPOT.position
	return {
		x: placement.origin.x + (point[0] - sx) * placement.scale,
		y: placement.origin.y - (point[1] - sy) * placement.scale,
	}
}

/**
 * The orthographic frustum, in metres about a camera standing in front of
 * the cat's origin, that maps the viewport onto the placement.
 */
export function overlayFrustum(
	placement: OverlayPlacement,
	viewport: Viewport,
): { left: number; right: number; top: number; bottom: number } {
	const { origin, scale } = placement
	return {
		left: -origin.x / scale,
		right: (viewport.width - origin.x) / scale,
		top: origin.y / scale,
		bottom: -(viewport.height - origin.y) / scale,
	}
}

/** Where the overlay camera stands: in front of the cat's origin, looking at it. */
export function overlayCameraPosition(): Vec3 {
	const [sx, sy, sz] = CAT_SPOT.position
	return [sx, sy, sz + OVERLAY.cameraDistance]
}
