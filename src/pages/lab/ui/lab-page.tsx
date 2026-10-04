'use client'

import { useEffect, useRef, useState } from 'react'
import type { PoseName } from '@/features/cat-room/config/poses'
import {
	cameraAt,
	dawnFactor,
	liteHeroCamera,
} from '@/features/cat-room/lib/camera-path'
import type { CatActor } from '@/features/cat-room/lib/scene/cat/cat'
import {
	createRoomScene,
	type RoomScene,
} from '@/features/cat-room/lib/scene/create-room-scene'
import { advance } from '@/features/cat-room/lib/scene-time'
import type { DirectorFrame } from '@/features/cat-room/model/frame'
import type { Vec3 } from '@/shared/lib/math/vec3'
import {
	type LabParams,
	modelUrl,
	orbitCamera,
	parseLabParams,
} from '../lib/lab-params'

type LabWindow = Window & {
	__lab?: {
		ready: Promise<void>
		params: LabParams
		scene: RoomScene | null
		setOverrides(overrides: Record<string, Vec3>): void
	}
}

const PROBE_AXES = ['x', 'y', 'z'] as const
const PROBE_CAMS = ['front', 'side'] as const
const SETTLE_DT = 1 / 60
const SETTLE_MAX_STEPS = 240

function basePose(params: LabParams): PoseName {
	if (params.pose) return params.pose
	if (params.view === 'finale') return 'sleep'
	if (params.view === 'probe') return 'rest'
	if (params.view === 'overlay') return 'peek'
	return 'lounge'
}

function frameFor(
	params: LabParams,
	time: number,
	width: number,
	height: number,
	headWorld: Vec3 | null,
): DirectorFrame {
	const aspect = width / height
	const view = params.view
	let camera = orbitCamera(params, headWorld, basePose(params))
	let dawn = params.dawn ?? 0
	let dive = 0
	if (view === 'hero' || view === 'dive') {
		camera = params.lite
			? liteHeroCamera(aspect)
			: cameraAt('dive', params.p, aspect)
		dive = view === 'dive' ? params.p : 0
	} else if (view === 'finale') {
		camera = cameraAt('finale', params.p, aspect)
		dawn = params.dawn ?? dawnFactor(params.p)
	} else if (params.cam === 'hero') {
		camera = cameraAt('dive', 0, aspect)
	}
	return {
		phase: view === 'finale' ? 'finale' : 'room',
		camera,
		time,
		dawn,
		dive,
		viewport: { width, height },
		pointer: null,
		pose: basePose(params),
		lookAt:
			params.look === 'none'
				? [camera.target[0], camera.target[1], camera.target[2] + 4]
				: null,
		stepped: params.stepped,
	}
}

