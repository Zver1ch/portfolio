import type { SkinnedMesh, Vector3 } from 'three'

/** World position of a skinned vertex in the skeleton's current pose. */
export function skinnedWorldPosition(
	mesh: SkinnedMesh,
	v: number,
	target: Vector3,
): Vector3 {
	target.fromBufferAttribute(mesh.geometry.getAttribute('position'), v)
	mesh.applyBoneTransform(v, target)
	return target.applyMatrix4(mesh.matrixWorld)
}

/** Joint with the largest weight on a skinned vertex, or -1. */
export function dominantJoint(mesh: SkinnedMesh, v: number): number {
	const skinIndex = mesh.geometry.getAttribute('skinIndex')
	const skinWeight = mesh.geometry.getAttribute('skinWeight')
	if (!skinIndex || !skinWeight) return -1
	const joints = [
		skinIndex.getX(v),
		skinIndex.getY(v),
		skinIndex.getZ(v),
		skinIndex.getW(v),
	]
	const weights = [
		skinWeight.getX(v),
		skinWeight.getY(v),
		skinWeight.getZ(v),
		skinWeight.getW(v),
	]
	let best = -1
	let bestWeight = 0
	weights.forEach((weight, k) => {
		if (weight > bestWeight) {
			bestWeight = weight
			best = joints[k]
		}
	})
	return best
}
