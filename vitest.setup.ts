import '@testing-library/jest-dom/vitest'

// jsdom has no matchMedia: report "no match" so scroll animations never start in tests
if (typeof window !== 'undefined' && !window.matchMedia) {
	window.matchMedia = (query: string) =>
		({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		}) as MediaQueryList
}

// jsdom has no canvas: a quiet null context instead of a "not implemented"
// error on every WebGL probe, which is what a browser without WebGL returns.
if (typeof HTMLCanvasElement !== 'undefined') {
	HTMLCanvasElement.prototype.getContext = (() =>
		null) as typeof HTMLCanvasElement.prototype.getContext
}
