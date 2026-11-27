type WindowWithWebkitAudio = Window & {
	webkitAudioContext?: typeof AudioContext
}

let context: AudioContext | undefined

/**
 * The page's one AudioContext (plan §3.12), created on first use. Call from
 * a user gesture where possible: browsers start a context suspended
 * otherwise, and `resumeAudio` can only lift that after an activation.
 */
export function getAudioContext(): AudioContext | undefined {
	if (typeof window === 'undefined') return undefined
	if (!context) {
		const Ctor =
			window.AudioContext ??
			(window as WindowWithWebkitAudio).webkitAudioContext
		if (!Ctor) return undefined
		context = new Ctor()
	}
	return context
}

/** The context if one exists already; never creates one. */
export function peekAudioContext(): AudioContext | undefined {
	return context
}

/** Resumes a suspended context; true when it runs afterwards. */
export async function resumeAudio(
	audio: AudioContext | undefined = getAudioContext(),
): Promise<boolean> {
	if (!audio) return false
	if (audio.state === 'suspended') {
		try {
			await audio.resume()
		} catch {
			return false
		}
	}
	return audio.state === 'running'
}

/** Test hook. */
export function resetAudioContext() {
	context = undefined
}
