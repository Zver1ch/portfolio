/**
 * Dependency-free reader for glTF binary files (.glb).
 *
 * Parses the JSON chunk, reads uncompressed accessors and evaluates the node
 * hierarchy, which is enough to inspect meshes, materials and skins without
 * three.js or the glTF Transform SDK. Buffer views compressed with
 * EXT_meshopt_compression are reported but never decoded.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const GLB_MAGIC = 0x46546c67 // 'glTF'
const CHUNK_JSON = 0x4e4f534a
const CHUNK_BIN = 0x004e4942

const COMPONENT_ARRAYS = {
	5120: Int8Array,
	5121: Uint8Array,
	5122: Int16Array,
	5123: Uint16Array,
	5125: Uint32Array,
	5126: Float32Array,
}

const COMPONENT_COUNTS = {
	SCALAR: 1,
	VEC2: 2,
	VEC3: 3,
	VEC4: 4,
	MAT2: 4,
	MAT3: 9,
	MAT4: 16,
}

const NORMALIZED_DIVISORS = {
	5120: 127,
	5121: 255,
	5122: 32767,
	5123: 65535,
}

/**
 * @typedef {object} Glb
 * @property {any} json The glTF document (the JSON chunk).
 * @property {Uint8Array | null} bin The binary chunk, when present.
 * @property {number} byteLength Size of the whole file.
 * @property {string} sha256 Hex digest of the whole file.
 */

/**
 * @param {Uint8Array} bytes
 * @returns {Glb}
 */
export function parseGlb(bytes) {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
	if (bytes.byteLength < 12 || view.getUint32(0, true) !== GLB_MAGIC)
		throw new Error('Not a GLB file (bad magic)')
	const version = view.getUint32(4, true)
	if (version !== 2) throw new Error(`Unsupported GLB version ${version}`)
	const total = view.getUint32(8, true)
	let offset = 12
	let json
	let bin = null
	while (offset + 8 <= Math.min(total, bytes.byteLength)) {
		const length = view.getUint32(offset, true)
		const type = view.getUint32(offset + 4, true)
		const chunk = bytes.subarray(offset + 8, offset + 8 + length)
		if (type === CHUNK_JSON)
			json = JSON.parse(new TextDecoder().decode(chunk))
		else if (type === CHUNK_BIN) bin = chunk
		offset += 8 + length
	}
	if (!json) throw new Error('GLB has no JSON chunk')
	return {
		json,
		bin,
		byteLength: bytes.byteLength,
		sha256: createHash('sha256').update(bytes).digest('hex'),
	}
}

/**
 * @param {string} path
 * @returns {Glb}
 */
export function readGlb(path) {
	return parseGlb(new Uint8Array(readFileSync(path)))
}

/**
 * True when the accessor's data cannot be read without a decoder.
 * @param {any} json
 * @param {number} accessorIndex
 */
export function isCompressedAccessor(json, accessorIndex) {
	const accessor = json.accessors[accessorIndex]
	if (accessor.bufferView === undefined) return false
	const bufferView = json.bufferViews[accessor.bufferView]
	return Boolean(bufferView.extensions?.EXT_meshopt_compression)
}

/**
 * Reads an uncompressed accessor into a flat typed array. Normalized integer
 * accessors are converted to floats in 0..1 (or -1..1).
 * @param {Glb} glb
 * @param {number} accessorIndex
 * @returns {Float32Array | Int8Array | Uint8Array | Int16Array | Uint16Array | Uint32Array}
 */
export function readAccessor(glb, accessorIndex) {
	const { json, bin } = glb
	const accessor = json.accessors[accessorIndex]
	const ArrayType = COMPONENT_ARRAYS[accessor.componentType]
	const components = COMPONENT_COUNTS[accessor.type]
	if (!ArrayType || !components)
		throw new Error(`Unsupported accessor ${accessorIndex}`)
	if (isCompressedAccessor(json, accessorIndex))
		throw new Error(
			`Accessor ${accessorIndex} is meshopt-compressed and cannot be read here`,
		)
	const count = accessor.count * components
	if (accessor.bufferView === undefined) return new ArrayType(count)
	if (!bin) throw new Error('GLB has no binary chunk')
	const bufferView = json.bufferViews[accessor.bufferView]
	const start =
		bin.byteOffset +
		(bufferView.byteOffset ?? 0) +
		(accessor.byteOffset ?? 0)
	const elementBytes = components * ArrayType.BYTES_PER_ELEMENT
	const stride = bufferView.byteStride ?? elementBytes
	let out
	if (stride === elementBytes && start % ArrayType.BYTES_PER_ELEMENT === 0) {
		out = new ArrayType(bin.buffer, start, count).slice()
	} else {
		out = new ArrayType(count)
		const view = new DataView(bin.buffer)
		const read = readerFor(view, accessor.componentType)
		for (let i = 0; i < accessor.count; i++) {
			for (let c = 0; c < components; c++) {
				out[i * components + c] = read(
					start + i * stride + c * ArrayType.BYTES_PER_ELEMENT,
				)
			}
		}
	}
	if (accessor.normalized) {
		const divisor = NORMALIZED_DIVISORS[accessor.componentType]
		const floats = new Float32Array(count)
		for (let i = 0; i < count; i++)
			floats[i] = Math.max(out[i] / divisor, -1)
		return floats
	}
	return out
}

