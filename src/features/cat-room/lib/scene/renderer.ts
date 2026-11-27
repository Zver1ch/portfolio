import { NoToneMapping, SRGBColorSpace, WebGLRenderer } from 'three'

export type RendererSize = { width: number; height: number; dpr: number }

/**
 * Palette hex colours render exactly: no tone mapping, sRGB output, a
 * transparent premultiplied canvas the page shows through.
 */
export function createRenderer(
	canvas: HTMLCanvasElement,
	size: RendererSize,
): WebGLRenderer {
	const renderer = new WebGLRenderer({
		canvas,
		alpha: true,
		antialias: true,
		powerPreference: 'high-performance',
		stencil: false,
	})
	renderer.setClearColor(0x000000, 0)
	renderer.toneMapping = NoToneMapping
	renderer.outputColorSpace = SRGBColorSpace
	resizeRenderer(renderer, size)
	return renderer
}

export function resizeRenderer(
	renderer: WebGLRenderer,
	{ width, height, dpr }: RendererSize,
) {
	renderer.setPixelRatio(dpr)
	renderer.setSize(width, height, false)
}
