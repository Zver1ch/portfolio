import { type BufferGeometry, type Material, Mesh } from 'three'
import type { Vec3 } from '@/shared/lib/math/vec3'
import { mixHex, PALETTE as P, paint } from '../materials'
import { Kit } from '../room/kit'

/** A hand-sized fish (metres), nose towards +X, built like the room props. */
export const FISH_LENGTH = 0.12

const BODY = paint(
	mixHex(P.orchid, P.snow, 0.15),
	mixHex(P.orchid, P.blush, 0.3),
)
const FIN = paint(P.rose, mixHex(P.rose, P.blush, 0.3))
const EYE = paint(P.ink, P.ink)

export type FishMesh = {
	mesh: Mesh
	dispose(): void
}

/**
 * The fish the visitor drops (plan §3.10): a flattened body, a tail fin and
 * an eye, in the room's painted style and material, so it reads in night and
 * dawn alike. Hidden until a fish gag runs.
 */
export function createFishMesh(material: Material): FishMesh {
	const kit = new Kit()
	const l = FISH_LENGTH
	const body: Vec3 = [0, 0, 0]
	kit.box(body, [l * 0.58, l * 0.3, l * 0.16], BODY)
	kit.box([-l * 0.2, 0, 0], [l * 0.22, l * 0.18, l * 0.12], BODY)
	kit.box([l * 0.33, 0, 0], [l * 0.14, l * 0.2, l * 0.12], BODY)
	// Tail: two fins spread from the stub.
	kit.tri(
		[
			[-l * 0.3, 0, 0],
			[-l * 0.5, l * 0.2, 0],
			[-l * 0.44, 0, l * 0.02],
		],
		FIN,
	)
	kit.tri(
		[
			[-l * 0.3, 0, 0],
			[-l * 0.44, 0, l * 0.02],
			[-l * 0.5, -l * 0.2, 0],
		],
		FIN,
	)
	kit.tri(
		[
			[-l * 0.3, 0, 0],
			[-l * 0.44, 0, -l * 0.02],
			[-l * 0.5, l * 0.2, 0],
		],
		FIN,
	)
	kit.tri(
		[
			[-l * 0.3, 0, 0],
			[-l * 0.5, -l * 0.2, 0],
			[-l * 0.44, 0, -l * 0.02],
		],
		FIN,
	)
	// Dorsal fin and the eye on the side facing the visitor.
	kit.tri(
		[
			[l * 0.05, l * 0.15, 0],
			[-l * 0.12, l * 0.15, 0],
			[-l * 0.08, l * 0.27, 0],
		],
		FIN,
	)
	kit.box(
		[l * 0.18, l * 0.04, l * 0.085],
		[l * 0.04, l * 0.04, l * 0.01],
		EYE,
	)
	const geometry: BufferGeometry = kit.build()
	const mesh = new Mesh(geometry, material)
	mesh.visible = false
	mesh.frustumCulled = false
	return {
		mesh,
		dispose() {
			geometry.dispose()
		},
	}
}
