/**
 * Prints what is inside the cat model files and, with `--write-rig`, writes
 * the bone table the runtime indexes skeletons with.
 *
 *   pnpm assets:inspect                 report on the source and the shipped model
 *   pnpm assets:inspect --write-rig     also regenerate cat-rig.gen.ts from public/models/cat.glb
 *   pnpm assets:inspect path/to/a.glb   report on specific files
 *
 * Reads only the glTF JSON chunk and uncompressed vertex data: no three.js,
 * no glTF Transform. Meshopt-compressed files get the structural report only.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	RIG_FILE,
	renderRigModule,
	rigBones,
	rigFacts,
	SHIPPED_MODEL,
} from './lib/cat-rig.mjs'
import {
	influenceCounts,
	isCompressedAccessor,
	nodeParents,
	readGlb,
	skinnedBounds,
	triangleCount,
	worldMatrices,
} from './lib/glb.mjs'

const SOURCE_DIR = 'assets/models/source'
/** Joints whose weights decide what may be animated (plan §1.3 and §3.8). */
const WATCHED_KEYS = [
	'lefteye',
	'righteye',
	'jaw',
	'shoulder_l',
	'shoulder_r',
	'popka',
	'popka001',
	'neck',
	'tail003',
]

const args = process.argv.slice(2)
const writeRig = args.includes('--write-rig')
const files = args.filter((arg) => !arg.startsWith('--'))
if (files.length === 0) {
	if (existsSync(SOURCE_DIR))
		for (const name of readdirSync(SOURCE_DIR).sort())
			if (name.endsWith('.glb')) files.push(join(SOURCE_DIR, name))
	if (existsSync(SHIPPED_MODEL)) files.push(SHIPPED_MODEL)
}

const out = []
const print = (line = '') => out.push(line)
const num = (value) => value.toLocaleString('en-US')
const fixed = (value, digits = 3) =>
	(Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits)
const vec = (values, digits = 3) =>
	`(${values.map((v) => fixed(v, digits)).join(', ')})`

for (const file of files) report(file)

if (writeRig) {
	if (!existsSync(SHIPPED_MODEL))
		throw new Error(`${SHIPPED_MODEL} is missing: build it first (plan §5)`)
	const facts = rigFacts(readGlb(SHIPPED_MODEL))
	writeFileSync(RIG_FILE, renderRigModule(facts))
	const biome = spawnSync(
		'pnpm',
		['exec', 'biome', 'format', '--write', RIG_FILE],
		{
			stdio: 'inherit',
			shell: process.platform === 'win32',
		},
	)
	if (biome.status !== 0)
		throw new Error(`biome format failed for ${RIG_FILE}`)
	print(
		`Wrote ${RIG_FILE}: ${facts.bones.length} bones, ${num(facts.bytes)} bytes, sha256 ${facts.sha256}…`,
	)
}

console.log(out.join('\n'))

