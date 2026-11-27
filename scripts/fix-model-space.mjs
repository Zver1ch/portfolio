/**
 * Puts the cat's skinned meshes into the space its skin was bound in.
 *
 *   node scripts/fix-model-space.mjs <input.glb> <output.glb>
 *
 * Sketchfab exported the avatar with one skin but two vertex scales: the two
 * bow meshes sit in the skin's bind space, while the body, the fur, the black
 * details and the stockings are stored 26.76 times smaller, about the same
 * origin. Rendered as is (three.js, the glTF sample viewer, Blender), the
 * body collapses to a 7 cm blob at the feet of a 1.75 m skeleton with a bow
 * floating at neck height.
 *
 * The factor was calibrated on the source file against bone positions: with
 * 26.76 the lowest body vertex meets the `Foot_L_end` leaf, the highest ear
 * vertex meets `Ear_L.002_end`, the pupils sit on the eye bones, each leg's
 * cross-section is centred on its joints and the stockings wrap the legs with
 * a 4% gap (see `assets/models/README.md`). Positions are multiplied in
 * place; nothing else in the file changes. Run it on an uncompressed file,
 * before `meshopt`.
 */

import { writeFileSync } from 'node:fs'
import {
	readGlb,
	scaleAccessorInPlace,
	serializeGlb,
	skinnedBounds,
	worldMatrices,
} from './lib/glb.mjs'

/** Vertex scale per mesh name; meshes not listed are left alone. */
export const BIND_SPACE_SCALE = {
	'Stockings_Glossy Black Plastic_0': 26.76,
	Stockings_Material_0: 26.76,
	boykisser_Material_0: 26.76,
	'boykisser_fur 2_0': 26.76,
	'boykisser_Glossy Black Plastic_0': 26.76,
}

const [input, output] = process.argv.slice(2)
if (!input || !output) {
	console.error(
		'usage: node scripts/fix-model-space.mjs <input.glb> <output.glb>',
	)
	process.exit(2)
}

const glb = readGlb(input)
const { json } = glb
const scaledAccessors = new Map()
for (const mesh of json.meshes) {
	const factor = BIND_SPACE_SCALE[mesh.name]
	if (!factor) continue
	for (const primitive of mesh.primitives) {
		const accessor = primitive.attributes.POSITION
		const previous = scaledAccessors.get(accessor)
		if (previous === factor) continue
		if (previous !== undefined)
			throw new Error(
				`POSITION accessor ${accessor} is shared by meshes with different factors`,
			)
		scaleAccessorInPlace(glb, accessor, factor)
		scaledAccessors.set(accessor, factor)
	}
}

const worlds = worldMatrices(json)
const fmt = (v) => v.map((n) => n.toFixed(3)).join(', ')
for (const mesh of json.meshes) {
	const node = json.nodes.find(
		(n) => n.mesh === json.meshes.indexOf(mesh) && n.skin !== undefined,
	)
	if (!node) continue
	const bounds = skinnedBounds(glb, mesh.primitives[0], node.skin, worlds)
	console.log(
		`${mesh.name.padEnd(36)} ×${String(BIND_SPACE_SCALE[mesh.name] ?? 1).padEnd(6)} bind-pose bounds (${fmt(bounds.min)}) – (${fmt(bounds.max)})`,
	)
}

writeFileSync(output, serializeGlb(json, glb.bin))
console.log(
	`${input} → ${output} (${scaledAccessors.size} position accessors rescaled)`,
)
