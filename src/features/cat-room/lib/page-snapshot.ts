/**
 * A picture of a page section for the lite monitor (plan §3.4, the M4
 * fallback): the section's text, glyph by glyph exactly where the browser
 * laid it out, drawn into a 2D canvas with the same fonts, sizes and
 * colours. Every glyph is placed at its own measured position, so kerning,
 * letter-spacing and balancing need no support from the canvas engine. The
 * scene shows it on the screen's page column, so the painted page and the
 * real one coincide when the lite dive ends and the layer crossfades to
 * the DOM. Three-free; the scene wraps the canvas in a texture.
 */

/** One character where the browser put it, CSS px from the section's top-left corner. */
export type Glyph = { char: string; x: number }

/** One line of one text node: glyphs on a common baseline, in one style. */
export type TextRun = {
	glyphs: Glyph[]
	baseline: number
	/** A canvas font shorthand: style, weight, size, family. */
	font: string
	color: string
}

/** A filled box: the typing line's caret, a real element the page marks `[data-caret]`. */
export type Box = {
	x: number
	y: number
	width: number
	height: number
	color: string
}

export type PageImage = {
	width: number
	height: number
	background: string
	runs: TextRun[]
	boxes: Box[]
}

/** A character's measured box, relative to the section. */
export type GlyphBox = {
	char: string
	left: number
	top: number
	width: number
}

export type TextLine = { glyphs: Glyph[]; top: number }

const TRANSPARENT =
	/^(?:transparent|rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\))$/

/**
 * Groups the glyph boxes of one text node into lines: a new line starts
 * where a box's top leaves the current line's. Whitespace draws nothing and
 * is dropped; the rest keep their measured left.
 */
export function groupLines(boxes: readonly GlyphBox[]): TextLine[] {
	const lines: TextLine[] = []
	let current: TextLine | null = null
	for (const box of boxes) {
		if (current && Math.abs(box.top - current.top) > 1) current = null
		if (/\s/.test(box.char)) continue
		if (!current) {
			current = { glyphs: [], top: box.top }
			lines.push(current)
		}
		current.glyphs.push({ char: box.char, x: box.left })
	}
	return lines
}

/** CSS `text-transform` as the browser rendered it. */
export function transformText(text: string, transform: string): string {
	if (transform === 'uppercase') return text.toUpperCase()
	if (transform === 'lowercase') return text.toLowerCase()
	if (transform === 'capitalize')
		return text.replace(
			/(^|\s)(\S)/g,
			(_, gap, first) => gap + first.toUpperCase(),
		)
	return text
}

/** The transform for one grapheme, `capitalize` deciding by the word start it came from. */
export function transformGrapheme(
	grapheme: string,
	transform: string,
	wordStart: boolean,
): string {
	if (transform === 'capitalize')
		return wordStart ? grapheme.toUpperCase() : grapheme
	return transformText(grapheme, transform)
}

/** The text's graphemes with their UTF-16 offsets: a surrogate pair or a mark stays with its base. */
export function* graphemes(
	text: string,
): Generator<{ segment: string; index: number }> {
	if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
		const segmenter = new Intl.Segmenter(undefined, {
			granularity: 'grapheme',
		})
		for (const { segment, index } of segmenter.segment(text))
			yield { segment, index }
		return
	}
	let index = 0
	for (const segment of text) {
		yield { segment, index }
		index += segment.length
	}
}

/** The canvas font shorthand for a computed style. */
export function fontOf(style: {
	fontStyle: string
	fontWeight: string
	fontSize: string
	fontFamily: string
}): string {
	return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
}

/**
 * Reads the text of `root` with every glyph's position (the browser's own
 * line breaks, balancing, kerning and transforms included) into a picture
 * of `size`, the layer's box: the section sits at its top-left when it is
 * stuck there, so the picture lines up with the real page.
 */
