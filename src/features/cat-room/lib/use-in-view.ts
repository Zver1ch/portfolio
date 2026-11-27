import { type RefObject, useEffect, useState } from 'react'

export type InViewState = {
	inView: boolean
	/** Latches to true the first time the element is seen. */
	entered: boolean
}

export function useInView(
	ref: RefObject<Element | null>,
	rootMargin = '120px',
): InViewState {
	const [state, setState] = useState<InViewState>({
		inView: false,
		entered: false,
	})

	useEffect(() => {
		const element = ref.current
		if (!element) return
		if (typeof IntersectionObserver === 'undefined') {
			setState({ inView: true, entered: true })
			return
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				const visible = entry?.isIntersecting ?? false
				setState((prev) =>
					prev.inView === visible && (prev.entered || !visible)
						? prev
						: { inView: visible, entered: prev.entered || visible },
				)
			},
			{ rootMargin },
		)
		observer.observe(element)
		return () => observer.disconnect()
	}, [ref, rootMargin])

	return state
}
