'use client'

import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback: ReactNode; onError: () => void }

/** A room that fails to render must degrade to the static page, not crash it. */
export class SceneErrorBoundary extends Component<Props, { failed: boolean }> {
	state = { failed: false }

	static getDerivedStateFromError() {
		return { failed: true }
	}

	componentDidCatch() {
		this.props.onError()
	}

	render() {
		return this.state.failed ? this.props.fallback : this.props.children
	}
}
