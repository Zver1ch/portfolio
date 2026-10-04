import { Mesh, PerspectiveCamera, Scene, type WebGLRenderer } from 'three'
import type { CameraPose } from '@/shared/lib/math/projection'
import { CAMERA_FAR, CAMERA_NEAR } from '../../config/camera-tracks'
import type { DirectorFrame, ShadingVariant } from '../../model/frame'
import { type CatActor, createCat, type Rect, type SceneEvent } from './cat/cat'
import {
	createGlowMaterial,
	createRoomMaterial,
	createSceneUniforms,
} from './materials'
import { createRenderer, resizeRenderer } from './renderer'
import { buildRoom } from './room/build-room'
import { createMonitor } from './room/monitor'
import { createSticker } from './room/sticker'

export type RoomSceneOptions = {
	canvas: HTMLCanvasElement
	width: number
	height: number
	dpr: number
	shading: ShadingVariant
	/** Painted screen instead of the DOM hole (lite mode, posters, lab). */
	fakeScreen: boolean
	/** Where the cat's GLB comes from; the lab swaps in the source model. */
	modelUrl: string
	/** Omit the cat (room look-dev). */
	cat?: boolean
	hairSprings?: boolean
	onProgress?: (fraction: number) => void
}

export type PaneRect = { x: number; y: number; width: number; height: number }

/** Scene contract (plan §3.3) plus lab helpers. */
export type RoomScene = {
	render(frame: DirectorFrame, dt: number): void
	resize(width: number, height: number, dpr: number): void
	trigger(event: SceneEvent): void
	measure(): { cat: Rect | null; head: Rect | null }
	dispose(): void
	/** Advances the animation without drawing (deterministic settling in the lab). */
	update(frame: DirectorFrame, dt: number): void
	/** Draws the last updated state. */
	draw(): void
	/** Draws several frames side by side in one canvas (probe sheets). */
	renderPanes(
		panes: { frame: DirectorFrame; rect: PaneRect }[],
		dt: number,
		clear?: boolean,
	): void
	readonly cat: CatActor | null
	readonly renderer: WebGLRenderer
	readonly triangles: number
}

export async function createRoomScene(
	options: RoomSceneOptions,
): Promise<RoomScene> {
	const { canvas, shading, fakeScreen, modelUrl, onProgress } = options
	let { width, height } = options
	const renderer = createRenderer(canvas, { width, height, dpr: options.dpr })
	const scene = new Scene()
	const camera = new PerspectiveCamera(
		32,
		width / height,
		CAMERA_NEAR,
		CAMERA_FAR,
	)
	const uniforms = createSceneUniforms()

	const roomMaterial = createRoomMaterial(uniforms, shading === 'b')
	const glowMaterial = createGlowMaterial(uniforms)
	const room = buildRoom()
	const roomMesh = new Mesh(room.opaque, roomMaterial)
	const glowMesh = new Mesh(room.glow, glowMaterial)
	glowMesh.renderOrder = 10
	scene.add(roomMesh, glowMesh)

	const monitor = createMonitor(roomMaterial, width / height, fakeScreen)
	scene.add(monitor.group)

	const sticker = await createSticker()
	scene.add(sticker.mesh)
	onProgress?.(0.15)

	let cat: CatActor | null = null
	if (options.cat !== false) {
		cat = await createCat({
			url: modelUrl,
			uniforms,
			shading,
			hairSprings: options.hairSprings,
			onProgress: (fraction) => onProgress?.(0.15 + fraction * 0.75),
		})
		scene.add(cat.root)
	}
	onProgress?.(0.95)

	let lastFrame: DirectorFrame | null = null

	const setCamera = (pose: CameraPose, aspect: number) => {
		camera.position.set(...pose.position)
		camera.up.set(0, 1, 0)
		camera.lookAt(...pose.target)
		camera.fov = pose.fov
		camera.aspect = aspect
		camera.updateProjectionMatrix()
	}

	const update = (frame: DirectorFrame, dt: number) => {
		lastFrame = frame
		setCamera(frame.camera, width / height)
		uniforms.uDawn.value = frame.dawn
		cat?.update(frame, dt, camera)
	}

	const draw = () => {
		renderer.setScissorTest(false)
		renderer.setViewport(0, 0, width, height)
		renderer.render(scene, camera)
	}

	return {
		get cat() {
			return cat
		},
		renderer,
		triangles: room.triangles,
		render(frame, dt) {
			update(frame, dt)
			draw()
		},
		update,
		draw,
		renderPanes(panes, dt, clear = true) {
			renderer.setScissorTest(false)
			if (clear) renderer.clear()
			renderer.setScissorTest(true)
			for (const { frame, rect } of panes) {
				lastFrame = frame
				setCamera(frame.camera, rect.width / rect.height)
				uniforms.uDawn.value = frame.dawn
				cat?.update(frame, dt, camera)
				const y = height - rect.y - rect.height
				renderer.setViewport(rect.x, y, rect.width, rect.height)
				renderer.setScissor(rect.x, y, rect.width, rect.height)
				renderer.render(scene, camera)
			}
			renderer.setScissorTest(false)
		},
		resize(nextWidth, nextHeight, dpr) {
			width = nextWidth
			height = nextHeight
			resizeRenderer(renderer, { width, height, dpr })
			monitor.resize(width / height)
			if (lastFrame) setCamera(lastFrame.camera, width / height)
		},
		trigger(event) {
			cat?.trigger(event)
		},
		measure() {
			return cat
				? cat.measure(camera, { width, height })
				: { cat: null, head: null }
		},
		dispose() {
			cat?.dispose()
			sticker.dispose()
			monitor.dispose()
			room.opaque.dispose()
			room.glow.dispose()
			roomMaterial.dispose()
			glowMaterial.dispose()
			renderer.dispose()
			renderer.forceContextLoss()
		},
	}
}