export function measurePage(
	root: HTMLElement,
	size: { width: number; height: number },
): PageImage {
	const origin = root.getBoundingClientRect()
	const measurer = document.createElement('canvas').getContext('2d')
	const runs: TextRun[] = []
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
	const range = document.createRange()
	// No layout engine (jsdom): a blank page of the right size.
	const measurable = typeof range.getClientRects === 'function'
	while (measurable && walker.nextNode()) {
		const node = walker.currentNode as Text
		const parent = node.parentElement
		if (!parent || !node.data.trim()) continue
		const style = getComputedStyle(parent)
		if (style.visibility === 'hidden') continue
		const boxes: GlyphBox[] = []
		let wordStart = true
		for (const { segment, index } of graphemes(node.data)) {
			if (/\s/.test(segment)) {
				wordStart = true
				continue
			}
			const char = transformGrapheme(
				segment,
				style.textTransform,
				wordStart,
			)
			wordStart = false
			range.setStart(node, index)
			range.setEnd(node, index + segment.length)
			const rect = range.getClientRects()[0]
			if (!rect || rect.width === 0) continue
			boxes.push({
				char,
				left: rect.left - origin.left,
				top: rect.top - origin.top,
				width: rect.width,
			})
		}
		if (boxes.length === 0) continue
		const font = fontOf(style)
		// The glyph boxes are the font's content area: its ascent above the baseline.
		let ascent = Number.parseFloat(style.fontSize) * 0.8
		if (measurer) {
			measurer.font = font
			const metrics = measurer.measureText('H')
			if (metrics.fontBoundingBoxAscent > 0)
				ascent = metrics.fontBoundingBoxAscent
		}
		for (const line of groupLines(boxes))
			runs.push({
				glyphs: line.glyphs,
				baseline: line.top + ascent,
				font,
				color: style.color,
			})
	}
	const boxes: Box[] = []
	if (measurable)
		for (const element of root.querySelectorAll('[data-caret]')) {
			const style = getComputedStyle(element)
			if (style.visibility === 'hidden' || style.display === 'none')
				continue
			const rect = element.getBoundingClientRect()
			if (rect.width === 0 || rect.height === 0) continue
			boxes.push({
				x: rect.left - origin.left,
				y: rect.top - origin.top,
				width: rect.width,
				height: rect.height,
				color: style.backgroundColor,
			})
		}
	let background = getComputedStyle(root).backgroundColor
	if (!background || TRANSPARENT.test(background))
		background = getComputedStyle(document.body).backgroundColor
	return { width: size.width, height: size.height, background, runs, boxes }
}

/** Draws the picture at `dpr` device pixels per CSS px; false when the canvas has no 2D context. */
export function drawPage(
	canvas: HTMLCanvasElement,
	image: PageImage,
	dpr: number,
): boolean {
	const ctx = canvas.getContext('2d')
	if (!ctx) return false
	canvas.width = Math.max(1, Math.round(image.width * dpr))
	canvas.height = Math.max(1, Math.round(image.height * dpr))
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	ctx.fillStyle = image.background
	ctx.fillRect(0, 0, image.width, image.height)
	ctx.textBaseline = 'alphabetic'
	ctx.textAlign = 'left'
	for (const run of image.runs) {
		ctx.font = run.font
		ctx.fillStyle = run.color
		for (const glyph of run.glyphs)
			ctx.fillText(glyph.char, glyph.x, run.baseline)
	}
	for (const box of image.boxes) {
		ctx.fillStyle = box.color
		ctx.fillRect(box.x, box.y, box.width, box.height)
	}
	return true
}

/**
 * A fresh canvas with the section painted, or null where it cannot be
 * drawn (no 2D context). The device pixel ratio is capped so the larger
 * side stays within what every mobile GPU takes as a texture.
 */
export function paintPage(
	root: HTMLElement,
	size: { width: number; height: number },
	dpr: number,
): HTMLCanvasElement | null {
	const canvas = document.createElement('canvas')
	const cap = MAX_TEXTURE_SIDE / Math.max(size.width, size.height, 1)
	const image = measurePage(root, size)
	return drawPage(canvas, image, Math.min(dpr, cap)) ? canvas : null
}

const MAX_TEXTURE_SIDE = 2048
