import {
	type BufferGeometry,
	CanvasTexture,
	Group,
	type Material,
	Mesh,
	MeshBasicMaterial,
	PlaneGeometry,
	SRGBColorSpace,
} from 'three'
import { SCREEN } from '../../../config/room-layout'
import { ROOM_TONES } from '../../../config/tuning'
import type { Track } from '../../camera-path'
import { columnWidth, screenWidth } from '../../screen-quad'
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
	/** The page's own background around the painted page column: the site's ink, lit by itself at dawn too. */
	page: paint(P.ink, P.ink),
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
	/**
	 * Lite mode (plan §3.4): a picture of the page section a track lands
	 * on, shown on the screen's page column instead of the bars; null goes
	 * back to the bars.
	 */
	setPage(track: Track, image: HTMLCanvasElement | null): void
	/** Which track's page the fake screen shows. */
	showPage(track: Track): void
	dispose(): void
}

/**
 * The monitor's aspect follows the viewport, so its geometry is rebuilt on
 * resize. The bezel is a box behind the screen plane; the screen is either a
 * hole for the page (full mode) or a painted stand-in (lite, posters, lab):
 * text bars, or the page itself painted on a centred column in the
 * viewport's aspect over the page's ink, which is merged into the bezel's
 * mesh so the stand-in costs the same two draw calls either way.
 */
export function createMonitor(
	roomMaterial: Material,
	viewportAspect: number,
	fakeScreen: boolean,
): Monitor {
	const group = new Group()
	const holeMaterial = createHoleMaterial()
	const pageMaterial = new MeshBasicMaterial({ toneMapped: false })
	const pages: Record<Track, CanvasTexture | null> = {
		dive: null,
		finale: null,
	}
	let bezel: Mesh | null = null
	let fake: Mesh | null = null
	let hole: Mesh | null = null
	let column: Mesh | null = null
	let showFake = fakeScreen
	let shownPage: Track = 'dive'

	const dispose = (mesh: Mesh | null) => {
		if (!mesh) return
		group.remove(mesh)
		;(mesh.geometry as BufferGeometry).dispose()
	}

	// The viewport's own aspect: the screen clamps it, the page column keeps it.
	const resize = (aspect: number) => {
		dispose(bezel)
		dispose(fake)
		dispose(hole)
		dispose(column)
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
		// The page's background behind the painted page column: just behind
		// the screen plane, so in full mode the depth-writing hole hides it.
		const face = cz - 0.0002
		bezelKit.quad(
			[
				[cx - w / 2, cy + h / 2, face],
				[cx + w / 2, cy + h / 2, face],
				[cx + w / 2, cy - h / 2, face],
				[cx - w / 2, cy - h / 2, face],
			],
			SCREEN_PAINT.page,
			{ tone: 1 },
		)
		bezel = new Mesh(bezelKit.build(), roomMaterial)
		group.add(bezel)

		hole = new Mesh(new PlaneGeometry(w, h), holeMaterial)
		hole.position.set(cx, cy, cz)
		hole.renderOrder = -1
		group.add(hole)

		fake = new Mesh(buildFakeScreen(w, h), roomMaterial)
		group.add(fake)

		column = new Mesh(
			new PlaneGeometry(columnWidth(aspect), h),
			pageMaterial,
		)
		column.position.set(cx, cy, cz + 0.0005)
		group.add(column)
		show()
	}

	const show = () => {
		const page = showFake ? pages[shownPage] : null
		if (page !== pageMaterial.map) {
			pageMaterial.map = page
			pageMaterial.needsUpdate = true
		}
		if (column) column.visible = page !== null
		if (fake) fake.visible = showFake && page === null
		if (hole) hole.visible = !showFake
	}

	resize(viewportAspect)

	return {
		group,
		resize,
		setFakeScreen(value) {
			showFake = value
			show()
		},
		setPage(track, image) {
			pages[track]?.dispose()
			let texture: CanvasTexture | null = null
			if (image) {
				texture = new CanvasTexture(image)
				texture.colorSpace = SRGBColorSpace
				texture.anisotropy = 4
			}
			pages[track] = texture
			show()
		},
		showPage(track) {
			if (shownPage === track) return
			shownPage = track
			show()
		},
		dispose() {
			dispose(bezel)
			dispose(fake)
			dispose(hole)
			dispose(column)
			holeMaterial.dispose()
			pageMaterial.dispose()
			for (const track of ['dive', 'finale'] as const) {
				pages[track]?.dispose()
				pages[track] = null
			}
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
