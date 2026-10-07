import {
	BufferAttribute,
	BufferGeometry,
	DoubleSide,
	Mesh,
	type ShaderMaterial,
} from 'three'
import type { Quad } from '@/shared/lib/math/homography'
import { type CameraPose, unprojectPoint } from '@/shared/lib/math/projection'
import { CAMERA_NEAR } from '../../../config/camera-tracks'
import { createHoleMaterial } from '../materials'

/** Just past the near plane: nothing in the room is ever that close. */
const DEPTH = CAMERA_NEAR * 1.6

export type CardHole = {
	mesh: Mesh
	/** Cover `quad` (CSS px of the viewport) with a hole, or hide it. */
	set(
		quad: Quad | null,
		camera: CameraPose,
		width: number,
		height: number,
	): void
	dispose(): void
}

/**
 * Phone variant `c` (Gate 2 round 6): a quad on the near plane with the
 * monitor's hole material, drawn first, so the canvas is transparent and
 * nothing of the room is drawn wherever the page card lies. The DOM card
 * under the layer is warped onto the same corners by the director.
 */
export function createCardHole(): CardHole {
	const geometry = new BufferGeometry()
	geometry.setAttribute(
		'position',
		new BufferAttribute(new Float32Array(12), 3),
	)
	// TL BL BR, TL BR TR: counter-clockwise as seen from the camera.
	geometry.setIndex([0, 3, 2, 0, 2, 1])
	const material: ShaderMaterial = createHoleMaterial()
	material.side = DoubleSide
	const mesh = new Mesh(geometry, material)
	mesh.renderOrder = -2
	mesh.frustumCulled = false
	mesh.visible = false
	return {
		mesh,
		set(quad, camera, width, height) {
			mesh.visible = quad !== null
			if (!quad) return
			const positions = geometry.getAttribute(
				'position',
			) as BufferAttribute
			quad.forEach((corner, i) => {
				const [x, y, z] = unprojectPoint(
					corner,
					camera,
					width,
					height,
					DEPTH,
				)
				positions.setXYZ(i, x, y, z)
			})
			positions.needsUpdate = true
		},
		dispose() {
			geometry.dispose()
			material.dispose()
		},
	}
}
