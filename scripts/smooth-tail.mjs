/**
 * Gives the cat's tail a bendable tuft and smooth skinning.
 *
 *   node scripts/smooth-tail.mjs <input.glb> <output.glb>
 *
 * As authored, the pink tuft runs 0.4 m (source metres) past the last tail
 * bone and follows it rigidly, and nearly every tail vertex is bound to a
 * single bone, so any curl shows as a chain of kinks with a stiff plank at
 * the end. This script
 *
 * - adds the joints `Tail.004`, `Tail.005` and the leaf `Tail.005_end`
 *   along the tuft's axis (children of `Tail.003`, same bind orientation),
 *   with inverse bind matrices derived from `Tail.003`'s so the bind pose
 *   is unchanged;
 * - re-skins every vertex whose dominant joint is a tail joint: its weight
 *   is split between the two joints of the chain segment it projects onto,
 *   linearly along the segment, so bends spread over the length.
 *
 * Positions never change. Run it after `tuck-stockings`, before `meshopt`;
 * `pnpm assets:inspect --write-rig` then records the new joints.
 */

import { writeFileSync } from 'node:fs'
import { normalizeBoneName } from '../src/features/cat-room/lib/bone-names.ts'
import {
	appendFloatAccessor,
	invertMatrix4,
	multiply,
	readAccessor,
	readGlb,
	serializeGlb,
	writeAccessorElement,
} from './lib/glb.mjs'

/** New joints: name and length to the next joint, in the parent bone's local units. */
const NEW_JOINTS = [
	{ name: 'Tail.004', length: 0.51 },
	{ name: 'Tail.005', length: 0.51 },
	{ name: 'Tail.005_end', length: 0 },
]
const CHAIN = ['tailroot', 'tail', 'tail001', 'tail002', 'tail003']

const [input, output] = process.argv.slice(2)
if (!input || !output) {
	console.error(
		'usage: node scripts/smooth-tail.mjs <input.glb> <output.glb>',
	)
	process.exit(2)
}

const glb = readGlb(input)
const { json } = glb
const skin = json.skins[0]
const jointOf = (key) =>
	skin.joints.findIndex(
		(node) => normalizeBoneName(json.nodes[node].name ?? '') === key,
	)
const inverseBinds = Array.from(readAccessor(glb, skin.inverseBindMatrices))
const ibmOf = (joint) => inverseBinds.slice(joint * 16, joint * 16 + 16)

// 1. New joints along the tuft, hanging off Tail.003 where its leaf sits.
const tail003Joint = jointOf('tail003')
const tail003Node = skin.joints[tail003Joint]
const leafNode = json.nodes[tail003Node].children.find(
	(child) => normalizeBoneName(json.nodes[child].name) === 'tail003_end',
)
let parentNode = tail003Node
let parentIbm = ibmOf(tail003Joint)
let offset = json.nodes[leafNode].translation[1]
const added = []
for (const { name, length } of NEW_JOINTS) {
	const node = {
		name: `${name}_${json.nodes.length}`,
		translation: [0, offset, 0],
	}
	json.nodes.push(node)
	const nodeIndex = json.nodes.length - 1
	json.nodes[parentNode].children = [
		...(json.nodes[parentNode].children ?? []),
		nodeIndex,
	]
	// A child joint rigid with its parent in the bind pose: IBM = T(-local) × IBM(parent).
	const toParent = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -offset, 0, 1]
	const ibm = multiply(toParent, parentIbm)
	skin.joints.push(nodeIndex)
	inverseBinds.push(...ibm)
	added.push(name)
	parentNode = nodeIndex
	parentIbm = ibm
	offset = length
}
skin.inverseBindMatrices = appendFloatAccessor(
	glb,
	new Float32Array(inverseBinds),
	'MAT4',
)

// 2. Smooth weights along the chain, in bind space.
const chainKeys = [...CHAIN, 'tail004', 'tail005', 'tail005_end']
const chainJoints = chainKeys.map(jointOf)
if (chainJoints.some((joint) => joint < 0))
	throw new Error('tail chain incomplete')
const points = chainJoints.map((joint) => {
	const bind = invertMatrix4(ibmOf(joint))
	return [bind[12], bind[13], bind[14]]
})
const tailJoints = new Set(chainJoints.slice(0, -1))
const segments = points.length - 1
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

let reskinned = 0
for (const mesh of json.meshes) {
	for (const primitive of mesh.primitives) {
		const { POSITION, JOINTS_0, WEIGHTS_0 } = primitive.attributes
		if (JOINTS_0 === undefined) continue
		const positions = readAccessor(glb, POSITION)
		const joints = readAccessor(glb, JOINTS_0)
		const weights = readAccessor(glb, WEIGHTS_0)
		const count = json.accessors[POSITION].count
		for (let v = 0; v < count; v++) {
			let dominant = -1
			let best = 0
			for (let c = 0; c < 4; c++) {
				const w = weights[v * 4 + c]
				if (w > best) {
					best = w
					dominant = joints[v * 4 + c]
				}
			}
			if (!tailJoints.has(dominant)) continue
			const p = [
				positions[v * 3],
				positions[v * 3 + 1],
				positions[v * 3 + 2],
			]
			// Closest segment of the chain and the parameter along it.
			let bestSegment = 0
			let bestT = 0
			let bestDistance = Infinity
			for (let k = 0; k < segments; k++) {
				const a = points[k]
				const d = sub(points[k + 1], a)
				const len2 = dot(d, d)
				const t =
					len2 > 0
						? Math.min(1, Math.max(0, dot(sub(p, a), d) / len2))
						: 0
				const q = [a[0] + d[0] * t, a[1] + d[1] * t, a[2] + d[2] * t]
				const distance = dot(sub(p, q), sub(p, q))
				if (distance < bestDistance) {
					bestDistance = distance
					bestSegment = k
					bestT = t
				}
			}
			const from = chainJoints[bestSegment]
			// The last segment belongs to the last real bone: leaves are never posed.
			const to =
				bestSegment + 1 < chainJoints.length - 1
					? chainJoints[bestSegment + 1]
					: from
			const w = to === from ? 0 : bestT
			writeAccessorElement(glb, JOINTS_0, v, [from, to, 0, 0])
			writeAccessorElement(glb, WEIGHTS_0, v, [1 - w, w, 0, 0])
			reskinned++
		}
	}
}

writeFileSync(output, serializeGlb(json, glb.bin))
console.log(
	`${input} → ${output}: joints ${added.join(', ')} added (${skin.joints.length} in the skin), ${reskinned} tail vertices re-skinned over ${segments} segments`,
)
