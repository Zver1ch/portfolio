import { AMBIENT, type AmbientGraph, createAmbientGraph } from './ambient'
import { getAudioContext, resumeAudio } from './audio-context'

/**
 * The page's ambient engine (plan §3.12): one graph on the shared context,
 * faded in and out, with the sparse events scheduled a little ahead.
 * `startAmbient` must follow an explicit opt-in and a user gesture; a
 * suspended context stays silent until `resumeAudio` succeeds.
 */

const LOOKAHEAD_SECONDS = 2.5
const SCHEDULE_EVERY_MS = 1000

let graph: AmbientGraph | null = null
let timer = 0
let mood = 0
let running = false

function schedule() {
	const audio = getAudioContext()
	if (!graph || !audio) return
	graph.schedule(audio.currentTime + LOOKAHEAD_SECONDS)
}

/** Starts (or resumes) the ambient; false when the browser keeps the context suspended. */
export async function startAmbient(): Promise<boolean> {
	const audio = getAudioContext()
	if (!audio) return false
	if (!(await resumeAudio(audio))) return false
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

/** Fades the ambient out; the graph stays for a quick return. */
export function stopAmbient() {
	if (!running) return
	running = false
	window.clearInterval(timer)
	graph?.fadeTo(0, AMBIENT.fadeSeconds)
}

/** 0 night … 1 dawn. */
export function setAmbientMood(next: number) {
	mood = next
	graph?.setMood(next)
}

export function isAmbientRunning(): boolean {
	return running
}

/** Test hook: drop the graph and the timer. */
export function resetAmbient() {
	window.clearInterval(timer)
	graph?.dispose()
	graph = null
	running = false
	mood = 0
}
