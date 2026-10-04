import { POSES, type PoseName } from '@/features/cat-room/config/poses'
import {
	CAT_SPOT,
	KEYBOARD,
	LAMP,
	SOCKS,
	STICKER,
} from '@/features/cat-room/config/room-layout'
import { clamp, DEG } from '@/shared/lib/math/ease'
import type { CameraPose } from '@/shared/lib/math/projection'
import type { Vec3 } from '@/shared/lib/math/vec3'

export type LabView =
	| 'hero'
	| 'dive'
	| 'finale'
	| 'turntable'
	| 'probe'
	| 'overlay'
export type CamPreset =
	| 'front'
	| 'side'
	| 'top'
	| 'quarter'
	| 'back'
	| 'close'
	| 'face'
	| 'hero'
	| 'sticker'
	| 'lamp'
	| 'desk'
	| 'socks'
export type LabModel = 'shipped' | 'source' | 'space'

export type LabParams = {
	view: LabView
	/** Scroll progress of the dive or finale track. */
	p: number
	dawn: number | null
	pose: PoseName | null
	/** Animation time for a deterministic still; null runs the live loop. */
	t: number | null
	stepped: boolean
	/** Fixed frame step for the live loop, seconds; null uses the real frame time. */
	dt: number | null
	bone: string | null
	axis: 'x' | 'y' | 'z'
	deg: number
	ui: boolean
	cam: CamPreset
	yaw: number | null
	pitch: number | null
	dist: number | null
	fov: number | null
	model: LabModel
	meow: boolean
	look: 'camera' | 'none'
	lite: boolean
	hair: boolean
	/** Hide the cat (room look-dev). */
	nocat: boolean
}

const VIEWS: LabView[] = [
	'hero',
	'dive',
	'finale',
	'turntable',
	'probe',
	'overlay',
]
const CAMS: CamPreset[] = [
	'front',
	'side',
	'top',
	'quarter',
	'back',
	'close',
	'face',
	'hero',
	'sticker',
	'lamp',
	'desk',
	'socks',
]

function pick<T extends string>(
	value: string | null,
	allowed: readonly T[],
	fallback: T,
): T {
	return value && (allowed as readonly string[]).includes(value)
		? (value as T)
		: fallback
}

function num(value: string | null): number | null {
	if (value === null || value === '') return null
	const parsed = Number(value)
	return Number.isFinite(parsed) ? parsed : null
}

export function parseLabParams(search: string): LabParams {
	const q = new URLSearchParams(search)
	const pose = q.get('pose')
	return {
		view: pick(q.get('view'), VIEWS, 'hero'),
		p: clamp(num(q.get('p')) ?? 0, 0, 1),
		dawn: num(q.get('dawn')),
		pose: pose && pose in POSES ? (pose as PoseName) : null,
		t: num(q.get('t')),
		stepped: q.get('stepped') === '1',
		dt: num(q.get('dt')),
		bone: q.get('bone'),
		axis: pick(q.get('axis'), ['x', 'y', 'z'] as const, 'x'),
		deg: num(q.get('deg')) ?? 30,
		ui: q.get('ui') === '1',
		cam: pick(q.get('cam'), CAMS, 'front'),
		yaw: num(q.get('yaw')),
		pitch: num(q.get('pitch')),
		dist: num(q.get('dist')),
		fov: num(q.get('fov')),
		model: pick(
			q.get('model'),
			['shipped', 'source', 'space'] as const,
			'shipped',
		),
		meow: q.get('meow') === '1',
		look: pick(q.get('look'), ['camera', 'none'] as const, 'camera'),
		lite: q.get('lite') === '1',
		hair: q.get('hair') === '1',
		nocat: q.get('nocat') === '1',
	}
}

export function modelUrl(model: LabModel): string {
	if (model === 'source') return '/__lab/source.glb'
	if (model === 'space') return '/__lab/space.glb'
	return '/models/cat.glb'
}

type Orbit = {
	yaw: number
	pitch: number
	dist: number
	fov: number
	focus: 'cat' | 'head' | 'sticker' | 'lamp' | 'desk' | 'socks'
}

/** Yaw is measured from +Z (the visitor's side) towards +X; the cat lies with its head towards +X. */
export const CAM_PRESETS: Record<Exclude<CamPreset, 'hero'>, Orbit> = {
	front: { yaw: 0, pitch: 14, dist: 1.25, fov: 32, focus: 'cat' },
	side: { yaw: 70, pitch: 22, dist: 1.25, fov: 32, focus: 'cat' },
	top: { yaw: 10, pitch: 82, dist: 1.25, fov: 32, focus: 'cat' },
	quarter: { yaw: 38, pitch: 26, dist: 1.2, fov: 32, focus: 'cat' },
	back: { yaw: 180, pitch: 20, dist: 1.3, fov: 32, focus: 'cat' },
	close: { yaw: 22, pitch: 8, dist: 0.55, fov: 30, focus: 'head' },
	face: { yaw: 8, pitch: 10, dist: 0.85, fov: 28, focus: 'head' },
	sticker: { yaw: 4, pitch: 6, dist: 0.5, fov: 30, focus: 'sticker' },
	lamp: { yaw: -30, pitch: 12, dist: 0.9, fov: 30, focus: 'lamp' },
	desk: { yaw: -15, pitch: 40, dist: 0.8, fov: 30, focus: 'desk' },
	socks: { yaw: 25, pitch: 50, dist: 1.0, fov: 30, focus: 'socks' },
}

/** Centre of interest for a focus; `head` is refined by the lab from the live bone position. */
const SEATED_POSES: ReadonlySet<PoseName> = new Set(['sit', 'stretch'])

export function focusPoint(
	focus: Orbit['focus'],
	headWorld: Vec3 | null,
	pose: PoseName,
): Vec3 {
	if (focus === 'sticker') return STICKER.center
	if (focus === 'lamp')
		return [LAMP.head[0], LAMP.head[1] - 0.12, LAMP.head[2] + 0.05]
	if (focus === 'socks')
		return [SOCKS.center[0], SOCKS.center[1] + 0.03, SOCKS.center[2]]
	if (focus === 'desk')
		return [
			KEYBOARD.center[0] + 0.15,
			KEYBOARD.center[1] + 0.02,
			KEYBOARD.center[2],
		]
	if (focus === 'head' && headWorld) return headWorld
	const [x, y, z] = CAT_SPOT.position
	// The sleeper lies along the desk from x = 0; a seated cat's chest is a
	// little above the spot; a standing one (rest, probes) stands on it.
	if (pose === 'sleep') return [0.25, y + 0.12, z - 0.26]
	return SEATED_POSES.has(pose) ? [x, y + 0.18, z] : [x, y + 0.31, z]
}

export function orbitCamera(
	params: LabParams,
	headWorld: Vec3 | null,
	pose: PoseName,
): CameraPose {
	const preset = CAM_PRESETS[params.cam === 'hero' ? 'front' : params.cam]
	const yaw = (params.yaw ?? preset.yaw) * DEG
	const pitch = (params.pitch ?? preset.pitch) * DEG
	const dist = params.dist ?? preset.dist
	const target = focusPoint(preset.focus, headWorld, pose)
	const position: Vec3 = [
		target[0] + Math.sin(yaw) * Math.cos(pitch) * dist,
		target[1] + Math.sin(pitch) * dist,
		target[2] + Math.cos(yaw) * Math.cos(pitch) * dist,
	]
	return { position, target, fov: params.fov ?? preset.fov }
}
