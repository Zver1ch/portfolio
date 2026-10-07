import {
	type Camera,
	Mesh,
	OrthographicCamera,
	PerspectiveCamera,
	Scene,
	Vector3,
	type WebGLRenderer,
} from 'three'
import type { CameraPose } from '@/shared/lib/math/projection'
import { CAMERA_FAR, CAMERA_NEAR } from '../../config/camera-tracks'
import { roomColliders } from '../../config/colliders'
import type { DirectorFrame } from '../../model/frame'
import type { Track } from '../camera-path'
import {
	type OverlayPlacement,
	overlayCameraPosition,
	overlayFrustum,
} from '../overlay'
import { screenWidth } from '../screen-quad'
import {
	type CatActor,
	createCat,
	type PenetrationHit,
	type Rect,
	type SceneEvent,
} from './cat/cat'
import {
	createGlowMaterial,
	createRoomMaterial,
	createSceneUniforms,
} from './materials'
import { createCardHole } from './overlay/card-hole'
import { createFishMesh } from './overlay/fish'
import { createRenderer, resizeRenderer } from './renderer'
import { buildRoom } from './room/build-room'
import { createMonitor } from './room/monitor'
import { createSticker } from './room/sticker'

export type RoomSceneOptions = {
	canvas: HTMLCanvasElement
	width: number
	height: number
	dpr: number
	/** Painted screen instead of the DOM hole (lite mode, posters, lab). */
	fakeScreen: boolean
	/** Phone variant `c`: the screen may be as narrow as the viewport (a portrait panel). */
	screenAspectFloor?: number
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
	/**
	 * Lite mode (plan §3.4): the page section a track lands on, painted for
	 * the monitor's page column; null shows the bars again.
	 */
	setScreenPage(track: Track, image: HTMLCanvasElement | null): void
	/** Draws several frames side by side in one canvas (probe sheets). */
	renderPanes(
		panes: { frame: DirectorFrame; rect: PaneRect }[],
		dt: number,
		clear?: boolean,
	): void
	/** The posed cat against the room's solids (lab check, plan §7). */
	penetration(): PenetrationHit[]
	readonly cat: CatActor | null
	readonly renderer: WebGLRenderer
	readonly triangles: number
}

export async function createRoomScene(
	options: RoomSceneOptions,
): Promise<RoomScene> {
	const { canvas, fakeScreen, modelUrl, onProgress } = options
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

	const roomMaterial = createRoomMaterial(uniforms)
	const glowMaterial = createGlowMaterial(uniforms)
	const room = buildRoom()
	const roomMesh = new Mesh(room.opaque, roomMaterial)
	const glowMesh = new Mesh(room.glow, glowMaterial)
	glowMesh.renderOrder = 10
	scene.add(roomMesh, glowMesh)

	const monitor = createMonitor(
		roomMaterial,
		width / height,
		fakeScreen,
		options.screenAspectFloor,
	)
	scene.add(monitor.group)
	// Phone variant `c`: the hole that follows the page card over the room.
	const cardHole = createCardHole()
	scene.add(cardHole.mesh)

	const sticker = await createSticker()
	scene.add(sticker.mesh)
	onProgress?.(0.15)

	// The overlay of the `inside` phase (plan §3.10): the cat alone through an
	// orthographic camera laid out in CSS px; the room stays where it is, hidden.
	const overlayCamera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 20)
	const [ox, oy, oz] = overlayCameraPosition()
	overlayCamera.position.set(ox, oy, oz)
	overlayCamera.lookAt(ox, oy, oz - 1)
	let activeCamera: Camera = camera
	const roomParts = [roomMesh, glowMesh, monitor.group, sticker.mesh]
	const fish = createFishMesh(roomMaterial)
	scene.add(fish.mesh)

	let cat: CatActor | null = null
	if (options.cat !== false) {
		cat = await createCat({
			url: modelUrl,
			uniforms,
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

	const setOverlay = (placement: OverlayPlacement) => {
		const frustum = overlayFrustum(placement, { width, height })
		overlayCamera.left = frustum.left
		overlayCamera.right = frustum.right
		overlayCamera.top = frustum.top
		overlayCamera.bottom = frustum.bottom
		overlayCamera.updateProjectionMatrix()
	}

	const placeFish = (frame: DirectorFrame) => {
		const state = frame.fish
		fish.mesh.visible = state !== null
		if (!state) return
		if (state.held && cat) {
			// Snatched: it rides in the left paw, nose up.
			fish.mesh.position
				.copy(cat.bonePosition('wrist_l'))
				.add(new Vector3(0, 0.01, 0.035))
			fish.mesh.rotation.set(0, 0, 0.9)
			return
		}
		fish.mesh.position.set(...state.position)
		// Falling nose first, wobbling on the way down.
		fish.mesh.rotation.set(0, 0, -1.3 + Math.sin(frame.time * 9) * 0.3)
	}

	const update = (frame: DirectorFrame, dt: number) => {
		lastFrame = frame
		const overlay = frame.overlay
		for (const part of roomParts) part.visible = overlay === null
		if (overlay) {
			setOverlay(overlay)
			activeCamera = overlayCamera
		} else {
			setCamera(frame.camera, width / height)
			activeCamera = camera
		}
		uniforms.uDawn.value = frame.dawn
		monitor.showPage(frame.phase === 'finale' ? 'finale' : 'dive')
		cardHole.set(
			overlay ? null : (frame.hole ?? null),
			frame.camera,
			width,
			height,
		)
		cat?.update(frame, dt, activeCamera)
		placeFish(frame)
	}

	const draw = () => {
		renderer.setScissorTest(false)
		renderer.setViewport(0, 0, width, height)
		renderer.render(scene, activeCamera)
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
		setScreenPage(track, image) {
			monitor.setPage(track, image)
		},
		renderPanes(panes, dt, clear = true) {
			renderer.setScissorTest(false)
			if (clear) renderer.clear()
			renderer.setScissorTest(true)
			for (const { frame, rect } of panes) {
				lastFrame = frame
				for (const part of roomParts) part.visible = true
				activeCamera = camera
				setCamera(frame.camera, rect.width / rect.height)
				uniforms.uDawn.value = frame.dawn
				cat?.update(frame, dt, camera)
				placeFish(frame)
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
			if (lastFrame?.overlay) setOverlay(lastFrame.overlay)
			else if (lastFrame) setCamera(lastFrame.camera, width / height)
		},
		trigger(event) {
			cat?.trigger(event)
		},
		measure() {
			return cat
				? cat.measure(activeCamera, { width, height })
				: { cat: null, head: null }
		},
		penetration() {
			return cat
				? cat.penetration(roomColliders(screenWidth(width / height)))
				: []
		},
		dispose() {
			cat?.dispose()
			fish.dispose()
			cardHole.dispose()
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