function readerFor(view, componentType) {
	switch (componentType) {
		case 5120:
			return (o) => view.getInt8(o)
		case 5121:
			return (o) => view.getUint8(o)
		case 5122:
			return (o) => view.getInt16(o, true)
		case 5123:
			return (o) => view.getUint16(o, true)
		case 5125:
			return (o) => view.getUint32(o, true)
		default:
			return (o) => view.getFloat32(o, true)
	}
}

/**
 * Triangle count of a primitive from its indices (or its vertex count).
 * @param {any} json
 * @param {any} primitive
 */
export function triangleCount(json, primitive) {
	const mode = primitive.mode ?? 4
	const vertices =
		primitive.indices !== undefined
			? json.accessors[primitive.indices].count
			: json.accessors[primitive.attributes.POSITION].count
	if (mode === 4) return Math.floor(vertices / 3)
	if (mode === 5 || mode === 6) return Math.max(vertices - 2, 0)
	return 0
}

/**
 * Parent node index for every child node.
 * @param {any} json
 * @returns {Map<number, number>}
 */
export function nodeParents(json) {
	const parents = new Map()
	json.nodes.forEach((node, index) => {
		for (const child of node.children ?? []) parents.set(child, index)
	})
	return parents
}

// Column-major 4x4 matrices, as glTF stores them.

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/**
 * @param {ArrayLike<number>} a
 * @param {ArrayLike<number>} b
 * @returns {number[]} a × b
 */
export function multiply(a, b) {
	const out = new Array(16).fill(0)
	for (let col = 0; col < 4; col++) {
		for (let row = 0; row < 4; row++) {
			let sum = 0
			for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k]
			out[col * 4 + row] = sum
		}
	}
	return out
}

/**
 * Local matrix of a node from its `matrix` or its TRS properties.
 * @param {any} node
 * @returns {number[]}
 */
export function localMatrix(node) {
	if (node.matrix) return Array.from(node.matrix)
	const [tx, ty, tz] = node.translation ?? [0, 0, 0]
	const [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1]
	const [sx, sy, sz] = node.scale ?? [1, 1, 1]
	const xx = qx * qx
	const yy = qy * qy
	const zz = qz * qz
	const xy = qx * qy
	const xz = qx * qz
	const yz = qy * qz
	const wx = qw * qx
	const wy = qw * qy
	const wz = qw * qz
	return [
		(1 - 2 * (yy + zz)) * sx,
		2 * (xy + wz) * sx,
		2 * (xz - wy) * sx,
		0,
		2 * (xy - wz) * sy,
		(1 - 2 * (xx + zz)) * sy,
		2 * (yz + wx) * sy,
		0,
		2 * (xz + wy) * sz,
		2 * (yz - wx) * sz,
		(1 - 2 * (xx + yy)) * sz,
		0,
		tx,
		ty,
		tz,
		1,
	]
}

/**
 * World matrix of every node (scene roots included).
 * @param {any} json
 * @returns {number[][]}
 */
export function worldMatrices(json) {
	const parents = nodeParents(json)
	const cache = new Map()
	const world = (index) => {
		const cached = cache.get(index)
		if (cached) return cached
		const parent = parents.get(index)
		const local = localMatrix(json.nodes[index])
		const result =
			parent === undefined ? local : multiply(world(parent), local)
		cache.set(index, result)
		return result
	}
	return json.nodes.map((_, index) => world(index))
}

/**
 * @param {ArrayLike<number>} m
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {[number, number, number]}
 */
