import {
	type BufferGeometry,
	Group,
	type Material,
	Mesh,
	PlaneGeometry,
} from 'three'
import { SCREEN } from '../../../config/room-layout'
import { ROOM_TONES } from '../../../config/tuning'
import { screenAspect, screenWidth } from '../../screen-quad'
import { createHoleMaterial, mixHex, PALETTE as P, paint } from '../materials'
import { PAINTS } from './build-room'
import { Kit } from './kit'

const SCREEN_PAINT = {
	top: paint(mixHex(P.ink2, P.orchid, 0.2), mixHex(P.ink2, P.blush, 0.1)),
	bottom: paint(
		mixHex(P.ink2, P.orchid, 0.07),
		mixHex(P.ink2, P.blush, 0.05),
	),
	bar: paint(
		mixHex(mixHex(P.ink2, P.orchid, 0.2), P.snow, 0.55),
		mixHex(P.ink2, P.blush, 0.22),
	),
	accent: paint(mixHex(P.rose, P.snow, 0.3), mixHex(P.ink2, P.blush, 0.28)),
}

/** Relative widths of the text bars on the fake screen (a page skeleton). */
const BARS: readonly (readonly [number, number, 'bar' | 'accent'])[] = [
	[0.12, 0.08, 'accent'],
	[0.2, 0.46, 'bar'],
	[0.3, 0.3, 'bar'],
	[0.46, 0.24, 'bar'],
	[0.54, 0.34, 'bar'],
	[0.62, 0.18, 'bar'],
	[0.78, 0.4, 'accent'],
]

export type Monitor = {
	group: Group
	/** Rebuilds the bezel and the screen for a viewport aspect. */
	resize(viewportAspect: number): void
	/** Switches between the DOM hole and the painted fake screen. */
	setFakeScreen(fake: boolean): void
	dispose(): void
}

/**
 * The monitor's aspect follows the viewport, so its geometry is rebuilt on
 * resize. The bezel is a box behind the screen plane; the screen is either a
 * hole for the page (full mode) or a painted stand-in (lite, posters, lab).
 */
export function createMonitor(
	roomMaterial: Material,
	viewportAspect: number,
	fakeScreen: boolean,
): Monitor {
	const group = new Group()
	const holeMaterial = createHoleMaterial()
	let bezel: Mesh | null = null
	let fake: Mesh | null = null
	let hole: Mesh | null = null
	let showFake = fakeScreen

	const dispose = (mesh: Mesh | null) => {
		if (!mesh) return
		group.remove(mesh)
		;(mesh.geometry as BufferGeometry).dispose()
	}

	const resize = (aspect: number) => {
		dispose(bezel)
		dispose(fake)
		dispose(hole)
		const w = screenWidth(aspect)
		const h = SCREEN.height
		const [cx, cy, cz] = SCREEN.center
		const b = SCREEN.bezel
		const bezelKit = new Kit()
		bezelKit.box(
			[cx, cy, cz - 0.0015 - SCREEN.depth / 2],
			[w + 2 * b, h + 2 * b, SCREEN.depth],
			PAINTS.bezel,
		)
		// A chin below the screen, like a modern flat panel.
		bezelKit.box(
			[cx, cy - h / 2 - b - 0.012, cz - 0.0015 - SCREEN.depth / 2],
			[w + 2 * b, 0.024, SCREEN.depth],
			PAINTS.bezel,
		)
		bezel = new Mesh(bezelKit.build(), roomMaterial)
		group.add(bezel)

		hole = new Mesh(new PlaneGeometry(w, h), holeMaterial)
		hole.position.set(cx, cy, cz)
		hole.renderOrder = -1
		group.add(hole)

		fake = new Mesh(buildFakeScreen(w, h), roomMaterial)
		group.add(fake)
		setFakeScreen(showFake)
	}

	const setFakeScreen = (value: boolean) => {
		showFake = value
		if (fake) fake.visible = value
		if (hole) hole.visible = !value
	}

	resize(screenAspect(viewportAspect))

	return {
		group,
		resize: (aspect) => resize(screenAspect(aspect)),
		setFakeScreen,
		dispose() {
			dispose(bezel)
			dispose(fake)
			dispose(hole)
			holeMaterial.dispose()
		},
	}
}

function buildFakeScreen(w: number, h: number): BufferGeometry {
	const [cx, cy, cz] = SCREEN.center
	const z = cz + 0.0005
	const kit = new Kit()
	kit.gradientQuad(
		[
			[cx - w / 2, cy + h / 2, z],
			[cx + w / 2, cy + h / 2, z],
			[cx + w / 2, cy - h / 2, z],
			[cx - w / 2, cy - h / 2, z],
		],
		[
			SCREEN_PAINT.top,
			SCREEN_PAINT.top,
			SCREEN_PAINT.bottom,
			SCREEN_PAINT.bottom,
		],
	)
	const left = cx - w / 2 + w * 0.08
	const barHeight = h * 0.045
	for (const [top, width, kind] of BARS) {
		const y0 = cy + h / 2 - h * top
		kit.quad(
			[
				[left, y0 - barHeight, z + 0.0004],
				[left + w * width, y0 - barHeight, z + 0.0004],
				[left + w * width, y0, z + 0.0004],
				[left, y0, z + 0.0004],
			],
			SCREEN_PAINT[kind],
			{ tone: ROOM_TONES.top },
		)
	}
	return kit.build()
}
