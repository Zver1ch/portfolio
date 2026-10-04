import {
	Euler,
	type Group,
	type PerspectiveCamera,
	Quaternion,
	Vector3,
} from 'three'
import { DEG, smoothstep } from '@/shared/lib/math/ease'
import type { Vec3 } from '@/shared/lib/math/vec3'
import { POSES, type PoseName } from '../../../config/poses'
import { CAT_SPOT } from '../../../config/room-layout'
import { CHAINS, EYELIDS } from '../../../config/tuning'
import type { DirectorFrame, ShadingVariant } from '../../../model/frame'
import { tailFlick } from '../../camera-path'
import { patchMaterial, type SceneUniforms } from '../materials'
import { SpringChains } from './chains'
import { createEyelids } from './eyelids'
import {
	applyBreathing,
	applyEarTwitch,
	applyJaw,
	applyLookAt,
	createLayerState,
	openJaw,
} from './layers'
import { type CatModel, loadCat } from './load-cat'
import { PoseMixer } from './pose-mixer'
import { AXES, CatRig } from './rig'

export type Rect = { x: number; y: number; width: number; height: number }

export type SceneEvent =
	| { type: 'pet' }
	| { type: 'feed'; x: number; y: number }

export type CatActorOptions = {
	url: string
	uniforms: SceneUniforms
	shading: ShadingVariant
	spot?: Vec3
	/** Hair tufts on springs (optional per plan §7, off by default). */
	hairSprings?: boolean
	onProgress?: (fraction: number) => void
}

export type CatActor = {
	root: Group
	rig: CatRig
	mixer: PoseMixer
	model: CatModel
	/** Advances the animation and writes the bones; no drawing. */
	update(frame: DirectorFrame, dt: number, camera: PerspectiveCamera): void
	trigger(event: SceneEvent): void
	measure(
		camera: PerspectiveCamera,
		viewport: { width: number; height: number },
	): { cat: Rect | null; head: Rect | null }
	/** Extra local Euler offsets (degrees) per bone key, for the lab's probe and sliders. */
	setOverrides(overrides: Record<string, Vec3>): void
	/** World position of a bone, for lab framing. */
	bonePosition(key: string): Vector3
	dispose(): void
}

const MEASURE_KEYS = [
	'head',
	'neck',
	'chest',
	'hips',
	'spine',
	'wrist_l',
	'wrist_r',
	'elbow_l',
	'elbow_r',
	'knee_l',
	'knee_r',
	'foot_l_end',
	'foot_r_end',
	'ear_l002_end',
	'ear_r002_end',
	'tail003_end',
	'jaw_end',
]
const HEAD_KEYS = [
	'head',
	'ear_l002_end',
	'ear_r002_end',
	'jaw_end',
	'lefteye_end',
	'righteye_end',
	'neck',
]

