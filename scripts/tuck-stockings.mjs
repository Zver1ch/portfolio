/**
 * Tucks the cat's legs into their stockings.
 *
 *   node scripts/tuck-stockings.mjs <input.glb> <output.glb>
 *
 * The stockings are a separate skinned mesh laid over the white leg with
 * nearly the same ring layout, but the two were weighted separately: both
 * are rigid to a single bone almost everywhere, and the thigh/shin boundary
 * sits at different heights on each (around the knee the shin owns a band
 * of the leg that is still thigh on the stocking). On a bent knee that band
 * turns with the shin while the stocking around it turns with the thigh, and
 * a white kneecap pokes through the black. The leg under a stocking is never
 * visible, so this script
 *   1. gives every covered body vertex the skin weights of the nearest
 *      stocking vertex (the two meshes share their ring layout, so that is
 *      its twin), so the leg deforms exactly like the stocking around it,
 *      down to the pinch of the half-weighted knee rings, and
 *   2. collapses those vertices onto the leg's bones (radius × `TUCK`): on the
 *      inside of a bent knee the stocking pinches towards the joint, and any
 *      leg with a radius of its own shows through that fold. The feet keep
 *      their shape: the band stops at the ankles.
 * Nothing else in the file changes. Run it after `fix-model-space`, before
 * `meshopt`.
 */

import { writeFileSync } from 'node:fs'
import { normalizeBoneName } from '../src/features/cat-room/lib/bone-names.ts'
import {
	invertMatrix4,
	mapAccessorInPlace,
	nodeParents,
	readAccessor,
	readGlb,
	serializeGlb,
	worldMatrices,
	writeAccessorElement,
} from './lib/glb.mjs'

const BODY_MESH = 'boykisser_Material_0'
const STOCKING_MESHES = [
	'Stockings_Glossy Black Plastic_0',
	'Stockings_Material_0',
]
/** Radial scale of the covered leg about its bones: zero, a line has no face to show. */
export const TUCK = 0
/** Keep the leg intact this close to the stocking's top edge, metres. */
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
		index,
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

const parents = nodeParents(json)

// Per side: the leg's bones (hip, knee, ankle; the bind pose stands with the
// knee 5 cm ahead of the hip-to-ankle line) and the stocking's vertical
// extent on that side (its top bounds the band, its bottom is only reported).
const legs = ['l', 'r'].map((side) => {
	const hipJoint = joint(`leg_${side}`)
	const ankleJoint = joint(`foot_${side}`)
	const hip = hipJoint.bind
	const knee = joint(`knee_${side}`).bind
	const ankle = ankleJoint.bind
	// Every joint of this leg: the hip and its descendants.
	const hipNode = skin.joints[hipJoint.index]
	const joints = new Set()
	skin.joints.forEach((node, index) => {
		for (let n = node; n !== undefined; n = parents.get(n))
			if (n === hipNode) joints.add(index)
	})
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
		joints,
		hip,
		knee,
		ankle,
		top,
		bottom,
		unitsPerMetre,
		margin: EDGE_MARGIN * unitsPerMetre,
	}
})

/**
 * The leg a body vertex is covered by (it is skinned mostly to that leg's
 * bones and sits within the stocking's height), with the point on the bones
 * at that height; null elsewhere.
 */
const coveredBy = (y, joints, weights) => {
	for (const leg of legs) {
		if (y < leg.ankle[1] || y > leg.top - leg.margin) continue
		let share = 0
		for (let k = 0; k < 4; k++)
			if (leg.joints.has(joints[k])) share += weights[k]
		if (share < 0.5) continue
		// Point on the thigh or the shin at this height.
		const [from, to] =
			y >= leg.knee[1] ? [leg.knee, leg.hip] : [leg.ankle, leg.knee]
		const t = Math.min(Math.max((y - from[1]) / (to[1] - from[1]), 0), 1)
		const ax = from[0] + (to[0] - from[0]) * t
		const az = from[2] + (to[2] - from[2]) * t
		return { leg, ax, az }
	}
	return null
}

