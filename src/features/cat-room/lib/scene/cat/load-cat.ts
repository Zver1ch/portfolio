import {
	type Bone,
	Box3,
	Group,
	type Material,
	type Skeleton,
	type SkinnedMesh,
} from 'three'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { CAT_RIG_BONES } from '../../../config/cat-rig.gen'
import { CAT_REST_HEIGHT } from '../../../config/tuning'
import { normalizeBoneName } from '../../bone-names'

export type CatModel = {
	/** Character space: +Y up, +Z forward, feet on the origin, `CAT_REST_HEIGHT` tall. */
	root: Group
	meshes: SkinnedMesh[]
	skeleton: Skeleton
	/** Skin order, aligned with `CAT_RIG_BONES`. */
	bones: Bone[]
	materials: Material[]
	/** Uniform scale applied to the file's units. */
	scale: number
	dispose(): void
}

/**
 * Loads the optimised avatar and normalises it into character space. The
 * skin's joint order is the contract with `cat-rig.gen.ts`; in development a
 * mismatch throws instead of posing the wrong bone.
 */
export async function loadCat(
	url: string,
	onProgress?: (fraction: number) => void,
): Promise<CatModel> {
	const loader = new GLTFLoader()
	loader.setMeshoptDecoder(MeshoptDecoder)
	const gltf = await loader.loadAsync(url, (event) => {
		if (event.total > 0)
			onProgress?.(Math.min(event.loaded / event.total, 1))
	})

	const meshes: SkinnedMesh[] = []
	gltf.scene.traverse((object) => {
		const mesh = object as SkinnedMesh
		if (mesh.isSkinnedMesh) {
			// Bind-pose bounds are wrong once posed and in the overlay.
			mesh.frustumCulled = false
			meshes.push(mesh)
		}
	})
	if (meshes.length === 0) throw new Error(`${url}: no skinned meshes`)
	const skeleton = meshes[0].skeleton
	if (meshes.some((mesh) => mesh.skeleton !== skeleton))
		throw new Error(`${url}: the meshes do not share one skeleton`)
	const bones = skeleton.bones
	if (process.env.NODE_ENV !== 'production') {
		if (bones.length !== CAT_RIG_BONES.length)
			throw new Error(
				`${url}: ${bones.length} bones, cat-rig.gen.ts has ${CAT_RIG_BONES.length}`,
			)
		bones.forEach((bone, i) => {
			const key = normalizeBoneName(bone.name)
			if (key !== CAT_RIG_BONES[i].key)
				throw new Error(
					`${url}: bone ${i} is "${bone.name}" (${key}), cat-rig.gen.ts says "${CAT_RIG_BONES[i].key}"`,
				)
		})
	}

	const materials = [
		...new Set(meshes.map((mesh) => mesh.material as Material)),
	]

	// Normalise: measure the bind pose, then scale and lift into character space.
	gltf.scene.updateMatrixWorld(true)
	const bounds = new Box3()
	for (const mesh of meshes) {
		mesh.computeBoundingBox()
		if (mesh.boundingBox)
			bounds.union(
				mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld),
			)
	}
	const height = bounds.max.y - bounds.min.y
	const scale = CAT_REST_HEIGHT / height
	const root = new Group()
	root.name = 'cat'
	gltf.scene.position.set(
		-(bounds.min.x + bounds.max.x) / 2,
		-bounds.min.y,
		0,
	)
	root.add(gltf.scene)
	root.scale.setScalar(scale)
	root.updateMatrixWorld(true)

	return {
		root,
		meshes,
		skeleton,
		bones,
		materials,
		scale,
		dispose() {
			for (const mesh of meshes) mesh.geometry.dispose()
			for (const material of materials) material.dispose()
			skeleton.dispose()
		},
	}
}