export async function createCat({
	url,
	uniforms,
	shading,
	spot = CAT_SPOT.position,
	hairSprings = false,
	onProgress,
}: CatActorOptions): Promise<CatActor> {
	const model = await loadCat(url, onProgress)
	const patch = { uniforms, tone: shading === 'b', dawnTint: true }
	for (const material of model.materials) patchMaterial(material, patch)

	const rig = new CatRig(model)
	const eyelids = createEyelids(model, rig, patch)
	const leftEye = rig.indexOf('lefteye')
	const restEyeInverse = rig.restLocal[leftEye].clone().invert()
	const mixer = new PoseMixer(rig, POSES, 'rest')
	const layers = createLayerState()
	const chains = new SpringChains(rig)
	chains.add(
		'tail',
		['tailroot', 'tail', 'tail001', 'tail002', 'tail003'],
		'tail003_end',
		CHAINS.tail,
	)
	chains.add(
		'ear_l',
		['ear_l', 'ear_l001', 'ear_l002'],
		'ear_l002_end',
		CHAINS.ear,
	)
	chains.add(
		'ear_r',
		['ear_r', 'ear_r001', 'ear_r002'],
		'ear_r002_end',
		CHAINS.ear,
	)
	if (hairSprings) chains.addHairChains(CHAINS.hair)

	const root = model.root
	const spotVector = new Vector3(...spot)
	let overrides: Record<string, Vec3> = {}
	let lastTime = 0
	let lastPose: PoseName | null = null
	const tailBones = ['tailroot', 'tail', 'tail001'].map((key) =>
		rig.indexOf(key),
	)

	const update = (
		frame: DirectorFrame,
		dt: number,
		camera: PerspectiveCamera,
	) => {
		const time = frame.stepped
			? Math.floor(frame.time * 12) / 12
			: frame.time
		lastTime = time
		if (lastPose !== frame.pose) {
			mixer.setBase(frame.pose, time, lastPose === null ? 0.001 : 0.6)
			lastPose = frame.pose
		}
		const pose = mixer.evaluate(time)
		const { local } = pose

		// How far the eyes have rolled shut (the sleep pose rolls them 180°),
		// before the look-at layer adds its small turn.
		const rolled = new Vector3(0, 1, 0).applyQuaternion(
			restEyeInverse.clone().multiply(local[leftEye]),
		)
		const closed = smoothstep(
			EYELIDS.rollEdges[0],
			EYELIDS.rollEdges[1],
			(1 - rolled.y) / 2,
		)
		uniforms.uEyesClosed.value = closed
		eyelids.setClosed(closed)

		for (const [key, rot] of Object.entries(overrides)) {
			const i = rig.indexOf(key)
			local[i].multiply(
				new Quaternion().setFromEuler(
					new Euler(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG, 'XYZ'),
				),
			)
		}

		// Placement first, so look targets can be brought into character space.
		root.position.copy(spotVector).add(pose.rootPosition)
		root.quaternion.copy(pose.rootQuaternion)

		applyBreathing(rig, local, time)
		const lookWorld = frame.lookAt
			? new Vector3(...frame.lookAt)
			: camera.position.clone()
		const lookCharacter = lookWorld
			.sub(root.position)
			.applyQuaternion(root.quaternion.clone().invert())
		// A sleeping cat does not track the visitor.
		applyLookAt(
			rig,
			local,
			layers,
			frame.pose === 'sleep' ? null : lookCharacter,
			model.scale,
			dt,
		)
		applyEarTwitch(rig, local, layers, time)
		applyJaw(rig, local, layers, time)

		const flick = tailFlick(frame.dive)
		if (flick > 0) {
			const share = [0.6, 0.25, 0.15]
			for (const [k, bone] of tailBones.entries())
				rig.rotateInCharacterSpace(
					local,
					bone,
					new Quaternion().setFromAxisAngle(
						AXES.z,
						flick * 110 * DEG * share[k],
					),
				)
		}

		rig.apply(local, pose.hips)
		root.updateMatrixWorld(true)
		chains.update(dt)
	}

	const project = (
		keys: string[],
		camera: PerspectiveCamera,
		viewport: { width: number; height: number },
	): Rect | null => {
		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity
		for (const key of keys) {
			const point = rig.bones[rig.indexOf(key)]
				.getWorldPosition(new Vector3())
				.project(camera)
			if (point.z > 1) continue
			const x = ((point.x + 1) / 2) * viewport.width
			const y = ((1 - point.y) / 2) * viewport.height
			minX = Math.min(minX, x)
			minY = Math.min(minY, y)
			maxX = Math.max(maxX, x)
			maxY = Math.max(maxY, y)
		}
		if (!Number.isFinite(minX)) return null
		// Bones sit inside the body: pad to reach the surface.
		const pad = Math.max(12, (maxY - minY) * 0.18)
		return {
			x: minX - pad,
			y: minY - pad,
			width: maxX - minX + 2 * pad,
			height: maxY - minY + 2 * pad,
		}
	}

	return {
		root,
		rig,
		mixer,
		model,
		update,
		trigger(event) {
			if (event.type === 'pet') {
				mixer.play('stretch', lastTime, {
					fadeIn: 0.25,
					hold: 0.8,
					fadeOut: 0.6,
				})
				openJaw(layers, lastTime + 0.15)
			}
		},
		measure(camera, viewport) {
			return {
				cat: project(MEASURE_KEYS, camera, viewport),
				head: project(HEAD_KEYS, camera, viewport),
			}
		},
		setOverrides(next) {
			overrides = next
		},
		bonePosition(key) {
			return rig.bones[rig.indexOf(key)].getWorldPosition(new Vector3())
		},
		dispose() {
			eyelids.dispose()
			model.dispose()
		},
	}
}
