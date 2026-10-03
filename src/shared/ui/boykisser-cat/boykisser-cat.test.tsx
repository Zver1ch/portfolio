import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BoykisserCat, type BoykisserCatExpression } from './boykisser-cat'

const PARTS = [
	'body',
	'tail',
	'paw-left',
	'paw-right',
	'head',
	'ear-left',
	'ear-right',
	'eye-left',
	'eye-right',
	'pupil-left',
	'pupil-right',
	'blush',
	'mouth',
]

function part(container: HTMLElement, name: string) {
	const element = container.querySelector(`[data-part='${name}']`)
	if (!element) throw new Error(`missing part ${name}`)
	return element
}

describe('BoykisserCat', () => {
	it('renders an img with the default accessible name', () => {
		render(<BoykisserCat />)
		expect(
			screen.getByRole('img', { name: 'Кот-маскот' }),
		).toBeInTheDocument()
	})

	it('uses a custom title and forwards ref', () => {
		let node: SVGSVGElement | null = null
		render(
			<BoykisserCat
				title='Котик'
				ref={(element) => {
					node = element
				}}
			/>,
		)
		expect(screen.getByRole('img', { name: 'Котик' })).toBe(node)
	})

	it.each(['idle', 'happy', 'love', 'surprised', 'sleepy'] as const)(
		'renders every animatable part for %s',
		(expression) => {
			const { container } = render(
				<BoykisserCat expression={expression} />,
			)
			for (const name of PARTS) expect(part(container, name)).toBeTruthy()
		},
	)

	it.each<[BoykisserCatExpression, string, string]>([
		['idle', 'round', 'w'],
		['happy', 'arc', 'w'],
		['love', 'heart', 'w'],
		['surprised', 'dot', 'o'],
		['sleepy', 'closed', 'w'],
	])('%s shows %s eyes and %s mouth', (expression, eye, mouth) => {
		const { container } = render(<BoykisserCat expression={expression} />)
		for (const side of ['left', 'right']) {
			expect(
				part(container, `eye-${side}`).querySelector(
					`[data-shape='${eye}']`,
				),
			).not.toBeNull()
		}
		expect(
			part(container, 'mouth').querySelector(`[data-shape='${mouth}']`),
		).not.toBeNull()
	})

	it('draws a stronger blush for love', () => {
		const blushRx = (expression: BoykisserCatExpression) => {
			const { container, unmount } = render(
				<BoykisserCat expression={expression} />,
			)
			const rx = part(container, 'blush')
				.querySelector('ellipse')
				?.getAttribute('rx')
			unmount()
			return Number(rx)
		}
		expect(blushRx('love')).toBeGreaterThan(blushRx('idle'))
	})

	it('keeps pupils centered without look', () => {
		const { container } = render(<BoykisserCat />)
		expect(part(container, 'pupil-left')).not.toHaveAttribute('transform')
	})

	it('clamps look so pupils stay inside the eyes', () => {
		const translate = (look: { x: number; y: number }) => {
			const { container, unmount } = render(<BoykisserCat look={look} />)
			const value = part(container, 'pupil-left').getAttribute(
				'transform',
			)
			unmount()
			const [, x = '0', y = '0'] =
				/translate\((\S+) (\S+)\)/.exec(value ?? '') ?? []
			return { x: Number(x), y: Number(y) }
		}

		const right = translate({ x: 1, y: 0 })
		expect(right.x).toBeGreaterThan(0)
		expect(right.y).toBe(0)
		expect(translate({ x: 50, y: 0 })).toEqual(right)

		const diagonal = translate({ x: 10, y: 10 })
		expect(diagonal.x).toBeLessThan(right.x)
		expect(diagonal.y).toBeGreaterThan(0)

		expect(translate({ x: Number.NaN, y: -5 }).x).toBe(0)
	})

	it('enables the CSS idle loop only on request', () => {
		const { container, rerender } = render(<BoykisserCat />)
		const svg = container.querySelector('svg')
		if (!svg) throw new Error('missing svg')
		const plainClass = svg.getAttribute('class') ?? ''
		rerender(<BoykisserCat idle />)
		expect(svg.getAttribute('class') ?? '').not.toBe(plainClass)
	})
})