// Every stocking vertex with its skin weights, for the nearest-neighbour lookup.
const stockingVertices = []
for (const name of STOCKING_MESHES) {
	for (const primitive of meshByName(name).primitives) {
		const positions = readAccessor(glb, primitive.attributes.POSITION)
		const joints = readAccessor(glb, primitive.attributes.JOINTS_0)
		const weights = readAccessor(glb, primitive.attributes.WEIGHTS_0)
		for (let i = 0; i < positions.length / 3; i++) {
			stockingVertices.push({
				position: positions.subarray(i * 3, i * 3 + 3),
				joints: joints.subarray(i * 4, i * 4 + 4),
				weights: weights.subarray(i * 4, i * 4 + 4),
			})
		}
	}
}

/** The skin weights of the nearest stocking vertex of `leg`. */
const stockingWeightsAt = (x, y, z, leg) => {
	let nearest = null
	let best = Infinity
	for (const vertex of stockingVertices) {
		// The thighs touch: never take the other leg's stocking.
		if (Math.sign(vertex.position[0]) !== Math.sign(leg.hip[0])) continue
		const d = Math.hypot(
			vertex.position[0] - x,
			vertex.position[1] - y,
			vertex.position[2] - z,
		)
		if (d < best) {
			best = d
			nearest = vertex
		}
	}
	if (!nearest) throw new Error(`no stocking vertices on side ${leg.side}`)
	return { joints: [...nearest.joints], weights: [...nearest.weights] }
}

let reweighted = 0
let tucked = 0
for (const primitive of meshByName(BODY_MESH).primitives) {
	const positions = readAccessor(glb, primitive.attributes.POSITION)
	const joints = readAccessor(glb, primitive.attributes.JOINTS_0)
	const weights = readAccessor(glb, primitive.attributes.WEIGHTS_0)
	const coveredAt = (i, y) =>
		coveredBy(
			y,
			joints.subarray(i * 4, i * 4 + 4),
			weights.subarray(i * 4, i * 4 + 4),
		)
	// The original weights decide what is leg before any of them change.
	const covered = []
	for (let i = 0; i < positions.length / 3; i++)
		covered.push(coveredAt(i, positions[i * 3 + 1]))
	for (let i = 0; i < positions.length / 3; i++) {
		const [x, y, z] = positions.subarray(i * 3, i * 3 + 3)
		if (!covered[i]) continue
		const blended = stockingWeightsAt(x, y, z, covered[i].leg)
		writeAccessorElement(
			glb,
			primitive.attributes.JOINTS_0,
			i,
			blended.joints,
		)
		writeAccessorElement(
			glb,
			primitive.attributes.WEIGHTS_0,
			i,
			blended.weights,
		)
		reweighted++
	}
	let index = 0
	mapAccessorInPlace(glb, primitive.attributes.POSITION, ([x, y, z]) => {
		const hit = covered[index++]
		if (!hit) return [x, y, z]
		tucked++
		const { ax, az } = hit
		return [ax + (x - ax) * TUCK, y, az + (z - az) * TUCK]
	})
}

for (const leg of legs) {
	const m = (v) => (v / leg.unitsPerMetre).toFixed(3)
	console.log(
		`leg ${leg.side}: hip (${m(leg.hip[0])}, ${m(leg.hip[1])}, ${m(leg.hip[2])}) m, ankle y ${m(leg.ankle[1])} m, stocking y ${m(leg.bottom)}–${m(leg.top)} m, ${leg.unitsPerMetre.toFixed(1)} bind units per metre`,
	)
}
writeFileSync(output, serializeGlb(json, glb.bin))
console.log(
	`${input} → ${output} (${reweighted} body vertices given the stocking's weights, ${tucked} tucked by ×${TUCK})`,
)