export function transformPoint(m, x, y, z) {
	const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1
	return [
		(m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
		(m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
		(m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
	]
}

/**
 * Axis-aligned bounds of a skinned primitive in its bind pose, in the space of
 * the scene root: every vertex is pushed through `Σ w · (W_joint × IBM_joint)`
 * exactly as a renderer would with the rest pose applied.
 * @param {Glb} glb
 * @param {any} primitive
 * @param {number} skinIndex
 * @param {number[][]} worlds From {@link worldMatrices}.
 * @returns {{ min: number[]; max: number[] }}
 */
export function skinnedBounds(glb, primitive, skinIndex, worlds) {
	const { json } = glb
	const skin = json.skins[skinIndex]
	const ibms = readAccessor(glb, skin.inverseBindMatrices)
	const jointMatrices = skin.joints.map((node, j) =>
		multiply(worlds[node], Array.from(ibms.subarray(j * 16, j * 16 + 16))),
	)
	const positions = readAccessor(glb, primitive.attributes.POSITION)
	const joints = readAccessor(glb, primitive.attributes.JOINTS_0)
	const weights = readAccessor(glb, primitive.attributes.WEIGHTS_0)
	const min = [Infinity, Infinity, Infinity]
	const max = [-Infinity, -Infinity, -Infinity]
	const vertexCount = positions.length / 3
	for (let v = 0; v < vertexCount; v++) {
		const x = positions[v * 3]
		const y = positions[v * 3 + 1]
		const z = positions[v * 3 + 2]
		let px = 0
		let py = 0
		let pz = 0
		for (let c = 0; c < 4; c++) {
			const w = weights[v * 4 + c]
			if (w === 0) continue
			const [tx, ty, tz] = transformPoint(
				jointMatrices[joints[v * 4 + c]],
				x,
				y,
				z,
			)
			px += tx * w
			py += ty * w
			pz += tz * w
		}
		const p = [px, py, pz]
		for (let i = 0; i < 3; i++) {
			if (p[i] < min[i]) min[i] = p[i]
			if (p[i] > max[i]) max[i] = p[i]
		}
	}
	return { min, max }
}

/**
 * How many vertices of a skinned primitive each joint influences (weight > 0).
 * @param {Glb} glb
 * @param {any} primitive
 * @returns {Map<number, number>} joint index in the skin → vertex count
 */
export function influenceCounts(glb, primitive) {
	const joints = readAccessor(glb, primitive.attributes.JOINTS_0)
	const weights = readAccessor(glb, primitive.attributes.WEIGHTS_0)
	const counts = new Map()
	for (let v = 0; v < joints.length / 4; v++) {
		for (let c = 0; c < 4; c++) {
			if (weights[v * 4 + c] <= 0) continue
			const joint = joints[v * 4 + c]
			counts.set(joint, (counts.get(joint) ?? 0) + 1)
		}
	}
	return counts
}

export { IDENTITY }

/**
 * Serialises a glTF document and its binary chunk back into a GLB container.
 * @param {any} json
 * @param {Uint8Array | null} bin
 * @returns {Uint8Array}
 */
export function serializeGlb(json, bin) {
	const jsonBytes = new TextEncoder().encode(JSON.stringify(json))
	const jsonPadded = pad(jsonBytes, 0x20)
	const binPadded = bin ? pad(bin, 0) : null
	const total =
		12 +
		8 +
		jsonPadded.byteLength +
		(binPadded ? 8 + binPadded.byteLength : 0)
	const out = new Uint8Array(total)
	const view = new DataView(out.buffer)
	view.setUint32(0, GLB_MAGIC, true)
	view.setUint32(4, 2, true)
	view.setUint32(8, total, true)
	view.setUint32(12, jsonPadded.byteLength, true)
	view.setUint32(16, CHUNK_JSON, true)
	out.set(jsonPadded, 20)
	if (binPadded) {
		const offset = 20 + jsonPadded.byteLength
		view.setUint32(offset, binPadded.byteLength, true)
		view.setUint32(offset + 4, CHUNK_BIN, true)
		out.set(binPadded, offset + 8)
	}
	return out
}

function pad(bytes, fill) {
	const remainder = bytes.byteLength % 4
	if (remainder === 0) return bytes
	const padded = new Uint8Array(bytes.byteLength + 4 - remainder)
	padded.set(bytes)
	padded.fill(fill, bytes.byteLength)
	return padded
}

/**
 * Multiplies an uncompressed float POSITION accessor in place.
 * @param {Glb} glb
 * @param {number} accessorIndex
 * @param {number} factor
 */
export function scaleAccessorInPlace(glb, accessorIndex, factor) {
	const { json, bin } = glb
	const accessor = json.accessors[accessorIndex]
	if (accessor.componentType !== 5126 || accessor.type !== 'VEC3')
		throw new Error(`Accessor ${accessorIndex} is not a float VEC3`)
	if (isCompressedAccessor(json, accessorIndex) || !bin)
		throw new Error(`Accessor ${accessorIndex} cannot be scaled in place`)
	const bufferView = json.bufferViews[accessor.bufferView]
	const start =
		bin.byteOffset +
		(bufferView.byteOffset ?? 0) +
		(accessor.byteOffset ?? 0)
	const stride = bufferView.byteStride ?? 12
	const view = new DataView(bin.buffer)
	for (let i = 0; i < accessor.count; i++) {
		for (let c = 0; c < 3; c++) {
			const offset = start + i * stride + c * 4
			view.setFloat32(
				offset,
				view.getFloat32(offset, true) * factor,
				true,
			)
		}
	}
	if (accessor.min) accessor.min = accessor.min.map((v) => v * factor)
	if (accessor.max) accessor.max = accessor.max.map((v) => v * factor)
	if (factor < 0) [accessor.min, accessor.max] = [accessor.max, accessor.min]
}

/**
 * Rewrites an uncompressed float VEC3 accessor in place through `map`,
 * which receives `[x, y, z]` and the vertex index and returns the new triple.
 * @param {Glb} glb
 * @param {number} accessorIndex
 * @param {(xyz: [number, number, number], index: number) => [number, number, number]} map
 */
export function mapAccessorInPlace(glb, accessorIndex, map) {
	const { json, bin } = glb
	const accessor = json.accessors[accessorIndex]
	if (accessor.componentType !== 5126 || accessor.type !== 'VEC3')
		throw new Error(`Accessor ${accessorIndex} is not a float VEC3`)
	if (isCompressedAccessor(json, accessorIndex) || !bin)
		throw new Error(
			`Accessor ${accessorIndex} cannot be rewritten in place`,
		)
	const bufferView = json.bufferViews[accessor.bufferView]
	const start =
		bin.byteOffset +
		(bufferView.byteOffset ?? 0) +
		(accessor.byteOffset ?? 0)
	const stride = bufferView.byteStride ?? 12
	const view = new DataView(bin.buffer)
	const min = [Infinity, Infinity, Infinity]
	const max = [-Infinity, -Infinity, -Infinity]
	for (let i = 0; i < accessor.count; i++) {
		const offset = start + i * stride
		const next = map(
			[
				view.getFloat32(offset, true),
				view.getFloat32(offset + 4, true),
				view.getFloat32(offset + 8, true),
			],
			i,
		)
		for (let c = 0; c < 3; c++) {
			view.setFloat32(offset + c * 4, next[c], true)
			min[c] = Math.min(min[c], next[c])
			max[c] = Math.max(max[c], next[c])
		}
	}
	if (accessor.min) accessor.min = min
	if (accessor.max) accessor.max = max
}

/**
 * Inverse of a column-major 4×4 matrix; throws when singular.
 * @param {ArrayLike<number>} m
 * @returns {number[]}
 */
export function invertMatrix4(m) {
	const [
		a00,
		a01,
		a02,
		a03,
		a10,
		a11,
		a12,
		a13,
		a20,
		a21,
		a22,
		a23,
		a30,
		a31,
		a32,
		a33,
	] = Array.from(m)
	const b00 = a00 * a11 - a01 * a10
	const b01 = a00 * a12 - a02 * a10
	const b02 = a00 * a13 - a03 * a10
	const b03 = a01 * a12 - a02 * a11
	const b04 = a01 * a13 - a03 * a11
	const b05 = a02 * a13 - a03 * a12
	const b06 = a20 * a31 - a21 * a30
	const b07 = a20 * a32 - a22 * a30
	const b08 = a20 * a33 - a23 * a30
	const b09 = a21 * a32 - a22 * a31
	const b10 = a21 * a33 - a23 * a31
	const b11 = a22 * a33 - a23 * a32
	const det =
		b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06
	if (!det) throw new Error('Matrix is singular')
	const d = 1 / det
	return [
		(a11 * b11 - a12 * b10 + a13 * b09) * d,
		(a02 * b10 - a01 * b11 - a03 * b09) * d,
		(a31 * b05 - a32 * b04 + a33 * b03) * d,
		(a22 * b04 - a21 * b05 - a23 * b03) * d,
		(a12 * b08 - a10 * b11 - a13 * b07) * d,
		(a00 * b11 - a02 * b08 + a03 * b07) * d,
		(a32 * b02 - a30 * b05 - a33 * b01) * d,
		(a20 * b05 - a22 * b02 + a23 * b01) * d,
		(a10 * b10 - a11 * b08 + a13 * b06) * d,
		(a01 * b08 - a00 * b10 - a03 * b06) * d,
		(a30 * b04 - a31 * b02 + a33 * b00) * d,
		(a21 * b02 - a20 * b04 - a23 * b00) * d,
		(a11 * b07 - a10 * b09 - a12 * b06) * d,
		(a00 * b09 - a01 * b07 + a02 * b06) * d,
		(a31 * b01 - a30 * b03 - a32 * b00) * d,
		(a20 * b03 - a21 * b01 + a22 * b00) * d,
	]
}
