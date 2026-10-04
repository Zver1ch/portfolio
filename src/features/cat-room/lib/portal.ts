import { clamp01, unlerp } from '@/shared/lib/math/ease'
import {
	matrix3dValue,
	type Quad,
	quadToMatrix3d,
} from '@/shared/lib/math/homography'
import type { Vec2 } from '@/shared/lib/math/vec3'
import { DIVE } from '../config/camera-tracks'

export type Portal = {
	element: HTMLElement
	/**
	 * Warp the portal box onto `quad` (CSS px of the stage, TL TR BR BL) for
	 * a dive progress. Docking lerps the corners to the viewport over the
	 * last stretch; at `p >= 1` the properties are removed, so text
	 * re-rasterises crisp and the computed transform is `none`. A null or
	 * degenerate quad keeps the previous matrix.
	 */
	apply(quad: Quad | null, p: number, width: number, height: number): void
	/** Identity: the page as it is. */
	dock(): void
}

/** Plan §3.5: the DOM warp of one portal element, `transform-origin: 0 0`. */
export function createPortal(element: HTMLElement): Portal {
	element.style.transformOrigin = '0 0'
	let docked = true
	const dock = () => {
		if (docked) return
		docked = true
		element.style.removeProperty('transform')
		element.style.removeProperty('will-change')
	}
	return {
		element,
		dock,
		apply(quad, p, width, height) {
			if (p >= 1) {
				dock()
				return
			}
			if (!quad) return
			const t = clamp01(unlerp(DIVE.dock, 1, p))
			const viewport: Quad = [
				[0, 0],
				[width, 0],
				[width, height],
				[0, height],
			]
			const corners = quad.map(
				(corner, i): Vec2 => [
					corner[0] + (viewport[i][0] - corner[0]) * t,
					corner[1] + (viewport[i][1] - corner[1]) * t,
				],
			) as unknown as Quad
			const matrix = quadToMatrix3d(corners, width, height)
			if (!matrix) return
			docked = false
			element.style.transform = matrix3dValue(matrix)
			element.style.willChange = p > 0 ? 'transform' : ''
		},
	}
}