export function LabPage() {
	const stageRef = useRef<HTMLDivElement>(null)
	const [params, setParams] = useState<LabParams | null>(null)
	const [status, setStatus] = useState('loading…')
	const [cat, setCat] = useState<CatActor | null>(null)
	const [overrides, setOverrides] = useState<Record<string, Vec3>>({})
	const [copied, setCopied] = useState('')

	useEffect(() => {
		setParams(parseLabParams(window.location.search))
	}, [])

	useEffect(() => {
		const stage = stageRef.current
		if (!params || !stage) return
		let cancelled = false
		let raf = 0
		let scene: RoomScene | null = null
		let resolveReady = () => {}
		const ready = new Promise<void>((resolve) => {
			resolveReady = resolve
		})
		const labWindow = window as LabWindow
		const lab = {
			ready,
			params,
			scene: null as RoomScene | null,
			setOverrides: (next: Record<string, Vec3>) => {
				scene?.cat?.setOverrides(next)
				setOverrides(next)
			},
		}
		labWindow.__lab = lab
		const canvas = document.createElement('canvas')
		canvas.style.cssText = 'display:block;width:100%;height:100%'
		stage.append(canvas)
		const width = stage.clientWidth
		const height = stage.clientHeight
		const dpr = Math.min(window.devicePixelRatio || 1, 1.75)

		const run = async () => {
			const created = await createRoomScene({
				canvas,
				width,
				height,
				dpr,
				shading: params.shading,
				fakeScreen: true,
				modelUrl: modelUrl(params.model),
				cat: !params.nocat,
				hairSprings: params.hair,
				onProgress: (fraction) =>
					setStatus(`loading ${Math.round(fraction * 100)}%`),
			})
			if (cancelled) {
				created.dispose()
				return
			}
			scene = created
			lab.scene = created
			setCat(created.cat)
			if (params.bone && params.view !== 'probe')
				created.cat?.setOverrides({
					[params.bone]: axisRotation(params.axis, params.deg),
				})

			const headWorld = (): Vec3 | null => {
				const head = created.cat?.bonePosition('head')
				return head ? [head.x, head.y, head.z] : null
			}
			const frameAt = (time: number) =>
				frameFor(params, time, width, height, headWorld())

			const probePanes = (time: number) => {
				const columns = PROBE_AXES.length + 1
				const rows = PROBE_CAMS.length
				const paneWidth = Math.floor(width / columns)
				const paneHeight = Math.floor(height / rows)
				const panes = []
				for (const [row, cam] of PROBE_CAMS.entries()) {
					for (let column = 0; column < columns; column++) {
						const axis =
							column === 0 ? null : PROBE_AXES[column - 1]
						const paneParams: LabParams = {
							...params,
							cam,
							view: 'turntable',
							pose: 'rest',
						}
						const frame = frameFor(
							paneParams,
							time,
							paneWidth,
							paneHeight,
							headWorld(),
						)
						panes.push({
							frame,
							rect: {
								x: column * paneWidth,
								y: row * paneHeight,
								width: paneWidth,
								height: paneHeight,
							},
							overrides:
								axis && params.bone
									? {
											[params.bone]: axisRotation(
												axis,
												params.deg,
											),
										}
									: {},
						})
					}
				}
				return panes
			}

			const present = (time: number, dt: number) => {
				if (params.view === 'probe') {
					const panes = probePanes(time)
					// One pane at a time: overrides change between panes.
					created.renderPanes(
						panes.map((pane) => ({
							frame: pane.frame,
							rect: pane.rect,
						})),
						dt,
					)
					return
				}
				created.render(frameAt(time), dt)
			}

			if (params.view === 'probe') {
				// Probe panes need their own overrides per pane; drive them by hand.
				const panes = probePanes(params.t ?? 1)
				created.renderer.setScissorTest(false)
				created.renderer.clear()
				for (const [index, pane] of panes.entries()) {
					created.cat?.setOverrides(pane.overrides)
					for (let k = 0; k < 30; k++)
						created.update(pane.frame, SETTLE_DT)
					// Panes accumulate: only the first one clears the canvas.
					created.renderPanes(
						[{ frame: pane.frame, rect: pane.rect }],
						SETTLE_DT,
						index === 0,
					)
				}
				setStatus('')
				requestAnimationFrame(() => resolveReady())
				return
			}

			if (params.t !== null) {
				const steps = Math.min(
					Math.ceil(params.t / SETTLE_DT),
					SETTLE_MAX_STEPS,
				)
				const start = Math.max(0, params.t - steps * SETTLE_DT)
				for (let k = 0; k < steps; k++)
					created.update(frameAt(start + k * SETTLE_DT), SETTLE_DT)
				if (params.meow) created.trigger({ type: 'pet' })
				if (params.meow)
					for (let k = 0; k < 18; k++)
						created.update(
							frameAt(params.t + k * SETTLE_DT),
							SETTLE_DT,
						)
				created.render(
					frameAt(params.t + (params.meow ? 0.3 : 0)),
					SETTLE_DT,
				)
				setStatus('')
				requestAnimationFrame(() => resolveReady())
				return
			}

			const clock = { current: 0 }
			let last = performance.now()
			let first = true
			const loop = (now: number) => {
				const dt = Math.min((now - last) / 1000, 0.1)
				last = now
				const time = advance(clock, dt)
				present(time, dt)
				if (first) {
					first = false
					setStatus('')
					requestAnimationFrame(() => resolveReady())
				}
				raf = requestAnimationFrame(loop)
			}
			raf = requestAnimationFrame(loop)
			if (params.meow)
				setTimeout(() => created.trigger({ type: 'pet' }), 1500)
		}
		run().catch((error: unknown) => {
			console.error(error)
			setStatus(
				`failed: ${error instanceof Error ? error.message : String(error)}`,
			)
		})

		return () => {
			cancelled = true
			cancelAnimationFrame(raf)
			scene?.dispose()
			canvas.remove()
			setCat(null)
		}
	}, [params])

	useEffect(() => {
		if (!cat || !params) return
		// The probe sheet draws its own panes with per-pane overrides.
		if (params.view === 'probe') return
		cat.setOverrides(overrides)
		const scene = (window as LabWindow).__lab?.scene
		if (scene && params.t !== null) scene.draw()
	}, [cat, overrides, params])

	const posable = cat
		? cat.rig.keys.filter(
				(key) => !/^popka|^shoulder_|_end$|^_rootjoint$/.test(key),
			)
		: []

	const copyPose = async () => {
		const bones = Object.fromEntries(
			Object.entries(overrides)
				.filter(([, rot]) => rot.some((v) => v !== 0))
				.map(([key, rot]) => [key, { rot }]),
		)
		const text = JSON.stringify({ bones }, null, '\t')
		try {
			await navigator.clipboard.writeText(text)
			setCopied(text)
		} catch {
			setCopied(text)
		}
	}

	return (
		<main className='fixed inset-0 flex bg-ink text-snow'>
			<div ref={stageRef} className='relative h-full flex-1' />
			{params?.view === 'probe' ? (
				<ProbeLabels bone={params.bone} deg={params.deg} />
			) : null}
			{status ? (
				<p className='pointer-events-none absolute top-3 left-3 rounded bg-ink/80 px-2 py-1 font-mono text-xs text-lavender'>
					{status}
				</p>
			) : null}
			{params?.ui && cat ? (
				<aside className='absolute top-0 right-0 bottom-0 w-80 overflow-y-auto bg-ink-2/95 p-3 font-mono text-[11px]'>
					<button
						type='button'
						onClick={copyPose}
						className='mb-2 w-full rounded bg-rose px-2 py-1 font-semibold text-ink'
					>
						Copy pose
					</button>
					{copied ? (
						<textarea
							readOnly
							value={copied}
							className='mb-2 h-24 w-full bg-ink p-1 text-lavender'
						/>
					) : null}
					{posable.map((key) => (
						<div key={key} className='mb-1 flex items-center gap-1'>
							<span className='w-20 shrink-0 truncate text-lavender'>
								{key}
							</span>
							{([0, 1, 2] as const).map((axis) => (
								<input
									key={axis}
									type='range'
									min={-120}
									max={120}
									step={1}
									value={overrides[key]?.[axis] ?? 0}
									onChange={(event) => {
										const next: Vec3 = [
											...(overrides[key] ?? [0, 0, 0]),
										] as unknown as Vec3
										const values = [...next]
										values[axis] = Number(
											event.target.value,
										)
										setOverrides({
											...overrides,
											[key]: values as unknown as Vec3,
										})
									}}
									className='w-16'
									aria-label={`${key} ${'xyz'[axis]}`}
								/>
							))}
						</div>
					))}
				</aside>
			) : null}
		</main>
	)
}

function axisRotation(axis: 'x' | 'y' | 'z', deg: number): Vec3 {
	return axis === 'x' ? [deg, 0, 0] : axis === 'y' ? [0, deg, 0] : [0, 0, deg]
}

function ProbeLabels({ bone, deg }: { bone: string | null; deg: number }) {
	const columns = ['rest', ...PROBE_AXES.map((axis) => `${axis} +${deg}°`)]
	return (
		<div className='pointer-events-none absolute inset-0 grid grid-cols-4 grid-rows-2 font-mono text-xs text-lavender'>
			{PROBE_CAMS.flatMap((cam) =>
				columns.map((label) => (
					<p
						key={`${cam}-${label}`}
						className='m-2 self-start justify-self-start rounded bg-ink/80 px-2 py-1'
					>
						{bone ?? '?'} · {label} · {cam}
					</p>
				)),
			)}
		</div>
	)
}
