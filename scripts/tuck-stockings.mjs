/**
 * Tucks the cat's legs into their stockings.
 *
 *   node scripts/tuck-stockings.mjs <input.glb> <output.glb>
 *
 * The stockings are a separate skinned mesh with rings 5–6 cm apart, while
 * the white leg under them is far denser. Both follow the same bones, but on
 * a bent knee the sparse stocking cuts the corner with a straight chord and
 * the dense leg follows the arc, so a white kneecap pokes through the black.
 * The leg under a stocking is never visible, so this script pulls those body
 * vertices towards the leg's axis by `TUCK`; nothing else in the file
 * changes. Run it after `fix-model-space`, before `meshopt`.
 */

import { writeFileSync } from 'node:fs'
import { normalizeBoneName } from '../src/features/cat-room/lib/bone-names.ts'
import {
	invertMatrix4,
	mapAccessorInPlace,
	readAccessor,
	readGlb,
	serializeGlb,
	worldMatrices,
} from './lib/glb.mjs'

const BODY_MESH = 'boykisser_Material_0'
const STOCKING_MESHES = [
	'Stockings_Glossy Black Plastic_0',
	'Stockings_Material_0',
]
/** Radial scale of the covered leg about its axis. */
export const TUCK = 0.7
/** Body vertices this far from the leg's axis count as the leg, metres. */
const LEG_REACH = 0.12
/** Keep the leg intact this close to the stocking's top and bottom edges, metres. */
const EDGE_MARGIN = 0.02

const [input, output] = process.argv.slice(2)
if (!input || !output) {
	console.error(
		'usage: node scripts/tuck-stockings.mjs <input.glb> <output.glb>',
	)
	process.exit(2)
}

const glb = readGlb(input)
const { json } = glb

// Vertices live in the skin's bind space, whose unit is not the scene metre.
// A joint's bind-space position is the translation of its inverted inverse
// bind matrix; the bind unit follows from the hip-to-ankle distance measured
// in both spaces (the bind matrices carry a non-uniform scale, so their
// columns cannot be trusted for that).
const skin = json.skins[0]
const inverseBinds = readAccessor(glb, skin.inverseBindMatrices)
const worlds = worldMatrices(json)
const joint = (key) => {
	const index = skin.joints.findIndex(
		(node) => normalizeBoneName(json.nodes[node].name ?? '') === key,
	)
	if (index < 0) throw new Error(`no joint for bone ${key}`)
	const bind = invertMatrix4(
		inverseBinds.subarray(index * 16, index * 16 + 16),
	)
	const world = worlds[skin.joints[index]]
	return {
		bind: [bind[12], bind[13], bind[14]],
		world: [world[12], world[13], world[14]],
	}
}
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const meshByName = (name) => {
	const mesh = json.meshes.find((candidate) => candidate.name === name)
	if (!mesh) throw new Error(`no mesh ${name}`)
	return mesh
}

// Per side: the leg's axis (hip to ankle, vertical in the bind pose) and the
// stocking's vertical extent on that side.
const legs = ['l', 'r'].map((side) => {
	const hipJoint = joint(`leg_${side}`)
	const ankleJoint = joint(`foot_${side}`)
	const hip = hipJoint.bind
	const ankle = ankleJoint.bind
	const unitsPerMetre =
		distance(hip, ankle) / distance(hipJoint.world, ankleJoint.world)
	let top = -Infinity
	let bottom = Infinity
	for (const name of STOCKING_MESHES) {
		for (const primitive of meshByName(name).primitives) {
			const positions = readAccessor(glb, primitive.attributes.POSITION)
			for (let i = 0; i < positions.length; i += 3) {
				if (Math.sign(positions[i]) !== Math.sign(hip[0])) continue
				top = Math.max(top, positions[i + 1])
				bottom = Math.min(bottom, positions[i + 1])
			}
		}
	}
	return {
		side,
		hip,
		ankle,
		top,
		bottom,
		unitsPerMetre,
		reach: LEG_REACH * unitsPerMetre,
		margin: EDGE_MARGIN * unitsPerMetre,
	}
})

let tucked = 0
for (const primitive of meshByName(BODY_MESH).primitives) {
	mapAccessorInPlace(glb, primitive.attributes.POSITION, ([x, y, z]) => {
		for (const leg of legs) {
			if (y < leg.bottom + leg.margin || y > leg.top - leg.margin)
				continue
			// Axis point at this height (the legs stand straight in the bind pose).
			const t = (y - leg.ankle[1]) / (leg.hip[1] - leg.ankle[1])
			const ax = leg.ankle[0] + (leg.hip[0] - leg.ankle[0]) * t
			const az = leg.ankle[2] + (leg.hip[2] - leg.ankle[2]) * t
			const dx = x - ax
			const dz = z - az
			if (Math.hypot(dx, dz) > leg.reach) continue
			tucked++
			return [ax + dx * TUCK, y, az + dz * TUCK]
		}
		return [x, y, z]
	})
}

for (const leg of legs) {
	const m = (v) => (v / leg.unitsPerMetre).toFixed(3)
	console.log(
		`leg ${leg.side}: hip (${m(leg.hip[0])}, ${m(leg.hip[1])}, ${m(leg.hip[2])}) m, ankle y ${m(leg.ankle[1])} m, stocking y ${m(leg.bottom)}–${m(leg.top)} m, ${leg.unitsPerMetre.toFixed(1)} bind units per metre`,
	)
}
writeFileSync(output, serializeGlb(json, glb.bin))
console.log(`${input} → ${output} (${tucked} body vertices tucked by ×${TUCK})`)
