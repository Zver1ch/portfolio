import { AMBIENT, type AmbientGraph, createAmbientGraph } from './ambient'
import { getAudioContext, resumeAudio } from './audio-context'

/**
 * The page's ambient engine (plan §3.12): one graph on the shared context,
 * faded in and out, with the chords, phrases and birds scheduled a little
 * ahead. `startAmbient` must follow an explicit opt-in and a user gesture; a
 * suspended context stays silent until `resumeAudio` succeeds. A stop fades
 * the master out and then releases the graph, so a muted page costs no
 * audio processing; the context itself is never closed or suspended, the
 * meow and the effects share it.
 */

const LOOKAHEAD_SECONDS = 2.5
const SCHEDULE_EVERY_MS = 1000
/** Slack after the fade-out before a stopped graph is released. */
const RELEASE_SLACK_MS = 100
/** How often a lagging context may push the release back before it is forced. */
const RELEASE_RETRIES = 10

let graph: AmbientGraph | null = null
let timer = 0
let release = 0
let mood = 0
let running = false
let stops = 0
let fadeEndsAt = 0
let retries = 0

function schedule() {
	const audio = getAudioContext()
	if (!graph || !audio) return
	graph.schedule(audio.currentTime + LOOKAHEAD_SECONDS)
}

function releaseGraph() {
	graph?.dispose()
	graph = null
}

/**
 * The fade runs on context time and the timer on wall time: on a lagging
 * device the timer can fire while the master is still audible, and stopping
 * the sources then would click, so the release waits for the context.
 */
function onRelease() {
	const audio = getAudioContext()
	const remaining = fadeEndsAt - (audio?.currentTime ?? fadeEndsAt)
	if (
		audio?.state === 'running' &&
		remaining > 0 &&
		retries < RELEASE_RETRIES
	) {
		retries += 1
		release = window.setTimeout(
			onRelease,
			remaining * 1000 + RELEASE_SLACK_MS,
		)
		return
	}
	releaseGraph()
}

/** Starts (or resumes) the ambient; false when the browser keeps the context suspended. */
export async function startAmbient(): Promise<boolean> {
	const audio = getAudioContext()
	if (!audio) return false
	const before = stops
	if (!(await resumeAudio(audio))) return false
	// A stop that came while the context was resuming wins.
	if (stops !== before) return false
	window.clearTimeout(release)
	if (!graph) {
		graph = createAmbientGraph(audio, audio.destination)
		graph.setMood(mood)
	}
	if (!running) {
		running = true
		schedule()
		timer = window.setInterval(schedule, SCHEDULE_EVERY_MS)
	}
	graph.fadeTo(AMBIENT.master, AMBIENT.fadeSeconds)
	return true
}

/** Fades the ambient out, then releases the graph once the fade is over. */
export function stopAmbient() {
	stops += 1
	if (!running) return
	running = false
	window.clearInterval(timer)
	graph?.fadeTo(0, AMBIENT.fadeSeconds)
	const audio = getAudioContext()
	fadeEndsAt = (audio?.currentTime ?? 0) + AMBIENT.fadeSeconds
	retries = 0
	release = window.setTimeout(
		onRelease,
		AMBIENT.fadeSeconds * 1000 + RELEASE_SLACK_MS,
	)
}

/** 0 night … 1 dawn. */
export function setAmbientMood(next: number) {
	mood = next
	graph?.setMood(next)
}

export function isAmbientRunning(): boolean {
	return running
}

/** Test hook: drop the graph and the timers. */
export function resetAmbient() {
	window.clearInterval(timer)
	window.clearTimeout(release)
	releaseGraph()
	running = false
	mood = 0
}