function report(file) {
	const glb = readGlb(file)
	const { json } = glb
	const compressed = Boolean(
		json.extensionsUsed?.includes('EXT_meshopt_compression'),
	)
	const worlds = worldMatrices(json)

	print(`## \`${file}\``)
	print()
	print(
		`- ${num(glb.byteLength)} bytes, SHA-256 \`${glb.sha256.slice(0, 16)}…\``,
	)
	print(`- generator: ${json.asset?.generator ?? '—'}`)
	for (const [key, value] of Object.entries(json.asset?.extras ?? {}))
		print(`- ${key}: ${value}`)
	print(
		`- extensionsUsed: ${(json.extensionsUsed ?? []).join(', ') || '—'}; extensionsRequired: ${(json.extensionsRequired ?? []).join(', ') || '—'}`,
	)
	print(
		`- nodes ${json.nodes.length}, meshes ${json.meshes.length}, materials ${(json.materials ?? []).length}, textures ${(json.textures ?? []).length}, skins ${(json.skins ?? []).length}, animations ${(json.animations ?? []).length}, morph targets ${json.meshes.reduce((n, m) => n + m.primitives.filter((p) => p.targets?.length).length, 0)}`,
	)
	if (compressed)
		print(
			'- vertex data is meshopt-compressed: bounds and weights are not decoded here',
		)
	print()

	print('### Meshes')
	print()
	print(
		'| # | Mesh | Triangles | Vertices | Material | Attributes | Bind-pose bounds (scene space) |',
	)
	print('|---|---|---|---|---|---|---|')
	let triangles = 0
	let vertices = 0
	const all = {
		min: [Infinity, Infinity, Infinity],
		max: [-Infinity, -Infinity, -Infinity],
	}
	json.meshes.forEach((mesh, index) => {
		for (const primitive of mesh.primitives) {
			const tris = triangleCount(json, primitive)
			const verts = json.accessors[primitive.attributes.POSITION].count
			triangles += tris
			vertices += verts
			const material = json.materials?.[primitive.material]?.name ?? '—'
			const attributes = Object.keys(primitive.attributes)
				.sort()
				.join(' ')
			const skinNode = json.nodes.find(
				(n) => n.mesh === index && n.skin !== undefined,
			)
			let bounds = '—'
			if (
				skinNode &&
				!isCompressedAccessor(json, primitive.attributes.POSITION)
			) {
				const b = skinnedBounds(glb, primitive, skinNode.skin, worlds)
				bounds = `${vec(b.min)} – ${vec(b.max)}`
				for (let i = 0; i < 3; i++) {
					all.min[i] = Math.min(all.min[i], b.min[i])
					all.max[i] = Math.max(all.max[i], b.max[i])
				}
			}
			print(
				`| ${index} | ${mesh.name} | ${num(tris)} | ${num(verts)} | ${material} | ${attributes} | ${bounds} |`,
			)
		}
	})
	print()
	print(`Total: ${num(triangles)} triangles, ${num(vertices)} vertices.`)
	if (Number.isFinite(all.min[0])) {
		const size = all.max.map((v, i) => v - all.min[i])
		print(
			`Bind-pose bounds of all meshes: ${vec(all.min)} – ${vec(all.max)}; size ${vec(size)} (height ${fixed(size[1])}, feet at y = ${fixed(all.min[1])}).`,
		)
	}
	print()

	print('### Materials')
	print()
	print('| Material | Unlit | Double-sided | Base colour (linear) | sRGB |')
	print('|---|---|---|---|---|')
	for (const material of json.materials ?? []) {
		const base = material.pbrMetallicRoughness?.baseColorFactor ?? [
			1, 1, 1, 1,
		]
		const hex = `#${base
			.slice(0, 3)
			.map((c) =>
				Math.round(linearToSrgb(c) * 255)
					.toString(16)
					.padStart(2, '0'),
			)
			.join('')}`
		print(
			`| ${material.name ?? '—'} | ${material.extensions?.KHR_materials_unlit ? 'yes' : 'no'} | ${material.doubleSided ? 'yes' : 'no'} | ${vec(base.slice(0, 3), 3)} | \`${hex}\` |`,
		)
	}
	print()

	const skin = json.skins?.[0]
	if (!skin) return
	const parents = nodeParents(json)
	print('### Skin')
	print()
	const rootNode = skin.skeleton ?? skin.joints[0]
	const chain = []
	for (let node = rootNode; node !== undefined; node = parents.get(node))
		chain.unshift(node)
	print(
		`- ${skin.joints.length} joints, skeleton root \`${json.nodes[rootNode].name}\``,
	)
	print(
		`- node chain to the root: ${chain
			.map(
				(node) =>
					`\`${json.nodes[node].name}\`${describeTransform(json.nodes[node])}`,
			)
			.join(' → ')}`,
	)
	const bones = rigBones(glb)
	const leaves = bones.filter((b) => b.key.endsWith('_end')).length
	print(
		`- ${bones.length - leaves} bones plus ${leaves} \`_end\` leaves; keys are unique`,
	)
	print()
	print('| # | Node | Key | Parent | Local translation |')
	print('|---|---|---|---|---|')
	skin.joints.forEach((node, index) => {
		const n = json.nodes[node]
		print(
			`| ${index} | ${n.name} | \`${bones[index].key}\` | ${bones[index].parent ? `\`${bones[index].parent}\`` : '—'} | ${n.translation ? vec(n.translation) : '—'} |`,
		)
	})
	print()

	if (compressed) return
	print('### Skin weights')
	print()
	print('Vertices influenced per joint (weight > 0), by mesh.')
	print()
	const keyOfJoint = bones.map((b) => b.key)
	const perMesh = json.meshes.map((mesh, index) => {
		const node = json.nodes.find(
			(n) => n.mesh === index && n.skin !== undefined,
		)
		return node ? influenceCounts(glb, mesh.primitives[0]) : new Map()
	})
	print(`| Joint | ${json.meshes.map((m) => m.name).join(' | ')} |`)
	print(`|---|${json.meshes.map(() => '---').join('|')}|`)
	const rows = new Set(WATCHED_KEYS)
	for (const key of keyOfJoint)
		if (
			/^(ear_|tail|hair|arm_|elbow_|wrist_|leg_|knee_|foot_|chest|hips|spine|head)/.test(
				key,
			) &&
			!key.endsWith('_end')
		)
			rows.add(key)
	const hair = json.meshes.map(() => 0)
	for (const key of rows) {
		const joint = keyOfJoint.indexOf(key)
		if (joint < 0) continue
		const counts = perMesh.map((m) => m.get(joint) ?? 0)
		if (key.startsWith('hair')) {
			counts.forEach((c, i) => {
				hair[i] += c
			})
			continue
		}
		print(`| \`${key}\` | ${counts.join(' | ')} |`)
	}
	print(`| all \`hair*\` | ${hair.join(' | ')} |`)
	print()
}

function describeTransform(node) {
	if (node.matrix) {
		const m = node.matrix
		const scale = [0, 1, 2].map((c) =>
			Math.hypot(m[c * 4], m[c * 4 + 1], m[c * 4 + 2]),
		)
		const uniform = scale.every((s) => Math.abs(s - scale[0]) < 1e-6)
		const rotated =
			Math.abs(m[5] - scale[1]) > 1e-6 ||
			Math.abs(m[10] - scale[2]) > 1e-6
		return ` (matrix: scale ${uniform ? fixed(scale[0], 4) : vec(scale, 4)}${rotated ? ', rotated' : ''})`
	}
	const parts = []
	if (node.translation) parts.push(`t ${vec(node.translation)}`)
	if (node.rotation) parts.push('rotated')
	if (node.scale?.some((s) => Math.abs(s - 1) > 1e-6))
		parts.push(`scale ${vec(node.scale)}`)
	return parts.length ? ` (${parts.join(', ')})` : ''
}

function linearToSrgb(c) {
	return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
}
