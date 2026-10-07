import { describe, expect, it } from 'vitest'
import {
	drawPage,
	fontOf,
	type GlyphBox,
	graphemes,
	groupLines,
	measurePage,
	transformGrapheme,
	transformText,
} from './page-snapshot'

const box = (char: string, left: number, top: number): GlyphBox => ({
	char,
	left,
	top,
	width: 10,
})

describe('groupLines', () => {
	it('splits glyph boxes into lines where the top moves, each glyph at its own left', () => {
		const boxes = [
			...'I build '.split('').map((c, i) => box(c, 16 + i * 10, 0)),
			...' layouts.'.split('').map((c, i) => box(c, 16 + i * 10, 34)),
		]
		const lines = groupLines(boxes)
		expect(lines).toHaveLength(2)
		expect(lines[0]?.top).toBe(0)
		expect(lines[0]?.glyphs.map((g) => g.char).join('')).toBe('Ibuild')
		expect(lines[0]?.glyphs.map((g) => g.x)).toEqual([
			16, 36, 46, 56, 66, 76,
		])
		expect(lines[1]?.top).toBe(34)
		expect(lines[1]?.glyphs[0]).toEqual({ char: 'l', x: 26 })
	})

	it('tolerates sub-pixel jitter within a line and drops blank lines', () => {
		expect(
			groupLines([box('a', 0, 10), box('b', 10, 10.6), box(' ', 20, 50)]),
		).toEqual([
			{
				glyphs: [
					{ char: 'a', x: 0 },
					{ char: 'b', x: 10 },
				],
				top: 10,
			},
		])
	})
})

describe('transformText', () => {
	it('applies the CSS transforms the browser rendered', () => {
		expect(transformText('The cat', 'uppercase')).toBe('THE CAT')
		expect(transformText('The Cat', 'lowercase')).toBe('the cat')
		expect(transformText('the cat sits', 'capitalize')).toBe('The Cat Sits')
		expect(transformText('As is', 'none')).toBe('As is')
	})
})

describe('transformGrapheme', () => {
	it('capitalizes word starts only and transforms the rest like text', () => {
		expect(transformGrapheme('t', 'capitalize', true)).toBe('T')
		expect(transformGrapheme('h', 'capitalize', false)).toBe('h')
		expect(transformGrapheme('h', 'uppercase', false)).toBe('H')
		expect(transformGrapheme('H', 'lowercase', true)).toBe('h')
		expect(transformGrapheme('H', 'none', true)).toBe('H')
	})
})

describe('graphemes', () => {
	it('keeps a combining mark and a surrogate pair whole, with UTF-16 offsets', () => {
		expect([...graphemes('áb😺c')]).toEqual([
			{ segment: 'á', index: 0 },
			{ segment: 'b', index: 2 },
			{ segment: '😺', index: 3 },
			{ segment: 'c', index: 5 },
		])
	})
})

describe('fontOf', () => {
	it('builds the canvas shorthand', () => {
		expect(
			fontOf({
				fontStyle: 'normal',
				fontWeight: '600',
				fontSize: '36px',
				fontFamily: 'Unbounded, "Unbounded Fallback"',
			}),
		).toBe('normal 600 36px Unbounded, "Unbounded Fallback"')
	})
})

describe('measurePage', () => {
	it('reads the section box and falls back to the body background', () => {
		const root = document.createElement('div')
		root.innerHTML = 'I build layouts.<span data-caret></span>'
		document.body.append(root)
		try {
			const image = measurePage(root, { width: 390, height: 844 })
			expect(image.width).toBe(390)
			expect(image.height).toBe(844)
			expect(typeof image.background).toBe('string')
			// jsdom lays nothing out: no glyph boxes, no runs, no caret.
			expect(image.runs).toEqual([])
			expect(image.boxes).toEqual([])
		} finally {
			root.remove()
		}
	})
})

describe('drawPage', () => {
	it('reports when the canvas has no 2D context', () => {
		const canvas = document.createElement('canvas')
		canvas.getContext = () => null
		expect(
			drawPage(
				canvas,
				{
					width: 10,
					height: 10,
					background: '#000',
					runs: [],
					boxes: [],
				},
				1,
			),
		).toBe(false)
	})

	it('sizes the canvas in device pixels and draws every glyph where it was measured', () => {
		const calls: string[] = []
		const ctx = {
			setTransform: (...args: number[]) =>
				calls.push(`transform ${args}`),
			fillRect: (...args: number[]) => calls.push(`rect ${args}`),
			fillText: (text: string, x: number, y: number) =>
				calls.push(`text ${text} ${x} ${y}`),
			fillStyle: '',
			font: '',
			textBaseline: '',
			textAlign: '',
		}
		const canvas = document.createElement('canvas')
		canvas.getContext = (() =>
			ctx) as unknown as HTMLCanvasElement['getContext']
		const drawn = drawPage(
			canvas,
			{
				width: 390,
				height: 844,
				background: 'rgb(18, 13, 22)',
				runs: [
					{
						glyphs: [
							{ char: 'I', x: 16 },
							{ char: 'B', x: 29.5 },
						],
						baseline: 30,
						font: '600 36px Unbounded',
						color: 'rgb(244, 244, 248)',
					},
				],
				boxes: [
					{
						x: 300,
						y: 700,
						width: 4,
						height: 12,
						color: 'rgb(218, 133, 175)',
					},
				],
			},
			1.5,
		)
		expect(drawn).toBe(true)
		expect(canvas.width).toBe(585)
		expect(canvas.height).toBe(1266)
		expect(calls).toEqual([
			'transform 1.5,0,0,1.5,0,0',
			'rect 0,0,390,844',
			'text I 16 30',
			'text B 29.5 30',
			'rect 300,700,4,12',
		])
		expect(ctx.font).toBe('600 36px Unbounded')
		expect(ctx.fillStyle).toBe('rgb(218, 133, 175)')
	})
})
